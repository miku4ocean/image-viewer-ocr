import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { LaunchedApp, launchApp, closeApp, loadFixture } from './test-utils';

// ============================================================================
// 完整操作流程驗收：啟動 → 開圖 → 調濾鏡 → 去背 → OCR(mock) → 匯出/儲存
// 全程用真實 UI 互動（滑鼠拖曳/點擊/勾選），不是直接呼叫內部函式；
// 全程監看 console error，並在最後統計步驟數與 error 數。
//
// 匯出/儲存這步在 Electron 環境會走 <a download> → session 'will-download'
// 傳統下載路徑（app.js saveImage()，isElectron===true 分支）。因為
// electron-main.js 沒有註冊 will-download handler，預設行為未知是否會跳出
// 系統原生存檔對話框卡住測試，所以測試在點擊「儲存」前，先在 Electron 主行程
// 註冊 will-download listener 自動指定存檔路徑並攔截，驗證檔案真的落地、
// 且大小 > 0（不是空檔案），藉此驗證匯出這一步不是空氣。
// ============================================================================

test.describe.serial('完整操作流程（載入圖片→濾鏡→去背→OCR→匯出）', () => {
  let ctx: LaunchedApp;
  let stepsCompleted = 0;

  test.beforeAll(async () => {
    ctx = await launchApp('full-workflow');
  });

  test.afterAll(async () => {
    await closeApp(ctx);
    console.log(`[完整流程] 完成步驟數：${stepsCompleted} / 6，console error 數：${ctx.consoleErrors.length}`);
  });

  test('步驟1-2：啟動 App、載入圖片', async () => {
    const { window } = ctx;
    expect(ctx.app.process().pid).toBeGreaterThan(0);
    await expect(window.locator('body')).toBeVisible();
    stepsCompleted++; // 1. 啟動

    await loadFixture(window, 'sample.png');
    await expect(window.locator('#editor-container')).toBeVisible();
    await expect(window.locator('#btn-save')).toBeEnabled();
    stepsCompleted++; // 2. 開圖
  });

  test('步驟3：調濾鏡→預覽（調整滑桿 + 濾鏡預設）', async () => {
    const { window } = ctx;

    // 調整滑桿：曝光
    await window.locator('#slider-exposure').evaluate((el: HTMLInputElement) => {
      el.value = '40';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(window.locator('#value-exposure')).toHaveText('40');

    // 濾鏡預設：套用 grayscale
    await window.locator('.filter-item[data-filter="grayscale"]').click();
    await expect(window.locator('.filter-item[data-filter="grayscale"]')).toHaveClass(/active/);

    const filterStyle = await window.evaluate(
      () => getComputedStyle(document.getElementById('image-canvas')!).filter
    );
    expect(filterStyle).toContain('grayscale');

    // 還原，避免影響後續去背/OCR 判斷顏色
    await window.locator('.filter-item[data-filter="none"]').click();
    await window.locator('#btn-reset-adjustments').click();
    stepsCompleted++; // 3. 濾鏡
  });

  test('步驟4：去背→預覽 alpha（魔術棒真實 flood-fill）', async () => {
    const { window } = ctx;

    await window.locator('#btn-remove-bg').click();
    await expect(window.locator('#mask-edit-toolbar')).toBeVisible();
    await window.locator('#mask-tool-magic-erase').click();

    const maskCanvasLocator = window.locator('#mask-edit-canvas');
    await maskCanvasLocator.click({ position: { x: 10, y: 20 } }); // 左半紅色區域
    await expect(window.locator('.nordic-toast-container')).toContainText('已選取');

    await window.locator('#mask-edit-apply').click();
    await expect(window.locator('.nordic-toast-container')).toContainText('去背已套用');
    await expect(window.locator('#mask-edit-toolbar')).toBeHidden();

    const alpha = await window.evaluate(() => {
      const canvas = document.getElementById('image-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      return ctx.getImageData(10, 20, 1, 1).data[3];
    });
    expect(alpha).toBe(0); // 去背區域確實透明
    stepsCompleted++; // 4. 去背
  });

  test('步驟5：OCR（mock Tesseract）→文字結果出現', async () => {
    const { window } = ctx;

    await window.locator('#btn-ocr').click();
    const canvasBox = await window.locator('#image-canvas').boundingBox();
    if (!canvasBox) throw new Error('image-canvas 找不到 bounding box');

    // 框選 OCR 區域：mousedown 的判定是在 viewport 上比對 canvas 當下的
    // getBoundingClientRect()，緊接在前一步（去背套用+toast+隱藏工具列）
    // 之後版面可能還沒完全穩定，所以先等一個 rAF 再開始拖曳，並在
    // down/up 之間補一點延遲，降低事件被吃掉的機率（真實使用者操作也
    // 不會是 0ms 內完成整個拖曳）。
    await window.waitForTimeout(100);
    await window.mouse.move(canvasBox.x + 2, canvasBox.y + 2);
    await window.mouse.down();
    await window.waitForTimeout(30);
    await window.mouse.move(canvasBox.x + canvasBox.width - 2, canvasBox.y + canvasBox.height - 2, { steps: 10 });
    await window.waitForTimeout(30);
    await window.mouse.up();

    await expect(window.locator('#ocr-lang-modal')).toBeVisible({ timeout: 10_000 });
    await window.locator('#btn-start-ocr').click();

    await expect(window.locator('#ocr-result-panel')).toBeVisible();
    await expect(window.locator('#ocr-text-output')).toHaveValue('MOCK OCR 測試文字 Hello');
    await window.locator('#btn-close-ocr-panel').click();
    stepsCompleted++; // 5. OCR
  });

  test('步驟6：匯出/儲存（攔截 will-download，驗檔案真的落地）', async () => {
    const { window, app, tmpDir } = ctx;
    const saveDir = fs.mkdtempSync(`${tmpDir}/save-`);

    // 在主行程註冊 will-download，攔截存檔路徑、避免跳出原生對話框卡住測試，
    // 完成後把結果寫進 main process 的 global 供輪詢讀取。
    await app.evaluate(({ BrowserWindow }, dir) => {
      // 注意：electronApp.evaluate 的函式是用 eval 跑在主行程 global scope，
      // 不是 CommonJS module scope，`require` 在這裡不可用，只能用字串組路徑。
      (global as any).__testDownloadResult = null;
      const win = BrowserWindow.getAllWindows()[0];
      win.webContents.session.once('will-download', (_event: any, item: any) => {
        const savePath = `${dir}/${item.getFilename()}`;
        item.setSavePath(savePath);
        item.once('done', (_e: any, state: string) => {
          (global as any).__testDownloadResult = state === 'completed' ? savePath : `FAILED:${state}`;
        });
      });
    }, saveDir);

    await window.locator('#btn-save').click();
    await expect(window.locator('.nordic-toast-container')).toContainText('已儲存');

    await expect
      .poll(async () => app.evaluate(() => (global as any).__testDownloadResult), { timeout: 10_000 })
      .not.toBeNull();

    const result = await app.evaluate(() => (global as any).__testDownloadResult);
    expect(result, `下載結果：${result}`).not.toMatch(/^FAILED/);

    const savedPath = result as string;
    expect(fs.existsSync(savedPath)).toBe(true);
    const stat = fs.statSync(savedPath);
    expect(stat.size).toBeGreaterThan(0); // 匯出的不是空檔案
    stepsCompleted++; // 6. 匯出
  });

  test('全程零 console error', async () => {
    expect(stepsCompleted).toBe(6);
    expect(ctx.consoleErrors, `收集到的 console error:\n${ctx.consoleErrors.join('\n')}`).toEqual([]);
  });
});

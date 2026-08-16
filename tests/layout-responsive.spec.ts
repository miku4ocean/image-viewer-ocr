import { test, expect } from '@playwright/test';
import { LaunchedApp, launchApp, closeApp, loadFixture } from './test-utils';

// ============================================================================
// 版面可用性驗收：Electron 視窗大小調整（小/中/大）+「語言」切換後版面不壞
//
// 附註（真實查證結果，不是猜測）：這個 App 沒有 UI 介面語言切換功能
// （grep 全專案找不到 i18n / lang-toggle / 中英切換，index.html 固定
// `<html lang="zh-TW">`，唯一跟「語言」有關的 UI 是 OCR 辨識語言勾選
// （chi_tra/eng/jpn/kor，既有 electron-app.spec.ts 測試 4 已驗證勾選邏輯）。
// 所以這裡把 D 項的「語言切換後版面不壞」改成驗證這個 App 實際擁有的語言
// 相關 UI（OCR 語言選擇彈窗）在最小視窗尺寸下版面不會裂開/被裁切。
//
// 視窗尺寸三檔：electron-main.js 設定 minWidth:1000/minHeight:700，
// 所以「小」用強制下限 1000x700（BrowserWindow 本身會 clamp，不可能更小），
// 「中」用預設 1400x900，「大」用 1920x1200。
// ============================================================================

async function resizeWindow(ctx: LaunchedApp, width: number, height: number) {
  await ctx.app.evaluate(({ BrowserWindow }, size) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setSize(size.width, size.height);
  }, { width, height });

  // 讓 Chromium 的 resize 事件與 app.js 的 fitImageToViewport() 有時間跑完
  await ctx.window.waitForTimeout(200);
}

test.describe.serial('版面可用性（視窗尺寸 + 語言相關 UI）', () => {
  let ctx: LaunchedApp;

  test.beforeAll(async () => {
    ctx = await launchApp('layout');
    await loadFixture(ctx.window, 'gradient.png'); // 100x20，5:1 長寬比，容易看出變形
  });

  test.afterAll(async () => {
    await closeApp(ctx);
  });

  const sizes: Array<[string, number, number]> = [
    ['小 (1000x700，強制下限)', 1000, 700],
    ['中 (1400x900，預設)', 1400, 900],
    ['大 (1920x1200)', 1920, 1200],
  ];

  for (const [label, width, height] of sizes) {
    test(`視窗尺寸 ${label}：圖片不變形、工具列不溢出`, async () => {
      const { window } = ctx;
      await resizeWindow(ctx, width, height);

      // 1. 圖片長寬比不變（不變形）：canvas 內部繪圖尺寸應維持原圖 100:20 = 5:1
      const canvasSize = await window.evaluate(() => {
        const c = document.getElementById('image-canvas') as HTMLCanvasElement;
        return { w: c.width, h: c.height };
      });
      expect(canvasSize.w).toBeGreaterThan(0);
      expect(canvasSize.h).toBeGreaterThan(0);
      const ratio = canvasSize.w / canvasSize.h;
      expect(ratio).toBeGreaterThan(4.9);
      expect(ratio).toBeLessThan(5.1);

      // 2. 工具列不溢出：scrollWidth 不該超過 clientWidth（允許 2px 誤差）
      const toolbarOverflow = await window.evaluate(() => {
        const el = document.getElementById('toolbar')!;
        return el.scrollWidth - el.clientWidth;
      });
      expect(toolbarOverflow).toBeLessThanOrEqual(2);

      // 3. 整個頁面不該出現水平捲軸（body 沒有橫向溢出）
      const bodyOverflow = await window.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(bodyOverflow).toBeLessThanOrEqual(2);

      // 4. 工具列按鈕全部仍可見（沒有被擠出視窗外）
      await expect(window.locator('#btn-open')).toBeVisible();
      await expect(window.locator('#btn-remove-bg')).toBeVisible();
      await expect(window.locator('#btn-ocr')).toBeVisible();
    });
  }

  test('最小視窗尺寸下，語言相關 UI（OCR 語言選擇彈窗）版面正常、按鈕可點', async () => {
    const { window } = ctx;
    await resizeWindow(ctx, 1000, 700);

    // 換成 40x40 的圖：OCR 框選要求 width>20 且 height>20（app.js L2896）才會跳出語言彈窗，
    // 前面用來測長寬比的 gradient.png 高度剛好只有 20px，框不出合格區域，換圖避免偽陽性失敗。
    await loadFixture(window, 'sample.png');

    await window.locator('#btn-ocr').click();
    const canvasBox = await window.locator('#image-canvas').boundingBox();
    if (!canvasBox) throw new Error('image-canvas 找不到 bounding box');

    await window.mouse.move(canvasBox.x + 2, canvasBox.y + 2);
    await window.mouse.down();
    await window.mouse.move(canvasBox.x + canvasBox.width - 2, canvasBox.y + canvasBox.height - 2, { steps: 3 });
    await window.mouse.up();

    await expect(window.locator('#ocr-lang-modal')).toBeVisible();

    // 彈窗本身、勾選項、確認按鈕都要在視窗可視範圍內（沒有被裁切到看不到/點不到）
    const modalBox = await window.locator('#ocr-lang-modal').boundingBox();
    expect(modalBox).not.toBeNull();
    if (modalBox) {
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.y).toBeGreaterThanOrEqual(0);
      expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(1000 + 2);
      expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(700 + 2);
    }

    await expect(window.locator('input[name="ocr-lang"][value="chi_tra"]')).toBeVisible();
    await expect(window.locator('input[name="ocr-lang"][value="eng"]')).toBeVisible();
    await expect(window.locator('input[name="ocr-lang"][value="jpn"]')).toBeVisible();
    await expect(window.locator('input[name="ocr-lang"][value="kor"]')).toBeVisible();
    await expect(window.locator('#btn-start-ocr')).toBeVisible();
    await expect(window.locator('#btn-start-ocr')).toBeEnabled();

    await window.locator('#btn-cancel-ocr').click();
    await expect(window.locator('#ocr-lang-modal')).toBeHidden();
  });

  test('全程零 console error', async () => {
    expect(ctx.consoleErrors, `收集到的 console error:\n${ctx.consoleErrors.join('\n')}`).toEqual([]);
  });
});

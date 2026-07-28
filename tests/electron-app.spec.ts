import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ============================================================================
// GUI 驗收自動化（HANDOFF.md 待辦清單中「手動驗步驟」的可自動化子集）
//
// 涵蓋（對照 HANDOFF.md L14-17）：
//   1. App 啟動零例外、主視窗出現、全程零 console error
//   2. 開圖（file input，本 App 沒有原生開檔對話框，純 <input type="file">）
//   3. 濾鏡調整：套用濾鏡後取樣比對 canvas 渲染像素（濾鏡是 CSS filter，
//      不是 pixel-level 運算，因此用「把 CSS filter 套到 offscreen canvas
//      再取樣」而非直接 getImageData 主畫布，才能量到真正的渲染結果）
//   4. OCR 語言選擇：checkbox UI 狀態 → 送進 Tesseract.recognize() 的語言
//      參數字串是否正確（真實跑 UI 互動：框選、勾選、按「開始辨識」）
//   5. AI 去背 - 魔術棒（本機像素演算法，純本機 flood fill，無外部相依）：
//      真實用滑鼠點擊觸發，驗證 mask canvas 與套用後主圖的 alpha 真的改變
//   6. AI 去背 - 自動選主體（呼叫外部 esm.sh CDN 動態載入 @imgly/
//      background-removal 大型 AI 模型）：MOCK，見下方說明
//
// 明確標註為 MOCK 的部分（其餘一律走真實程式碼路徑）：
//   - Tesseract.js：index.html 用 <script src="https://cdn.jsdelivr.net/...">
//     從 CDN 載入整個 OCR 引擎+ WASM，測試環境不應依賴網路也不該真的跑
//     一次耗時的辨識。改用 context.route() 攔截該 CDN 請求，回傳一個假的
//     `window.Tesseract.recognize()`，瞬間回傳固定文字，藉此驗證「UI 狀態
//     → 呼叫參數傳遞正確」這件事，而不驗證 Tesseract 引擎本身的辨識準確度。
//   - Google Fonts：index.html 有 <link> 拉 fonts.googleapis.com，攔截並回
//     傳空 CSS，避免測試機網路狀況造成的非預期 console 訊息，讓測試在完全
//     離線的環境下也能穩定重現。
//   - @imgly/background-removal（AI 自動選主體）：app.js 用動態
//     `import('https://esm.sh/@imgly/background-removal@1.4.5')` 載入外部大型
//     AI 模型（真實執行需下載 WASM/模型檔、跑推論，耗時且需要網路）。攔截該
//     esm.sh 請求，回傳一個假的 removeBackground()，用純 canvas 操作模擬「把
//     圖片一部分變透明」，藉此驗證按鈕 → 動態載入 → 產生遮罩預覽的整合流程，
//     不驗證 AI 模型本身的去背品質。
//   - 魔術棒去背（mask-tool-magic-erase）不是 mock：這是本機 flood-fill 演算
//     法（見 app.js magicWandSelect()），測試中用小圖真實觸發、真實運算。
//
// 仍需人工驗收（見 HANDOFF.md L14-17，本測試無法自動化的部分）：
//   - 真實圖片格式的視覺正確性（本測試只用 40x40 純色合成圖，不驗證真實照片
//     的濾鏡觀感、真實 OCR 對真實文字的辨識準確度、真實 AI 去背的品質）
//   - Tesseract.js／@imgly 真實引擎的辨識/去背準確度（上面已 mock，只驗證
//     整合流程，不驗證演算法本身）
//   - `npm run build` 打包產物（dmg/zip）的實際安裝與 Gatekeeper 行為
// ============================================================================

const projectRoot = path.resolve(__dirname, '..');
const fixturesDir = path.join(__dirname, 'fixtures');
const sampleImage = path.join(fixturesDir, 'sample.png'); // 40x40，左半紅、右半藍

// -- Mock 用的假腳本內容 -----------------------------------------------------

// 假 Tesseract：回傳固定文字，並把呼叫參數記在 window.__mockOcrCalls 供測試檢查。
const FAKE_TESSERACT_SRC = `
window.Tesseract = {
  recognize: async function (image, languages, options) {
    window.__mockOcrCalls = window.__mockOcrCalls || [];
    window.__mockOcrCalls.push({ languages: languages });
    if (options && typeof options.logger === 'function') {
      options.logger({ status: 'loading language traineddata', progress: 0 });
      options.logger({ status: 'recognizing text', progress: 1 });
    }
    return {
      data: {
        text: 'MOCK OCR 測試文字 Hello',
        words: [
          { text: 'MOCK', bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
          { text: 'OCR', bbox: { x0: 12, y0: 0, x1: 20, y1: 10 } }
        ]
      }
    };
  }
};
`;

// 假 @imgly/background-removal ES module：把輸入圖片左半清成透明，模擬「AI 選好主體」。
const FAKE_IMGLY_MODULE_SRC = `
async function removeBackground(blob, opts) {
  if (opts && typeof opts.progress === 'function') {
    opts.progress('fetch:model', 1, 1);
    opts.progress('compute:inference', 1, 1);
  }
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  ctx.clearRect(0, 0, Math.floor(canvas.width / 2), canvas.height);
  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
export default removeBackground;
export { removeBackground };
`;

async function installNetworkMocks(context: BrowserContext) {
  // Tesseract CDN → 假引擎（MOCK，見檔頭說明）
  await context.route('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TESSERACT_SRC })
  );

  // Google Fonts → 空 CSS，避免離線環境產生非預期網路噪音
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );

  // @imgly/background-removal（esm.sh 動態載入）→ 假 AI 模型（MOCK，見檔頭說明）
  await context.route('https://esm.sh/@imgly/background-removal@1.4.5', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_IMGLY_MODULE_SRC })
  );
}

test.describe.serial('Image Viewer OCR GUI 驗收', () => {
  let electronApp: ElectronApplication;
  let window: Page;
  let tmpDir: string;
  const consoleErrors: string[] = [];

  test.beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ivo-electron-gui-test-'));
    const userDataDir = path.join(tmpDir, 'user-data');

    electronApp = await electron.launch({
      args: [projectRoot, `--user-data-dir=${userDataDir}`],
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    // 在第一個視窗完成導航前先掛上 route mock（context 對所有頁面生效，
    // 包含即將載入 index.html 的第一個視窗），避免真的打去 CDN。
    const context = electronApp.context();
    await installNetworkMocks(context);

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    window.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    window.on('pageerror', (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });
  });

  test.afterAll(async () => {
    await electronApp.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('1. App 啟動零例外、主視窗出現', async () => {
    expect(electronApp.process().pid).toBeGreaterThan(0);
    expect(await window.title()).toContain('Image Viewer OCR');
    await expect(window.locator('body')).toBeVisible();
    // 尚未開圖時，OCR / 去背按鈕應為 disabled
    await expect(window.locator('#btn-ocr')).toBeDisabled();
    await expect(window.locator('#btn-remove-bg')).toBeDisabled();
  });

  test('2. 開圖：透過 file input 載入小張合成測試圖', async () => {
    await window.setInputFiles('#file-input', sampleImage);

    // 載入成功後編輯器容器可見、welcome 畫面隱藏
    await expect(window.locator('#editor-container')).toBeVisible();
    await expect(window.locator('#image-info')).toContainText('sample.png');
    await expect(window.locator('#image-info')).toContainText('40');

    // 開圖後功能按鈕應可用
    await expect(window.locator('#btn-ocr')).toBeEnabled();
    await expect(window.locator('#btn-remove-bg')).toBeEnabled();
  });

  test('3. 濾鏡調整：套用濾鏡後渲染像素真的改變（取樣比對）', async () => {
    // 濾鏡是套在 <canvas style="filter: ..."> 上的 CSS filter，不是 pixel
    // 級運算，所以取樣時要把該 CSS filter 實際套到一顆 offscreen canvas
    // 上再讀 pixel，才量得到「使用者看到的」渲染結果。
    const samplePixel = async (cssFilter: string) => {
      return window.evaluate((filter) => {
        const src = document.getElementById('image-canvas') as HTMLCanvasElement;
        const off = document.createElement('canvas');
        off.width = src.width;
        off.height = src.height;
        const ctx = off.getContext('2d')!;
        ctx.filter = filter || 'none';
        ctx.drawImage(src, 0, 0);
        // 取左半（原本是純紅色 220,40,40）的一個像素
        const d = ctx.getImageData(10, 20, 1, 1).data;
        return [d[0], d[1], d[2]];
      }, cssFilter);
    };

    const beforeFilter = await window.evaluate(
      () => getComputedStyle(document.getElementById('image-canvas')!).filter
    );
    const baseline = await samplePixel(beforeFilter);
    // 初始濾鏡是 none，左半應接近原始紅色
    expect(baseline[0]).toBeGreaterThan(150); // R 高
    expect(baseline[1]).toBeLessThan(100); // G 低

    // 套用 invert 濾鏡（filters.invert = 'invert(100%)'，反轉最容易量到差異）
    await window.locator('.filter-item[data-filter="invert"]').click();
    await expect(window.locator('.filter-item[data-filter="invert"]')).toHaveClass(/active/);

    const afterFilter = await window.evaluate(
      () => getComputedStyle(document.getElementById('image-canvas')!).filter
    );
    expect(afterFilter).not.toBe(beforeFilter);

    const inverted = await samplePixel(afterFilter);
    // 反轉後紅色應大幅下降、綠/藍應大幅上升（原本紅色 220,40,40 → 約 35,215,215）
    expect(inverted[0]).toBeLessThan(baseline[0] - 100);
    expect(inverted[1]).toBeGreaterThan(baseline[1] + 100);

    // 還原成 none，避免影響後續測試
    await window.locator('.filter-item[data-filter="none"]').click();
    await expect(window.locator('.filter-item[data-filter="none"]')).toHaveClass(/active/);
  });

  test('4. OCR 語言選擇：UI 勾選狀態正確傳進辨識引擎呼叫參數（MOCK 引擎）', async () => {
    // 框選整張圖觸發語言選擇彈窗（真實滑鼠拖曳，非直接呼叫內部函式）
    await window.locator('#btn-ocr').click();
    const canvasBox = await window.locator('#image-canvas').boundingBox();
    if (!canvasBox) throw new Error('image-canvas 找不到 bounding box');

    await window.mouse.move(canvasBox.x + 2, canvasBox.y + 2);
    await window.mouse.down();
    await window.mouse.move(canvasBox.x + canvasBox.width - 2, canvasBox.y + canvasBox.height - 2, {
      steps: 5,
    });
    await window.mouse.up();

    await expect(window.locator('#ocr-lang-modal')).toBeVisible();

    // 預設勾選：chi_tra + eng。改成 jpn + kor（取消 chi_tra、eng，勾選 jpn、kor）
    await window.locator('input[name="ocr-lang"][value="chi_tra"]').uncheck();
    await window.locator('input[name="ocr-lang"][value="eng"]').uncheck();
    await window.locator('input[name="ocr-lang"][value="jpn"]').check();
    await window.locator('input[name="ocr-lang"][value="kor"]').check();

    await window.locator('#btn-start-ocr').click();

    await expect(window.locator('#ocr-result-panel')).toBeVisible();
    await expect(window.locator('#ocr-text-output')).toHaveValue('MOCK OCR 測試文字 Hello');

    // 驗證真正送進 Tesseract.recognize() 的語言字串反映了 checkbox 狀態
    const calls = await window.evaluate(() => (window as any).__mockOcrCalls);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1].languages).toBe('jpn+kor');
  });

  test('5. AI 去背 - 魔術棒（本機 flood-fill 演算法，真實運算非 mock）', async () => {
    await window.locator('#btn-remove-bg').click();
    await expect(window.locator('#mask-edit-toolbar')).toBeVisible();

    await window.locator('#mask-tool-magic-erase').click();
    await expect(window.locator('#mask-tool-magic-erase')).toHaveClass(/active/);

    const maskCanvasLocator = window.locator('#mask-edit-canvas');
    const maskBox = await maskCanvasLocator.boundingBox();
    if (!maskBox) throw new Error('mask-edit-canvas 找不到 bounding box');

    // 圖片左半是紅色（0-19px），點擊 x=10 落在左半的中心
    await maskCanvasLocator.click({ position: { x: 10, y: 20 } });

    // 魔術棒選取完成會跳 toast「已選取 N 個像素加入去背區」
    await expect(window.locator('.nordic-toast-container')).toContainText('已選取');

    // 直接讀 mask canvas 的像素，確認左半被標記成「去背區」(紅色遮罩 209,105,105)
    const maskPixel = await window.evaluate(() => {
      const canvas = document.getElementById('mask-edit-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const d = ctx.getImageData(10, 20, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    });
    expect(maskPixel[3]).toBeGreaterThan(0); // alpha > 0，代表有畫到遮罩
    expect(maskPixel[0]).toBeGreaterThan(maskPixel[1]); // 紅 > 綠 → 去背色

    // 套用去背，驗證最終圖片左半變透明
    await window.locator('#mask-edit-apply').click();
    await expect(window.locator('.nordic-toast-container')).toContainText('去背已套用');
    await expect(window.locator('#mask-edit-toolbar')).toBeHidden();

    const finalAlpha = await window.evaluate(() => {
      const canvas = document.getElementById('image-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const d = ctx.getImageData(10, 20, 1, 1).data;
      return d[3];
    });
    expect(finalAlpha).toBe(0); // 左半（曾被魔術棒選取去背）應完全透明
  });

  test('6. AI 去背 - 自動選主體（外部 AI 模型，MOCK 動態載入的 esm.sh 模組）', async () => {
    await window.locator('#btn-remove-bg').click();
    await expect(window.locator('#mask-edit-toolbar')).toBeVisible();

    await window.locator('#mask-tool-auto-subject').click();

    // 觸發動態 import 的假 @imgly 模組 + 產生遮罩預覽，屬非同步流程，輪詢等待遮罩畫布出現內容
    await expect
      .poll(
        async () =>
          window.evaluate(() => {
            const canvas = document.getElementById('mask-edit-canvas') as HTMLCanvasElement;
            const ctx = canvas.getContext('2d')!;
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let nonTransparent = 0;
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] > 0) nonTransparent++;
            }
            return nonTransparent;
          }),
        { timeout: 10_000 }
      )
      .toBeGreaterThan(0);

    await window.locator('#mask-edit-cancel').click();
    await expect(window.locator('#mask-edit-toolbar')).toBeHidden();
  });

  test('7. 全程零 console error（含前面所有步驟）', async () => {
    expect(consoleErrors, `收集到的 console error:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});

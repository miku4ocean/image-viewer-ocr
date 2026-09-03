import { test, expect } from '@playwright/test';
import { LaunchedApp, launchApp, closeApp, loadFixture } from './test-utils';
import * as path from 'path';
import { fixturesDir } from './test-utils';

// ============================================================================
// 本輪偵錯新增：影像邊界（極端尺寸/縮放）＋ OCR 座標對應 ＋ 去背非同步時序
//
// 對應的三個產品 bug（先紅後綠證明，見各測試註解）：
//   A. renderCanvas() 對「寬(高) × zoom」做 Math.round 沒有下限保護：
//      - 1×2000 極端長條圖在 fitImageToViewport 後 round(1×0.3)=0 → canvas 0 寬
//        → applyAllEffects 的 getImageData 直接拋 IndexSizeError，圖根本開不起來
//      - 4×4 極小圖連按縮小（zoom 下限 0.1）round(4×0.107)=0 → 同樣崩潰
//   B. performOCR(null)（辨識整張圖）拿「顯示畫布」當輸入：
//      - zoom<1 時 OCR 輸入解析度縮水（辨識品質跟著 zoom 跑）
//      - Tesseract 回傳的 bbox 落在顯示座標系，renderOCROverlay 又乘一次
//        zoom（canvas.width/imageWidth），字詞框整組往左上縮 → 位置錯
//      - renderOCROverlay 的偏移沒加 viewport.scrollLeft/Top（updateCropArea
//        有加），捲動後字詞框再偏一次
//   C. autoSelectBackground() await autoSelectSubject() 後立即反轉遮罩，
//      但遮罩其實在 resultImg.onload（更晚）才生成 → 第一次用「自動選背景」
//      反轉不到任何東西，之後每次都反轉到上一輪的舊遮罩再被新遮罩蓋掉，
//      「自動選背景」形同永遠失效
//
// OCR 引擎照既有慣例 mock（不依賴網路）；本檔另用 page.evaluate 換上
// 「回報輸入畫布尺寸、bbox 覆蓋整張輸入」的加強版 mock，才能驗座標對應。
// ============================================================================

test.describe.serial('影像邊界與 OCR 座標對應', () => {
  let ctx: LaunchedApp;

  test.beforeAll(async () => {
    ctx = await launchApp('boundary-ocr');
  });

  test.afterAll(async () => {
    await closeApp(ctx);
  });

  test('A1. 載入 1×2000 極端長條圖：不應拋例外、畫布最短邊至少 1px', async () => {
    const { window } = ctx;
    // 不用 loadFixture：bug 存在時 updateImageInfo 根本執行不到（前面就拋錯），
    // 這裡直接驗「載入後 image-info 出現檔名 + canvas 尺寸 >= 1」的期望行為。
    await window.setInputFiles('#file-input', path.join(fixturesDir, 'strip1x2000.png'));
    await expect(window.locator('#image-info')).toContainText('strip1x2000.png', {
      timeout: 10_000,
    });

    const dims = await window.evaluate(() => {
      const c = document.getElementById('image-canvas') as HTMLCanvasElement;
      return { w: c.width, h: c.height };
    });
    expect(dims.w, '極端長寬比縮放後畫布寬度').toBeGreaterThanOrEqual(1);
    expect(dims.h).toBeGreaterThanOrEqual(1);
  });

  test('A2. 4×4 極小圖連續縮小 12 次：不應拋例外、畫布保持 >= 1px', async () => {
    const { window } = ctx;
    await loadFixture(window, 'tiny4.png');

    for (let i = 0; i < 12; i++) {
      await window.locator('#btn-zoom-out').click();
    }

    const dims = await window.evaluate(() => {
      const c = document.getElementById('image-canvas') as HTMLCanvasElement;
      return { w: c.width, h: c.height };
    });
    expect(dims.w, '連續縮小後畫布寬度').toBeGreaterThanOrEqual(1);
    expect(dims.h, '連續縮小後畫布高度').toBeGreaterThanOrEqual(1);
  });

  // 換上加強版 OCR mock：記錄輸入畫布尺寸，回傳一個 bbox 剛好覆蓋整張輸入的字詞。
  // 若輸入是原始解析度（正確），overlay 字詞框應恰好覆蓋整個顯示中的 canvas。
  async function installRecordingOcrMock(window: LaunchedApp['window']) {
    await window.evaluate(() => {
      (window as any).__ocrInputs = [];
      (window as any).Tesseract = {
        recognize: async (image: any) => {
          (window as any).__ocrInputs.push({ width: image.width, height: image.height });
          return {
            data: {
              text: 'FULLSPAN',
              words: [
                { text: 'FULLSPAN', bbox: { x0: 0, y0: 0, x1: image.width, y1: image.height } },
              ],
            },
          };
        },
      };
    });
  }

  test('B1. 全圖 OCR（zoom<1）：辨識輸入應為原始解析度 2000×1500，且字詞框覆蓋整個畫布', async () => {
    const { window } = ctx;
    await loadFixture(window, 'big2000x1500.png'); // fit zoom < 1
    await installRecordingOcrMock(window);

    await window.locator('#btn-ocr').click(); // 進入框選模式
    await window.keyboard.press('Enter'); // 不框選 → 辨識整張圖
    await expect(window.locator('#ocr-result-panel')).toBeVisible();

    // (1) OCR 輸入解析度不應隨顯示縮放縮水
    const inputs = await window.evaluate(() => (window as any).__ocrInputs);
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs[inputs.length - 1], 'OCR 輸入畫布尺寸').toEqual({ width: 2000, height: 1500 });

    // (2) bbox 覆蓋整張圖的字詞，其 overlay 框應與顯示中的 canvas 對齊
    const wordBox = await window.locator('.ocr-word').first().boundingBox();
    const canvasBox = await window.locator('#image-canvas').boundingBox();
    if (!wordBox || !canvasBox) throw new Error('找不到 ocr-word 或 image-canvas 的 boundingBox');
    expect(Math.abs(wordBox.x - canvasBox.x), 'x 對齊').toBeLessThanOrEqual(8);
    expect(Math.abs(wordBox.y - canvasBox.y), 'y 對齊').toBeLessThanOrEqual(8);
    expect(Math.abs(wordBox.width - canvasBox.width), '寬度對齊').toBeLessThanOrEqual(12);
    expect(Math.abs(wordBox.height - canvasBox.height), '高度對齊').toBeLessThanOrEqual(12);

    await window.locator('#btn-close-ocr-panel').click();
  });

  test('B2. 放大＋捲動後全圖 OCR：字詞框仍應與畫布對齊（捲動偏移）', async () => {
    const { window } = ctx;
    await loadFixture(window, 'big2000x1500.png');
    await installRecordingOcrMock(window);

    // 放大兩級讓畫布超出 viewport 產生捲動空間，再捲動一段距離
    await window.locator('#btn-zoom-in').click();
    await window.locator('#btn-zoom-in').click();
    await window.evaluate(() => {
      const vp = document.getElementById('image-viewport')!;
      vp.scrollLeft = 150;
      vp.scrollTop = 100;
    });

    await window.locator('#btn-ocr').click();
    await window.keyboard.press('Enter');
    await expect(window.locator('#ocr-result-panel')).toBeVisible();

    const wordBox = await window.locator('.ocr-word').first().boundingBox();
    const canvasBox = await window.locator('#image-canvas').boundingBox();
    if (!wordBox || !canvasBox) throw new Error('找不到 ocr-word 或 image-canvas 的 boundingBox');
    expect(Math.abs(wordBox.x - canvasBox.x), '捲動後 x 對齊').toBeLessThanOrEqual(8);
    expect(Math.abs(wordBox.y - canvasBox.y), '捲動後 y 對齊').toBeLessThanOrEqual(8);
    expect(Math.abs(wordBox.width - canvasBox.width), '捲動後寬度對齊').toBeLessThanOrEqual(12);
    expect(Math.abs(wordBox.height - canvasBox.height), '捲動後高度對齊').toBeLessThanOrEqual(12);

    await window.locator('#btn-close-ocr-panel').click();
  });

  test('C. 自動選背景：遮罩應為「主體/背景反轉」結果（mock 左半透明=背景）', async () => {
    const { window } = ctx;
    await loadFixture(window, 'sample.png'); // 40×40，zoom=1

    await window.locator('#btn-remove-bg').click();
    await expect(window.locator('#mask-edit-toolbar')).toBeVisible();

    // mock 的 removeBackground 把「左半」清成透明（＝背景、右半＝主體）。
    // 「自動選背景」= 反轉選取 → 左半應標成綠色(g>r)、右半紅色(r>g)。
    await window.locator('#mask-tool-auto-bg').click();

    await expect
      .poll(
        async () =>
          window.evaluate(() => {
            const canvas = document.getElementById('mask-edit-canvas') as HTMLCanvasElement;
            const c = canvas.getContext('2d')!;
            const left = c.getImageData(10, 20, 1, 1).data;
            return left[3] > 0 && left[1] > left[0]; // 左半：有遮罩且 綠 > 紅
          }),
        { timeout: 10_000, message: '左半（背景區）應被反轉標成綠色（保留）' }
      )
      .toBe(true);

    const right = await window.evaluate(() => {
      const canvas = document.getElementById('mask-edit-canvas') as HTMLCanvasElement;
      const c = canvas.getContext('2d')!;
      return Array.from(c.getImageData(30, 20, 1, 1).data);
    });
    expect(right[3], '右半應有遮罩').toBeGreaterThan(0);
    expect(right[0], '右半（主體區）應被反轉標成紅色（移除）').toBeGreaterThan(right[1]);

    await window.locator('#mask-edit-cancel').click();
    await expect(window.locator('#mask-edit-toolbar')).toBeHidden();
  });

  test('全程零 console error', async () => {
    expect(
      ctx.consoleErrors,
      `收集到的 console error:\n${ctx.consoleErrors.join('\n')}`
    ).toEqual([]);
  });
});

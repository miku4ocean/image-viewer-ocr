import { _electron as electron, ElectronApplication, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 共用測試工具：給本輪新增的品質驗收測試（濾鏡數學／去背邊界／完整流程／版面）用。
// 不動既有 tests/electron-app.spec.ts（7 條綠燈維持原樣），避免退步風險；
// 這裡刻意保留一份獨立的 mock 腳本副本，而不是 import 既有 spec 內的常數，
// 因為既有 spec 沒有 export，改動它有牽動既有測試的風險。

export const projectRoot = path.resolve(__dirname, '..');
export const fixturesDir = path.join(__dirname, 'fixtures');

// 假 Tesseract：回傳固定文字。
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

// 假 @imgly/background-removal：把輸入圖片左半清成透明，模擬「AI 選好主體」。
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

export async function installNetworkMocks(context: BrowserContext) {
  await context.route('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TESSERACT_SRC })
  );
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await context.route('https://esm.sh/@imgly/background-removal@1.4.5', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_IMGLY_MODULE_SRC })
  );
}

export interface LaunchedApp {
  app: ElectronApplication;
  window: Page;
  tmpDir: string;
  consoleErrors: string[];
}

// 啟動一個全新、獨立 user-data-dir 的 Electron App 實例。
export async function launchApp(namePrefix: string): Promise<LaunchedApp> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `ivo-${namePrefix}-`));
  const userDataDir = path.join(tmpDir, 'user-data');

  const app = await electron.launch({
    args: [projectRoot, `--user-data-dir=${userDataDir}`],
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'test' },
  });

  const context = app.context();
  await installNetworkMocks(context);

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  const consoleErrors: string[] = [];
  window.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  window.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });

  return { app, window, tmpDir, consoleErrors };
}

export async function closeApp(launched: LaunchedApp) {
  await launched.app.close();
  fs.rmSync(launched.tmpDir, { recursive: true, force: true });
}

// 透過 file input 載入圖片並等編輯器出現。
export async function loadFixture(window: Page, fixtureFileName: string) {
  const filePath = path.join(fixturesDir, fixtureFileName);
  await window.setInputFiles('#file-input', filePath);
  await window.locator('#editor-container').waitFor({ state: 'visible' });
  return filePath;
}

// 設定調整滑桿（曝光/對比/亮部/陰影/飽和度/色溫/色調/褐色調/清晰度）數值，
// 直接寫 value 再 dispatch 'input' 事件（滑桿的實際監聽事件），觸發 applyAllEffects()。
export async function setAdjustment(
  window: Page,
  key:
    | 'exposure'
    | 'contrast'
    | 'highlights'
    | 'shadows'
    | 'saturation'
    | 'temperature'
    | 'tint'
    | 'sepia'
    | 'sharpness',
  value: number
) {
  await window.locator(`#slider-${key}`).evaluate((el: HTMLInputElement, v: number) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

export async function resetAdjustments(window: Page) {
  await window.locator('#btn-reset-adjustments').click();
}

// 讀 #image-canvas 上單一像素的 RGBA（未套 CSS filter 的原始 pixel data，
// 即 applyAllEffects() 已烘焙進 canvas 的調整結果）。
export async function readCanvasPixel(window: Page, x: number, y: number): Promise<number[]> {
  return window.evaluate(
    ({ x, y }) => {
      const canvas = document.getElementById('image-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const d = ctx.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    },
    { x, y }
  );
}

export async function readCanvasRegionAlpha(
  window: Page,
  canvasId: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<number[]> {
  return window.evaluate(
    ({ canvasId, x, y, w, h }) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const data = ctx.getImageData(x, y, w, h).data;
      const alphas: number[] = [];
      for (let i = 3; i < data.length; i += 4) alphas.push(data[i]);
      return alphas;
    },
    { canvasId, x, y, w, h }
  );
}

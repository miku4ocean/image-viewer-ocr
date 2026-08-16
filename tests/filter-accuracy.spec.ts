import { test, expect } from '@playwright/test';
import {
  LaunchedApp,
  launchApp,
  closeApp,
  loadFixture,
  setAdjustment,
  resetAdjustments,
  readCanvasPixel,
} from './test-utils';

// ============================================================================
// 濾鏡/調整數學正確性驗收
//
// app.js 的「調整」滑桿（曝光/對比/亮部/陰影/飽和度/清晰度…）不是 CSS filter，
// 是在 applyAllEffects() 裡直接對 getImageData() 逐像素做數學運算再 putImageData()
// 烘焙回 canvas（saveImage() 存檔時也是同一套公式，見 app.js L2224-2330）。
// 這份測試用「已知純色/色階測試圖」+「獨立手算期望值」，逐像素比對 canvas 實際
// 輸出，驗證公式本身算得對不對、方向對不對、clamp 有沒有做。
//
// 用到的公式（抄自 app.js applyAllEffects，逐一手算驗證）：
//   曝光：exp = 曝光值/100*0.5+1；r *= exp
//   對比：con = 對比值/100*0.5+1；r = (r-128)*con+128
//   亮部：僅 luminance(0.299R+0.587G+0.114B) > 128 時生效：
//         factor=(luminance-128)/127；adj=亮部值/100*0.5*factor；r *= (1+adj)
//   陰影：僅 luminance < 128 時生效：
//         factor=(128-luminance)/128；adj=陰影值/100*0.5*factor；r *= (1+adj)
//   飽和度：sat = 飽和度值/100+1；gray=0.2126R+0.7152G+0.0722B；r = gray+sat*(r-gray)
//   清晰度（Unsharp Mask）：laplacian = 4*center-上-下-左-右；
//         new = center + amount*laplacian（amount=清晰度值/100，只處理內部像素）
//   最終每個 channel 都 clamp 到 [0,255]
// ============================================================================

test.describe.serial('濾鏡/調整數學正確性', () => {
  let ctx: LaunchedApp;

  test.beforeAll(async () => {
    ctx = await launchApp('filter-math');
  });

  test.afterAll(async () => {
    await closeApp(ctx);
  });

  test('曝光（exposure）：純灰 128,128,128 手算 4 組值', async () => {
    const { window } = ctx;
    await loadFixture(window, 'gray128.png');

    // 基準：未調整前應是原圖純灰（sanity check fixture 本身沒有色偏）
    const baseline = await readCanvasPixel(window, 10, 10);
    expect(baseline.slice(0, 3)).toEqual([128, 128, 128]);

    const cases: Array<[number, number]> = [
      [50, 160], // exp = 50/100*0.5+1 = 1.25 → 128*1.25 = 160
      [-50, 96], // exp = -50/100*0.5+1 = 0.75 → 128*0.75 = 96
      [100, 192], // exp = 100/100*0.5+1 = 1.5 → 128*1.5 = 192
      [-100, 64], // exp = -100/100*0.5+1 = 0.5 → 128*0.5 = 64
    ];

    for (const [slider, expected] of cases) {
      await setAdjustment(window, 'exposure', slider);
      const px = await readCanvasPixel(window, 10, 10);
      expect(px[0], `曝光=${slider}：R`).toBeGreaterThanOrEqual(expected - 1);
      expect(px[0], `曝光=${slider}：R`).toBeLessThanOrEqual(expected + 1);
      expect(px[1]).toBe(px[0]); // 灰階圖 R=G=B 應始終成立
      expect(px[2]).toBe(px[0]);
      await resetAdjustments(window);
    }
  });

  test('對比（contrast）：四階色帶驗方向正確 + clamp', async () => {
    const { window } = ctx;
    await loadFixture(window, 'tritone.png'); // x0-9=250 x10-19=200 x20-29=128 x30-39=60，高10px

    // sanity：四個色帶基準值
    const bandY = 5;
    expect((await readCanvasPixel(window, 5, bandY))[0]).toBe(250);
    expect((await readCanvasPixel(window, 15, bandY))[0]).toBe(200);
    expect((await readCanvasPixel(window, 25, bandY))[0]).toBe(128);
    expect((await readCanvasPixel(window, 35, bandY))[0]).toBe(60);

    // 對比 +100：con=1.5
    await setAdjustment(window, 'contrast', 100);
    const p250 = (await readCanvasPixel(window, 5, bandY))[0];
    const p200 = (await readCanvasPixel(window, 15, bandY))[0];
    const p128 = (await readCanvasPixel(window, 25, bandY))[0];
    const p60 = (await readCanvasPixel(window, 35, bandY))[0];

    // (250-128)*1.5+128=311 → clamp 255
    expect(p250).toBe(255);
    // (200-128)*1.5+128=236
    expect(p200).toBeGreaterThanOrEqual(235);
    expect(p200).toBeLessThanOrEqual(237);
    // 128 是中心點，對比不應改變它
    expect(p128).toBe(128);
    // (60-128)*1.5+128=26
    expect(p60).toBeGreaterThanOrEqual(25);
    expect(p60).toBeLessThanOrEqual(27);

    // 方向正確性：高值更高、低值更低
    expect(p200).toBeGreaterThan(200);
    expect(p60).toBeLessThan(60);

    await resetAdjustments(window);

    // 對比 -50（壓縮動態範圍）：con=0.75，兩端應往 128 靠攏（方向相反）
    await setAdjustment(window, 'contrast', -50);
    const n250 = (await readCanvasPixel(window, 5, bandY))[0];
    const n60 = (await readCanvasPixel(window, 35, bandY))[0];
    expect(n250).toBeLessThan(250); // 250 被往下壓
    expect(n60).toBeGreaterThan(60); // 60 被往上抬
    await resetAdjustments(window);
  });

  test('亮部（highlights）：只影響 luminance>128 的區域', async () => {
    const { window } = ctx;
    await loadFixture(window, 'tritone.png');
    const bandY = 5;

    await setAdjustment(window, 'highlights', 50);
    const p250 = (await readCanvasPixel(window, 5, bandY))[0];
    const p200 = (await readCanvasPixel(window, 15, bandY))[0];
    const p128 = (await readCanvasPixel(window, 25, bandY))[0];
    const p60 = (await readCanvasPixel(window, 35, bandY))[0];

    // 250：factor=(250-128)/127=0.9606; adj=0.25*0.9606=0.2402; 250*1.2402=310 → clamp 255
    expect(p250).toBe(255);
    // 200：factor=(200-128)/127=0.5669; adj=0.25*0.5669=0.1417; 200*1.1417=228.3
    expect(p200).toBeGreaterThanOrEqual(227);
    expect(p200).toBeLessThanOrEqual(230);
    // 128 剛好不 > 128，不受影響
    expect(p128).toBe(128);
    // 60 的 luminance < 128，亮部調整不該動到暗部（這是「不會整張都跟著跑」的邊界正確性）
    expect(p60).toBe(60);

    await resetAdjustments(window);
  });

  test('陰影（shadows）：只影響 luminance<128 的區域', async () => {
    const { window } = ctx;
    await loadFixture(window, 'tritone.png');
    const bandY = 5;

    await setAdjustment(window, 'shadows', 50);
    const p250 = (await readCanvasPixel(window, 5, bandY))[0];
    const p200 = (await readCanvasPixel(window, 15, bandY))[0];
    const p128 = (await readCanvasPixel(window, 25, bandY))[0];
    const p60 = (await readCanvasPixel(window, 35, bandY))[0];

    // 60：factor=(128-60)/128=0.53125; adj=0.25*0.53125=0.1328; 60*1.1328=67.97
    expect(p60).toBeGreaterThanOrEqual(67);
    expect(p60).toBeLessThanOrEqual(69);
    // 128 剛好不 < 128，不受影響
    expect(p128).toBe(128);
    // 200/250 的 luminance > 128，陰影調整不該動到亮部
    expect(p200).toBe(200);
    expect(p250).toBe(250);

    await resetAdjustments(window);
  });

  test('飽和度（saturation）：-100 應完全去色為灰階，+100 應放大色差（含 clamp）', async () => {
    const { window } = ctx;
    await loadFixture(window, 'sample.png'); // 40x40，左半紅、右半藍
    const baseline = await readCanvasPixel(window, 10, 20); // 左半紅色像素

    // sanity：基準像素本來就該是彩色（R 明顯 != G）
    expect(Math.abs(baseline[0] - baseline[1])).toBeGreaterThan(50);

    const gray = 0.2126 * baseline[0] + 0.7152 * baseline[1] + 0.0722 * baseline[2];

    await setAdjustment(window, 'saturation', -100); // sat=0 → r=g=b=gray
    const desat = await readCanvasPixel(window, 10, 20);
    expect(desat[0]).toBeGreaterThanOrEqual(Math.round(gray) - 1);
    expect(desat[0]).toBeLessThanOrEqual(Math.round(gray) + 1);
    expect(desat[1]).toBeGreaterThanOrEqual(desat[0] - 1);
    expect(desat[1]).toBeLessThanOrEqual(desat[0] + 1);
    expect(desat[2]).toBeGreaterThanOrEqual(desat[0] - 1);
    expect(desat[2]).toBeLessThanOrEqual(desat[0] + 1);
    await resetAdjustments(window);

    // 飽和度 +100：sat=2 → r_new=2r-gray（可能 clamp）
    await setAdjustment(window, 'saturation', 100);
    const sat100 = await readCanvasPixel(window, 10, 20);
    const expectedR = Math.min(255, Math.max(0, 2 * baseline[0] - gray));
    const expectedG = Math.min(255, Math.max(0, 2 * baseline[1] - gray));
    expect(sat100[0]).toBeGreaterThanOrEqual(Math.round(expectedR) - 2);
    expect(sat100[0]).toBeLessThanOrEqual(Math.round(expectedR) + 2);
    expect(sat100[1]).toBeGreaterThanOrEqual(Math.round(expectedG) - 2);
    expect(sat100[1]).toBeLessThanOrEqual(Math.round(expectedG) + 2);
    // 方向正確：更飽和 = R 通道應比原本更極端（更高或持平於clamp上限）
    expect(sat100[0]).toBeGreaterThanOrEqual(baseline[0]);
    await resetAdjustments(window);
  });

  test('清晰度（Unsharp Mask）：只在邊界產生 halo，平坦區不受影響', async () => {
    const { window } = ctx;
    await loadFixture(window, 'edge-midtone.png'); // 40x40，左半180，右半80，銳利邊界於 x=20

    await setAdjustment(window, 'sharpness', 50); // amount=0.5

    // 邊界亮側 x=19：laplacian=4*180-180-180-180-80=100 → 180+0.5*100=230
    const brightEdge = (await readCanvasPixel(window, 19, 20))[0];
    expect(brightEdge).toBeGreaterThanOrEqual(228);
    expect(brightEdge).toBeLessThanOrEqual(232);

    // 邊界暗側 x=20：laplacian=4*80-80-80-180-80=-100 → 80+0.5*(-100)=30
    const darkEdge = (await readCanvasPixel(window, 20, 20))[0];
    expect(darkEdge).toBeGreaterThanOrEqual(28);
    expect(darkEdge).toBeLessThanOrEqual(32);

    // 平坦內部（遠離邊界）不該被動到：x=5 與 x=35
    const flatBright = (await readCanvasPixel(window, 5, 20))[0];
    const flatDark = (await readCanvasPixel(window, 35, 20))[0];
    expect(flatBright).toBe(180);
    expect(flatDark).toBe(80);

    await resetAdjustments(window);
  });

  test('全程零 console error', async () => {
    expect(ctx.consoleErrors, `收集到的 console error:\n${ctx.consoleErrors.join('\n')}`).toEqual([]);
  });
});

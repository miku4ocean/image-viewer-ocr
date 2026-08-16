import { test, expect } from '@playwright/test';
import { LaunchedApp, launchApp, closeApp, loadFixture, readCanvasRegionAlpha } from './test-utils';

// ============================================================================
// 去背邊界品質驗收（魔術棒 flood-fill，app.js magicWandSelect()，本機真實運算非 mock）
//
// 驗兩種邊界情境：
//   1. 銳利邊界（左白右黑）：容差內只選到白色那半，黑色完全不動 → 逐 pixel 讀 alpha channel。
//   2. 漸層邊界（白→黑線性漸層）：預設容差(32)下應該「選到一部分、不是全選也不是全空」，
//      且加大容差後選取範圍要合理變大（單調、不會爆衝到整張圖）。
// 全部用 getImageData 讀 alpha channel 斷言，不目測。
// ============================================================================

async function enterMagicEraseMode(window: import('playwright').Page) {
  await window.locator('#btn-remove-bg').click();
  await expect(window.locator('#mask-edit-toolbar')).toBeVisible();
  await window.locator('#mask-tool-magic-erase').click();
  await expect(window.locator('#mask-tool-magic-erase')).toHaveClass(/active/);
}

test.describe.serial('去背邊界品質（魔術棒 flood-fill）', () => {
  let ctx: LaunchedApp;

  test.beforeAll(async () => {
    ctx = await launchApp('bg-boundary');
  });

  test.afterAll(async () => {
    await closeApp(ctx);
  });

  test('銳利邊界：只有白色區域被選取，黑色區域完全不動（逐 pixel 驗 alpha）', async () => {
    const { window } = ctx;
    await loadFixture(window, 'sharp-edge.png'); // 40x40，左半白(255) x<20，右半黑(0) x>=20

    await enterMagicEraseMode(window);

    const maskCanvasLocator = window.locator('#mask-edit-canvas');
    const maskBox = await maskCanvasLocator.boundingBox();
    if (!maskBox) throw new Error('mask-edit-canvas 找不到 bounding box');

    // 點擊左半白色區域
    await maskCanvasLocator.click({ position: { x: 5, y: 20 } });
    await expect(window.locator('.nordic-toast-container')).toContainText('已選取');

    // 逐 pixel 讀整列 y=20 的 alpha（x=0..39）
    const rowAlpha = await readCanvasRegionAlpha(window, 'mask-edit-canvas', 0, 20, 40, 1);
    expect(rowAlpha).toHaveLength(40);

    const whiteHalf = rowAlpha.slice(0, 20);
    const blackHalf = rowAlpha.slice(20, 40);
    // 白色那半：每個 pixel 都應該被標記進遮罩（alpha > 0）
    for (const a of whiteHalf) expect(a).toBeGreaterThan(0);
    // 黑色那半：完全不該被動到（alpha === 0，容差內色差 765 >> 96 閾值）
    for (const a of blackHalf) expect(a).toBe(0);

    // 套用去背，驗證最終圖片：左半完全透明、右半完全不透明
    await window.locator('#mask-edit-apply').click();
    await expect(window.locator('.nordic-toast-container')).toContainText('去背已套用');
    await expect(window.locator('#mask-edit-toolbar')).toBeHidden();

    const finalRowAlpha = await readCanvasRegionAlpha(window, 'image-canvas', 0, 20, 40, 1);
    for (const a of finalRowAlpha.slice(0, 20)) expect(a).toBe(0); // 左半去背 → alpha=0
    for (const a of finalRowAlpha.slice(20, 40)) expect(a).toBe(255); // 右半保留 → alpha=255
  });

  test('漸層邊界：預設容差選到「一部分」，加大容差後選取範圍合理變大', async () => {
    const { window } = ctx;
    await loadFixture(window, 'gradient.png'); // 100x20，x=0 白(255) 線性漸層到 x=99 黑(0)

    await enterMagicEraseMode(window);

    const maskCanvasLocator = window.locator('#mask-edit-canvas');

    // 預設容差 32（閾值 diff<=96）：點最亮端(x=2)
    await maskCanvasLocator.click({ position: { x: 2, y: 10 } });
    await expect(window.locator('.nordic-toast-container')).toContainText('已選取');

    const rowAlphaDefault = await readCanvasRegionAlpha(window, 'mask-edit-canvas', 0, 10, 100, 1);
    const selectedCountDefault = rowAlphaDefault.filter((a) => a > 0).length;

    // 不會整張都去掉：選取數遠小於總寬度
    expect(selectedCountDefault).toBeGreaterThan(0);
    expect(selectedCountDefault).toBeLessThan(50);
    // 理論邊界 x<=12（diff=3*(255-v)<=96 → v>=223 → x<=~12.4）
    expect(rowAlphaDefault[2]).toBeGreaterThan(0); // 亮端已選
    expect(rowAlphaDefault[50]).toBe(0); // 中段灰完全沒選到（不會整張都選）
    expect(rowAlphaDefault[99]).toBe(0); // 最暗端沒選到

    // 加大容差到上限 100（閾值 diff<=300 → v>=155 → x<=~38.8），同一點再點一次
    await window.locator('#mask-tolerance').evaluate((el: HTMLInputElement) => {
      el.value = '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await maskCanvasLocator.click({ position: { x: 2, y: 10 } });
    await expect(window.locator('.nordic-toast-container')).toContainText('已選取');

    const rowAlphaWide = await readCanvasRegionAlpha(window, 'mask-edit-canvas', 0, 10, 100, 1);
    const selectedCountWide = rowAlphaWide.filter((a) => a > 0).length;

    // 容差變大 → 選取範圍要單調變大（合理的容差行為），但仍不該整張全選
    expect(selectedCountWide).toBeGreaterThan(selectedCountDefault);
    expect(rowAlphaWide[35]).toBeGreaterThan(0); // 原本容差選不到的 x=35 現在選到了
    expect(rowAlphaWide[99]).toBe(0); // 最暗端無論如何都不該被選到（色差最大）

    await window.locator('#mask-edit-cancel').click();
    await expect(window.locator('#mask-edit-toolbar')).toBeHidden();
  });

  test('全程零 console error', async () => {
    expect(ctx.consoleErrors, `收集到的 console error:\n${ctx.consoleErrors.join('\n')}`).toEqual([]);
  });
});

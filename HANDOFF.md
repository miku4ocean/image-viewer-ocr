# HANDOFF — image-viewer-ocr
更新：2026-08-16／claude

## 目前目標
成熟的 macOS Electron 圖片工具，v1.4.0 已加入 OCR 語言選擇功能，持續維護與 bug fix 階段。

## 狀態
- 已完成：v1.4.0 OCR 語言選擇；濾鏡/調整/去背核心功能；README 更新至 v1.4.0
- 「v1.4.0 穩定」已驗證屬實：build 成功、Electron 主程序 headless smoke 通過（dev + 打包版皆可啟動並乾淨結束）
- 已修：package-lock.json 殘留舊版號 1.2.0（與 package.json 1.4.0 不一致），npm install 已同步為 1.4.0 並 commit
- 無硬編碼金鑰（grep 全專案僅命中無關的中文「設計標記」字樣）
- **Playwright Electron GUI 測試（`npm run test:e2e` = `playwright test`）**，
  現有 5 個 spec 檔、共 28 條測試，連跑兩次皆 28/28 綠、全程零 console error：
  - `tests/electron-app.spec.ts`（既有 7 條，原封不動未改）：啟動、開圖、濾鏡像素比對、
    OCR 語言傳遞(MOCK)、魔術棒去背(真實)、AI 自動選主體(MOCK)。
  - `tests/filter-accuracy.spec.ts`（新增 7 條）：曝光/對比/亮部/陰影/飽和度/清晰度
    調整滑桿的**數學正確性**——用純色/色帶/漸層測試圖手算期望值，逐 pixel 比對
    `getImageData` 實際輸出（含 clamp、方向性、閾值邊界）。
  - `tests/background-removal-boundary.spec.ts`（新增 3 條）：魔術棒 flood-fill 在
    銳利邊界（左白右黑）與漸層邊界下的選取範圍，逐 pixel 驗 alpha channel。
  - `tests/full-workflow.spec.ts`（新增 6 條）：完整操作路徑（啟動→開圖→調濾鏡→
    去背→OCR(mock)→匯出），匯出這步真的攔截 `will-download` 存檔到磁碟並驗證
    檔案非空，不是只驗 UI 有沒有跳 toast。
  - `tests/layout-responsive.spec.ts`（新增 5 條）：視窗尺寸 1000x700/1400x900/1920x1200
    下圖片不變形、工具列不溢出；另驗證 OCR 語言選擇彈窗（App 唯一的「語言」相關 UI，
    App 本身沒有中/英介面切換功能）在最小視窗下版面正常。
  - 新測試素材：`tests/fixtures/{gray128,tritone,sharp-edge,gradient,edge-midtone}.png`
    （Python PIL 產生的已知像素值合成圖，供公式手算比對用）。
  - 共用工具：`tests/test-utils.ts`（launchApp/loadFixture/setAdjustment/
    readCanvasPixel 等，供新 spec 共用，不影響既有 spec）。
- **2026-08-07 修 6 項 bug/功能缺失：**
  1. 頁尾版號 v1.0.0 → v1.4.0
  2. 移除每次渲染都觸發的 debug console.log
  3. file-input accept 補上 BMP/SVG MIME type（與 README 一致）
  4. saveImage 補上亮部/陰影調整（原本漏掉，存檔與畫面不一致）
  5. saveImage 將 CSS 濾鏡效果烘焙進輸出（原本存檔不含濾鏡）
  6. 清晰度滑桿實作 Unsharp Mask（原本有 UI 無效果），預覽與存檔皆生效
- **2026-08-16 擬真品質驗收（濾鏡數學／去背邊界／完整流程／版面），結論與發現：**
  - 濾鏡/調整（曝光/對比/亮部/陰影/飽和度/清晰度）公式手算逐 pixel 比對，**全部正確**，
    含 clamp、方向性、highlights/shadows 各自的 luminance 閾值（>128 / <128）都沒問題，
    沒抓到計算錯誤。
  - 魔術棒 flood-fill 邊界處理正確：銳利邊界不會誤吃鄰色，漸層邊界下容差(tolerance)
    對選取範圍的影響單調、合理（沒有「整張都去掉」或「整張都去不掉」的問題）。
  - 完整流程（含匯出）走通，匯出檔案落地且非空。過程中修掉一個**測試本身**的
    timing flakiness（OCR 框選 mousedown/mouseup 之間補等待，見 full-workflow.spec.ts
    註解），不是產品 bug。
  - **設計限制記錄（非 bug，供未來排查用）**：OCR 框選要求 `width>20 且 height>20`
    （app.js L2896），太細/太扁的圖裁不出合格 OCR 區域。
  - **查證結果**：這個 App 沒有 UI 介面語言切換（中/英）功能，只有 OCR 辨識語言勾選
    （既有測試 4 已覆蓋）；HANDOFF 任務單原先假設的「語言切換」已改用這個 App
    實際存在的語言相關 UI 驗證，細節見 layout-responsive.spec.ts 檔頭註解。

## 手動驗步驟（自動化測試涵蓋不到的部分，接手者仍需人工確認）
1. `npm install && npm start`，視窗開啟後手動開真實圖、套濾鏡看觀感、調整參數
2. 真實 OCR 準確度：Tesseract.js 引擎本身對真實照片文字的辨識品質（自動化測試已 mock 掉引擎，只驗證了語言參數傳遞邏輯）
3. 真實 AI 去背品質：`@imgly/background-removal` 對真實照片的去背效果（自動化測試已 mock 掉此外部模型；魔術棒/手動筆刷/復原重做這幾個本機功能可考慮之後補真實互動測試）
4. 若要發布：`npm run build`（已驗證成功，成功產出未簽署 dmg/zip，跑完已清掉 dist/）

## 地雷（別踩）
- 最新 commit 提到 `xattr` 安裝（`docs: 新增 xattr 安裝指令說明`），macOS Gatekeeper 問題需用此指令解除，見 README
- Electron 原生模組（tesseract.js 綁定）需 `electron-rebuild`，升級 Electron 版本後必跑
- `electron-builder` 打包設定在 package.json `build` 欄位，icon 路徑需存在 `assets/icon.icns`
- build 未簽署（無 Developer ID 憑證），輸出的 dmg/zip 僅供本機驗證，非發布用

## 主辦權
單線／待分派

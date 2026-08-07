# HANDOFF — image-viewer-ocr
更新：2026-08-07／claude

## 目前目標
成熟的 macOS Electron 圖片工具，v1.4.0 已加入 OCR 語言選擇功能，持續維護與 bug fix 階段。

## 狀態
- 已完成：v1.4.0 OCR 語言選擇；濾鏡/調整/去背核心功能；README 更新至 v1.4.0
- 「v1.4.0 穩定」已驗證屬實：build 成功、Electron 主程序 headless smoke 通過（dev + 打包版皆可啟動並乾淨結束）
- 已修：package-lock.json 殘留舊版號 1.2.0（與 package.json 1.4.0 不一致），npm install 已同步為 1.4.0 並 commit
- 無硬編碼金鑰（grep 全專案僅命中無關的中文「設計標記」字樣）
- **Playwright Electron GUI 測試（`tests/electron-app.spec.ts`，`npm run test:e2e`）**，
  連跑兩次皆 7/7 綠、全程零 console error。
  涵蓋範圍：啟動、開圖、濾鏡像素比對、OCR 語言傳遞(MOCK)、魔術棒去背(真實)、
  AI 自動選主體(MOCK)。測試素材 `tests/fixtures/sample.png`（40x40 純色合成圖）。
- **2026-08-07 修 6 項 bug/功能缺失：**
  1. 頁尾版號 v1.0.0 → v1.4.0
  2. 移除每次渲染都觸發的 debug console.log
  3. file-input accept 補上 BMP/SVG MIME type（與 README 一致）
  4. saveImage 補上亮部/陰影調整（原本漏掉，存檔與畫面不一致）
  5. saveImage 將 CSS 濾鏡效果烘焙進輸出（原本存檔不含濾鏡）
  6. 清晰度滑桿實作 Unsharp Mask（原本有 UI 無效果），預覽與存檔皆生效

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

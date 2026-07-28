# HANDOFF — image-viewer-ocr
更新：2026-07-28／claude

## 目前目標
成熟的 macOS Electron 圖片工具，v1.4.0 已加入 OCR 語言選擇功能，持續維護與 bug fix 階段。

## 狀態
- 已完成：v1.4.0 OCR 語言選擇；濾鏡/調整/去背核心功能；README 更新至 v1.4.0
- 「v1.4.0 穩定」已驗證屬實：build 成功、Electron 主程序 headless smoke 通過（dev + 打包版皆可啟動並乾淨結束）
- 已修：package-lock.json 殘留舊版號 1.2.0（與 package.json 1.4.0 不一致），npm install 已同步為 1.4.0 並 commit
- 無硬編碼金鑰（grep 全專案僅命中無關的中文「設計標記」字樣）
- **新增：Playwright Electron GUI 測試（`tests/electron-app.spec.ts`，`npm run test:e2e`）**，
  連跑兩次皆 7/7 綠、全程零 console error；只加了 devDependency（`@playwright/test`、
  `playwright`）與 tests/，沒動應用邏輯；`npm run build` 驗證仍成功（跑完已清 dist/）。
  涵蓋範圍：
  1. App 啟動零例外、主視窗出現
  2. 開圖（`<input type="file">`，本 App 沒有原生開檔對話框）
  3. 濾鏡調整：套用 CSS filter 後渲染像素真的改變（offscreen canvas 取樣比對）
  4. OCR 語言選擇：checkbox UI 狀態 → 真的傳進 `Tesseract.recognize()` 的語言字串正確
     （**MOCK**：Tesseract.js 原本從 jsdelivr CDN 載入，測試攔截該請求換成假引擎，
     瞬間回傳固定文字，只驗證「UI → 呼叫參數」整合，不驗證辨識準確度）
  5. AI 去背 - 魔術棒：本機 flood-fill 演算法，**真實運算**（非 mock），驗證 mask
     canvas 與套用後主圖的 alpha 真的改變
  6. AI 去背 - 自動選主體：**MOCK**（`autoSelectSubject()` 用動態
     `import('https://esm.sh/@imgly/background-removal@1.4.5')` 載入外部大型 AI 模型，
     測試攔截該 import 換成假模組，只驗證按鈕→動態載入→產生遮罩預覽的整合流程）
  測試素材是 `tests/fixtures/sample.png`（40×40 純色合成圖，非真實照片）。

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

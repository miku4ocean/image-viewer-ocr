# HANDOFF — image-viewer-ocr
更新：2026-07-21／claude

## 目前目標
成熟的 macOS Electron 圖片工具，v1.4.0 已加入 OCR 語言選擇功能，持續維護與 bug fix 階段。

## 狀態
- 已完成：v1.4.0 OCR 語言選擇；濾鏡/調整/去背核心功能；README 更新至 v1.4.0
- 「v1.4.0 穩定」已驗證屬實：build 成功、Electron 主程序 headless smoke 通過（dev + 打包版皆可啟動並乾淨結束）
- 已修：package-lock.json 殘留舊版號 1.2.0（與 package.json 1.4.0 不一致），npm install 已同步為 1.4.0 並 commit
- 無硬編碼金鑰（grep 全專案僅命中無關的中文「設計標記」字樣）
- 無 lint/test script（package.json 未定義，非本次引入，維持現況）

## 手動驗步驟（GUI 互動無法自動化，接手者需人工確認）
1. `npm install && npm start`，視窗開啟後手動開圖、套濾鏡、調整參數
2. 手動測試 OCR：框選文字區 → 語言選擇彈窗 → 勾繁中/簡中/日/韓/英任一組合 → 辨識 → 複製/存 TXT
3. 手動測試 AI 去背：自動選主體、魔術棒、手動筆刷、復原/重做
4. 若要發布：`npm run build`（本次驗證已跑過一次，成功產出未簽署 dmg/zip，跑完已清掉 dist/）

## 地雷（別踩）
- 最新 commit 提到 `xattr` 安裝（`docs: 新增 xattr 安裝指令說明`），macOS Gatekeeper 問題需用此指令解除，見 README
- Electron 原生模組（tesseract.js 綁定）需 `electron-rebuild`，升級 Electron 版本後必跑
- `electron-builder` 打包設定在 package.json `build` 欄位，icon 路徑需存在 `assets/icon.icns`
- build 未簽署（無 Developer ID 憑證），輸出的 dmg/zip 僅供本機驗證，非發布用

## 主辦權
單線／待分派

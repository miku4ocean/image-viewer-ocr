# HANDOFF — image-viewer-ocr
更新：2026-07-05／claude

## 目前目標
成熟的 macOS Electron 圖片工具，v1.4.0 已加入 OCR 語言選擇功能，持續維護與 bug fix 階段。

## 狀態
- 已完成：v1.4.0 OCR 語言選擇；濾鏡/調整/去背核心功能；README 更新至 v1.4.0
- 進行中：工作區乾淨，無未 commit 修改
- 驗收現況：未驗證（Electron app 需手動啟動確認）

## 下一步（接手的人從這裡開始）
1. `npm install` 後 `npm run start` 確認 Electron 視窗正常啟動
2. 測試 OCR 語言切換功能（需 Tesseract 語言包已安裝）
3. 若準備發布，執行 `npm run build` 產出 `.dmg`

## 地雷（別踩）
- 最新 commit 提到 `xattr` 安裝（`docs: 新增 xattr 安裝指令說明`），macOS Gatekeeper 問題需用此指令解除，見 README
- Electron 原生模組（tesseract.js 綁定）需 `electron-rebuild`，升級 Electron 版本後必跑
- `electron-builder` 打包設定在 package.json `build` 欄位，icon 路徑需存在 `assets/icon.icns`

## 主辦權
單線／待分派

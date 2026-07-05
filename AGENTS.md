# image-viewer-ocr — 薄索引
跨平台規則正本：`~/.agents/institution/`（先讀 core/PRINCIPLES.md，照其指示附版本標記）。

## 專案專屬
- Build/test 指令：`npm run start`（Electron 開發）、`npm run build`（打包 macOS DMG）
- 架構一句話：Electron 桌面應用，圖片瀏覽 + 濾鏡調整 + Tesseract OCR 文字辨識 + AI 去背（macOS 優先）
- 本專案禁區：不得依賴需要網路的 OCR 服務（本地離線是核心賣點）

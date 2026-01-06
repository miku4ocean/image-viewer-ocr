# Image Viewer OCR - 圖片檢視器

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Image Viewer OCR Icon">
</p>

<p align="center">
  <strong>專業級圖片編輯工具 - 支援濾鏡、調整、OCR文字辨識、AI去背</strong>
</p>

<p align="center">
  <a href="#功能特色">功能特色</a> •
  <a href="#線上使用">線上使用</a> •
  <a href="#安裝方式">安裝方式</a> •
  <a href="#使用教學">使用教學</a> •
  <a href="#快捷鍵">快捷鍵</a>
</p>

---

## 📁 專案結構

```
image-viewer-ocr/
├── index.html              # 主程式
├── app.js                  # JavaScript 邏輯
├── styles.css              # 樣式表
├── nordic-design-system.css # 設計系統
├── electron-main.js        # Electron 主程式
├── package.json            # Node.js 設定
├── assets/                 # 圖示資源
│   ├── icon.png
│   └── icon.icns
├── releases/               # Mac 安裝檔
│   └── Image Viewer OCR-1.2.3-arm64.dmg
└── dist/                   # 打包輸出（自動生成）
```

---

## 功能特色

### 🖼️ 圖片檢視
- 支援 JPG、PNG、GIF、WebP、BMP、SVG 等常見格式
- 高品質縮放與平移
- 適合視窗自動縮放

### 🎨 濾鏡效果
- **12 種專業濾鏡**：原圖、黑白、復古、暖色、冷色、懷舊、對比、褪色、野獸、模糊、銳利、雲彩
- 即時預覽效果
- 一鍵套用

### ⚙️ 圖片調整
- **曝光**：調整整體亮度
- **對比**：增強明暗對比
- **亮部/陰影**：精確控制高光和暗部
- **飽和度**：調整色彩鮮豔度
- **色溫**：調整冷暖色調
- **色調**：微調整體色彩
- **褪色調**：加入復古感
- **清晰度**：增強細節銳利度
- **自動色階**：一鍵智慧最佳化

### ✂️ 裁切功能
- 自由比例裁切
- 多種預設比例（1:1、4:3、16:9 等）
- 旋轉 90° / 180° / 270°
- 水平/垂直翻轉
- **裁切框邊界限制**：不會超出圖片範圍

### 📐 尺寸調整
- 自訂寬高尺寸
- 鏈結比例保持
- 支援 DPI 設定
- **狀態列顯示 DPI**

### 📝 OCR 文字辨識
- **支援多語言**：繁體中文、簡體中文、英文、日文
- 框選區域辨識
- 一鍵複製文字
- 高精度辨識引擎

### 🎭 AI 智慧去背
- **AI 自動選取主體**：一鍵偵測人物/物體輪廓
- **魔術棒智慧選取**：根據顏色相似度選取區域
- **手動精修筆刷**：恢復/移除筆刷精確控制
- **遮罩歷史記錄**：獨立的上一步/下一步功能
- **即時預覽**：綠色=保留，紅色=移除
- **完全本地處理**：不上傳任何資料

---

## 🔗 相關連結

| 項目 | 網址 |
|------|------|
| **🌐 網頁版（線上使用）** | https://miku4ocean.github.io/image-viewer-ocr/ |
| **📂 GitHub 原始碼** | https://github.com/miku4ocean/image-viewer-ocr |
| **📥 Mac 安裝檔下載** | https://github.com/miku4ocean/image-viewer-ocr/releases |
| **💾 本地安裝檔** | `releases/Image Viewer OCR-1.2.3-arm64.dmg` |

---

## 線上使用

### 🌐 GitHub Pages 網頁版

直接在瀏覽器中使用，無需安裝：

**網址**：https://miku4ocean.github.io/image-viewer-ocr/

**系統需求**：
- 現代瀏覽器（Chrome、Firefox、Safari、Edge）
- 建議使用 Chrome 以獲得最佳 AI 去背效能

---

## 安裝方式

### 💻 Mac 桌面版

#### 方式一：從 GitHub Releases 下載
1. 前往 [Releases 頁面](https://github.com/miku4ocean/image-viewer-ocr/releases)
2. 下載最新版 DMG 安裝檔
3. 開啟 DMG 檔案
4. 將 **Image Viewer OCR** 拖曳到 **Applications** 資料夾

#### 方式二：從本地資料夾安裝
1. 安裝檔位置：`releases/Image Viewer OCR-1.2.3-arm64.dmg`
2. 雙擊開啟 DMG 檔案
3. 將 **Image Viewer OCR** 拖曳到 **Applications** 資料夾
4. 從 Launchpad 或 Applications 資料夾啟動

**首次開啟注意事項**：
如果出現「無法打開」的提示，請到 **系統設定 > 隱私權與安全性**，點擊「仍要打開」。

---

## 使用教學

### 基本操作

1. **開啟圖片**
   - 點擊「📂 開啟」按鈕
   - 或直接拖曳圖片到視窗中
   - 支援 Ctrl+O / Cmd+O 快捷鍵

2. **套用濾鏡**
   - 左側面板選擇濾鏡
   - 即時預覽效果

3. **調整參數**
   - 右側「調整」面板
   - 拖動滑桿調整各項參數
   - 點擊「重置」恢復預設值

4. **儲存圖片**
   - 點擊「💾 儲存」按鈕
   - 支援 PNG、JPG、WebP 格式
   - 可選擇品質設定

### AI 去背教學

1. **進入去背模式**
   - 開啟圖片後，點擊工具列「🖼️ 去背」按鈕

2. **AI 自動選取**
   - 點擊「🎯 自動選主體」讓 AI 偵測主體
   - 等待 AI 分析完成（首次使用需下載模型）
   - 綠色區域 = 保留的主體
   - 紅色區域 = 將被移除的背景

3. **手動精修**
   - **🖌️ 恢復筆刷**：塗抹被誤刪的區域
   - **🧹 移除筆刷**：塗抹多餘的區域
   - 調整「筆刷」大小控制塗抹範圍

4. **魔術棒智慧選取**
   - **✨ 魔棒+**：點擊相似顏色區域加入主體
   - **🪄 魔棒-**：點擊相似顏色區域加入去背區
   - 調整「容差」控制顏色相似度閾值

5. **歷史操作**
   - **↩️** 復原上一步遮罩編輯
   - **↪️** 重做遮罩編輯
   - 最多保留 30 步歷史

6. **完成去背**
   - 點擊「套用」確認去背效果
   - 或點擊「取消」放棄編輯

### OCR 文字辨識教學

1. 開啟包含文字的圖片
2. 點擊「📝 文字辨識」按鈕
3. 在圖片上框選要辨識的區域
4. 等待辨識完成
5. 點擊「複製」將文字複製到剪貼簿

---

## 快捷鍵

| 功能 | Mac | Windows |
|------|-----|---------|
| 開啟檔案 | ⌘ + O | Ctrl + O |
| 儲存檔案 | ⌘ + S | Ctrl + S |
| 復原 | ⌘ + Z | Ctrl + Z |
| 重做 | ⌘ + Shift + Z | Ctrl + Y |
| 放大 | ⌘ + = | Ctrl + = |
| 縮小 | ⌘ + - | Ctrl + - |
| 適合視窗 | ⌘ + 0 | Ctrl + 0 |

---

## 開發指南

### 本地開發

```bash
# 進入專案目錄
cd image-viewer-ocr

# 安裝相依套件
npm install

# 啟動本地伺服器（網頁版）
npm run serve
# 開啟瀏覽器訪問 http://localhost:3456

# 啟動 Electron 開發模式
npm start

# 打包 Mac 版本
npm run build:dmg
# 輸出位置：dist/Image Viewer OCR-x.x.x-arm64.dmg
```

### 主要檔案

- **網頁版入口**：`index.html`
- **主程式邏輯**：`app.js`
- **樣式表**：`styles.css`
- **Mac 安裝檔**：`releases/Image Viewer OCR-x.x.x-arm64.dmg`

---

## 版本歷史

### v1.2.3 (2026-01-05)
- 修復：Mac 版儲存對話框重複問題

### v1.2.2 (2026-01-05)
- 修復：調整尺寸後狀態列 DPI 正確更新

### v1.2.1 (2026-01-05)
- 優化：裁切效能大幅提升（5分鐘→1秒）
- 修復：裁切後畫布正確縮小
- 修復：裁切框邊界限制
- 修復：按 Enter 正確裁切
- 新增：狀態列顯示 DPI

### v1.2.0 (2026-01-04)
- 新增：AI 智慧去背
- 新增：魔術棒選取工具
- 新增：遮罩歷史記錄

---

## 技術資訊

### 使用技術
- **前端**：純 HTML5 / CSS3 / JavaScript
- **AI 去背**：@imgly/background-removal（本地處理）
- **OCR 引擎**：Tesseract.js
- **桌面版**：Electron

### 隱私保護
- ✅ 所有圖片處理完全在本地進行
- ✅ 不上傳任何圖片資料到伺服器
- ✅ AI 模型在瀏覽器/應用程式中執行
- ✅ 開源程式碼可供審查

---

## 授權

MIT License - 可自由使用、修改、分發

---

## 問題回報

如果發現任何問題或有功能建議，歡迎到 [Issues](https://github.com/miku4ocean/image-viewer-ocr/issues) 提交回報。

---

<p align="center">
  Made with ❤️ by miku4ocean
</p>

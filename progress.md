# progress.md — image-viewer-ocr

> 本檔由 Galley 交付規格（GALLEY_SPEC.md）產生，內容基於實際讀取的 HANDOFF.md／AGENTS.md／README.md／package.json／index.html／app.js／electron-main.js。查不到之處一律標「未確認」，不臆造。

---

## A. 專案名稱
Image Viewer OCR（image-viewer-ocr）

## B. 專案路徑
`/Users/leonalin/Code/image-viewer-ocr`

## C. 專案簡介
一套 macOS 優先的桌面圖片編輯工具（Electron App），同時也能以純靜態網頁形式執行（GitHub Pages / `npm run serve`，同一份 `index.html` + `app.js`）。提供圖片濾鏡、參數調整、裁切、尺寸調整、OCR 文字辨識（Tesseract.js）與 AI 智慧去背（@imgly/background-removal）等功能，且明確宣稱「完全本地處理，不上傳任何資料」。目前版本 v1.4.0，處於「持續維護與 bug fix」階段（HANDOFF.md）。

## D. 專案開發目的
依 README／AGENTS.md 可確認的產品定位：
- 提供一套**免費、離線可用**的圖片編輯＋文字擷取工具，取代「開圖只是為了截圖存證、複製圖上文字」這類瑣碎但常見的需求。
- 刻意選擇「本機運算」而非雲端 OCR／去背服務，換取隱私與離線可用性（AGENTS.md 明文：「不得依賴需要網路的 OCR 服務（本地離線是核心賣點）」）。
- 更深層的開發動機（例如是否對應特定使用情境或使用者需求訪談）：**未確認**，文件中未記錄。

## E. 解決使用者痛點
依功能與文件內容推斷（非逐字引用調查資料）：
- 圖片裡的文字（截圖、掃描頁、外語標示）想直接複製出來使用，不想手動打字，也不想把圖片上傳到不明的線上 OCR 網站。
- 想去背但不想安裝大型專業修圖軟體，也不想把人像／私人圖片上傳給雲端去背 API。
- 想要簡單濾鏡／曝光調整，不需要 Photoshop 等級的複雜度。
- 想要一個「開箱即用」的桌面工具，不用註冊帳號、不用網路連線（首次載入 OCR／去背函式庫模型除外）。

## F. 專案功能細項介紹
**圖片檢視**
- 支援 JPG、PNG、GIF、WebP、BMP、SVG；縮放與平移；適合視窗自動縮放。

**濾鏡**（實際程式碼確認為 **24 種**，含「原圖」；README 原寫「12 種」，已於 2026-07-25 更正為 24 種並同步實際名稱）
- 原圖、黑白、復古、暖色、冷色、懷舊、戲劇、褪色、鮮豔、模糊、銳利、暈影、負片、素描、賽博龐克、夕陽、海洋、森林、玫瑰、金色、金屬、黑色電影、夢幻、普普。

**圖片調整**（9 項滑桿＋1 鍵自動）
- 曝光、對比、亮部、陰影、飽和度、色溫、色調、褐色調、清晰度；「自動色階」一鍵最佳化。

**裁切**
- 自由比例／預設比例；旋轉 90°/180°/270°；水平垂直翻轉；裁切框邊界限制；鍵盤操作（Enter 確認／Esc 取消／R 重置）。

**尺寸調整**
- 快速縮放（0.5×／1×／2×／4×）；自訂寬高＋鏈結比例；放大品質（標準／平滑／銳利）；DPI 設定（72～600）。

**OCR 文字辨識**（Tesseract.js，CDN 載入）
- 框選文字區域 → 語言選擇彈窗（繁中／簡中／日文／韓文／英文，可複選）→ 辨識 → 結果面板（可複製或存為 TXT）。

**AI 智慧去背**（@imgly/background-removal，動態載入）
- AI 自動選取主體／背景；手動恢復／移除筆刷；魔術棒（依顏色相似度，容差可調）；遮罩歷史最多 30 步；即時預覽（綠＝保留、紅＝移除）。

**其他**
- 拖曳開檔、鍵盤快捷鍵（開啟／儲存／復原重做／縮放）；狀態列顯示檔名／尺寸／DPI／縮放；設定按鈕（⚙️）存在於工具列但無實作，2026-07-25 已改為 `disabled`＋tooltip「設定（開發中）」，避免使用者誤認按鈕壞掉。

## G. 專案規格及 RPD

**技術棧**
- 前端：純 HTML5／CSS3／JavaScript（`index.html` 641 行、`app.js` 3,262 行、`styles.css` 1,469 行、`nordic-design-system.css` 自製設計系統）。
- 桌面殼層：Electron ^28.0.0（`electron-main.js`，`BrowserWindow` + 選單，`nodeIntegration:false`／`contextIsolation:true`／`webSecurity:true`）。
- 打包：electron-builder ^24.9.1（`npm run build` → macOS dmg/zip，**未簽署**，僅供本機驗證）。
- OCR：Tesseract.js 5（透過 `<script src="https://cdn.jsdelivr.net/...">` 載入）。
- AI 去背：@imgly/background-removal 1.4.5（透過 `import('https://esm.sh/...')` 動態載入）。
- 無框架（無 React/Vue）、無建置工具（無 webpack/vite）、無測試框架（package.json 未定義 test script）、無 lint 設定。

**埠／指令**
- `npm start` — Electron 開發模式。
- `npm run serve` — `npx serve -l 3456 .`，網頁版開發伺服器，`http://localhost:3456`。
- `npm run build` — `electron-builder --mac`（dmg + zip）。
- `npm run build:dmg` — 只出 dmg。

**資料流**
- 使用者操作（開檔／濾鏡／調整／裁切／OCR／去背）全部發生於同一個 `state` 物件（單一狀態源）與 `<canvas>` 像素運算；無 fetch/XHR、無 localStorage、無 `ipcRenderer`（原始碼 grep 確認）。
- 存檔一律走 `Blob + URL.createObjectURL + <a download>`，即使在 Electron 內也沒有走原生 `dialog`／`ipcMain`——與網頁版共用同一套存檔機制。
- Electron 選單（開啟／儲存／復原／重做）透過 `webContents.executeJavaScript()` 直接呼叫頁面內同名函式，屬於較輕量、非典型的 IPC 設計（沒有 preload 橋接層）。

**RPD（需求／產品定義）備註**
- 明文禁區（AGENTS.md）：「不得依賴需要網路的 OCR 服務」。
- 明文賣點（README）：「所有圖片處理完全在本地進行」「不上傳任何圖片資料到伺服器」。
- 版本／發佈：v1.4.0（2026-01-07），`releases/` 內含 1.2.3～1.4.0 共 11 個本機 dmg（`.gitignore` 已排除 `releases/`，故這些安裝檔不進版控，僅本機留存；正式發布走 GitHub Releases，見 README 連結）。

## H. 目前已完成項目
- v1.4.0：OCR 語言選擇彈窗（繁中／簡中／日／韓／英，可複選）。
- 濾鏡（24 種）、9 項調整參數＋自動色階、裁切（含邊界限制與鍵盤操作）、尺寸調整（快速縮放／DPI／放大品質）核心功能。
- AI 智慧去背：自動選主體／選背景、手動筆刷、魔術棒、遮罩歷史（最多 30 步）。
- README 已更新至 v1.4.0；package-lock.json 版號已與 package.json 同步（HANDOFF.md 記錄此為近期修復項）。
- Electron 主程序 headless smoke 測試通過（dev 與打包版皆可啟動並乾淨結束，依 HANDOFF.md 記錄）。
- 全專案已 grep 確認無硬編碼金鑰。
- `npm run build` 已驗證可成功產出未簽署 dmg/zip（驗證後已清除 `dist/`）。
- 2026-07-25：README 濾鏡數由「12 種」更正為實際的「24 種」並同步名稱清單（其餘數字宣稱——遮罩歷史 30 步、OCR 五語言、v1.4.0、port 3456——逐一比對程式碼確認無誤）。
- 2026-07-25：設定（⚙️）按鈕加上 `disabled` 與 tooltip「設定（開發中）」（index.html）；HTML 以解析器驗證標籤配對完整。

## I. 尚待完成項目
- **設定（⚙️）功能本體未實作**：按鈕已於 2026-07-25 改為 `disabled`＋「開發中」tooltip（依 J 段規劃的功能範圍保留入口；docs/architecture 圖亦已畫入此入口），實際設定面板（預設 OCR 語言、預設存檔格式、快捷鍵自訂等）仍待開發。
- **應用程式未經 Apple 簽署**：發佈的 dmg/zip 需要使用者手動 `xattr -cr` 解除 Gatekeeper 隔離，屬已知限制而非 bug（README／HANDOFF.md 已記錄），但如需正式對外發佈仍待取得 Developer ID 憑證並簽署／公證。
- **無自動化測試／無 lint**：package.json 未定義 `test`／`lint` script，HANDOFF.md 明確記錄「維持現況、非本次引入」，代表這是已知但延後處理的技術債。
- **GUI 手動驗證仍需人工**：HANDOFF.md 列出的驗證步驟（開圖／濾鏡／OCR／去背）皆為手動操作，無自動化 UI 測試覆蓋，交接者仍須人工確認。
- **原生模組相依風險**：HANDOFF.md 提醒 Electron 版本升級後，Tesseract.js 相關原生模組綁定需要重跑 `electron-rebuild`，屬於維護時容易忽略的地雷。
- **主辦權「單線／待分派」**（HANDOFF.md 原文）：目前沒有指定的長期維護者／分工安排。

## J. 系統優化或增加功能建議
以下為依現況觀察提出的建議，非既有規劃文件內容，供後續評估：
- 把「設定」按鈕的功能範圍定義出來（例如：預設 OCR 語言組合記憶、預設存檔格式、快捷鍵自訂）並實作；按鈕已先以 `disabled`＋「開發中」tooltip 處理（2026-07-25），實作完成後移除 disabled 即可。
- 補上最基本的自動化測試（例如針對純函式的濾鏡／調整運算模組），降低往後升級 Electron／Tesseract.js 版本時的回歸風險。
- 存檔目前完全依賴瀏覽器 `<a download>` 機制，在 Electron 內其實可以改用原生「另存新檔」對話框（`dialog.showSaveDialog`），提升桌面版的原生體驗（目前是刻意與網頁版共用同一套機制，但也犧牲了部分桌面體驗）。
- 若要正式對外發佈 Mac 安裝檔，需規劃 Apple Developer ID 簽署與公證流程，取代目前「需使用者手動 xattr」的暫時方案。
- 可考慮把 OCR／去背函式庫改為隨應用程式打包（而非執行期才從 CDN／esm.sh 載入），讓 Electron 桌面版在完全離線（含第一次使用）情境下也能運作，更貼合「本地離線是核心賣點」的定位。

---

## 附錄：無既有 PROGRESS.md／progress.md 需合併
本專案根目錄原本沒有大小寫不敏感的 `PROGRESS.md`／`progress.md`，本檔為全新建立，無需附錄合併既有內容。

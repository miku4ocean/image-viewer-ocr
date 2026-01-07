/**
 * Image Viewer OCR - 主應用程式
 * 圖片檢視器，支援影像處理、濾鏡和 OCR 文字辨識
 */

// ========================================
// 1. 應用程式狀態
// ========================================
const state = {
    // 圖片狀態
    originalImage: null,
    currentImage: null,
    imageWidth: 0,
    imageHeight: 0,
    fileName: '',
    fileExtension: 'png',

    // 歷史記錄（用於上一步/下一步）
    history: [],
    historyIndex: -1,
    maxHistory: 20,

    // 編輯狀態
    zoom: 1,
    activeFilter: 'none',
    adjustments: {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        sepia: 0,
        sharpness: 0
    },

    // 裁切狀態
    isCropping: false,
    cropRect: { x: 0, y: 0, width: 0, height: 0 },

    // OCR 狀態
    isOCRMode: false,
    isSelectingOCRRegion: false,
    ocrRegion: null,
    ocrWords: [],
    ocrLanguage: 'chi_tra+jpn+eng', // 預設多語言（繁中+日文+英文）
    selectedText: '',

    // 去背編輯狀態
    isMaskEditing: false,
    maskBrushMode: 'none', // 'none', 'restore', 'erase', 'magic-restore', 'magic-erase'
    maskBrushSize: 30,
    maskTolerance: 32, // 魔術棒顏色容差（0-255）
    imageBeforeRemoveBg: null, // 去背前的原始圖片（用於恢復筆刷）

    // 尺寸調整
    maintainRatio: true,
    aspectRatio: 1,
    dpi: 300,

    // 畫布拖曳模式
    isDragMode: false
};

// ========================================
// 2. DOM 元素
// ========================================
const elements = {
    // 主要區域
    welcomeScreen: document.getElementById('welcome-screen'),
    editorContainer: document.getElementById('editor-container'),
    canvasArea: document.getElementById('canvas-area'),
    imageCanvas: document.getElementById('image-canvas'),
    imageViewport: document.getElementById('image-viewport'),
    imageViewportInner: document.getElementById('image-viewport-inner'),

    // 工具列按鈕
    btnOpen: document.getElementById('btn-open'),
    btnSave: document.getElementById('btn-save'),
    btnClose: document.getElementById('btn-close'),
    btnCrop: document.getElementById('btn-crop'),
    btnResize: document.getElementById('btn-resize'),
    btnRemoveBg: document.getElementById('btn-remove-bg'),
    btnOcr: document.getElementById('btn-ocr'),
    btnSelectFile: document.getElementById('btn-select-file'),
    fileInput: document.getElementById('file-input'),

    // 歷史記錄按鈕
    btnUndo: document.getElementById('btn-undo'),
    btnRedo: document.getElementById('btn-redo'),

    // 濾鏡
    filterGrid: document.getElementById('filter-grid'),

    // 調整滑桿
    sliders: {
        exposure: document.getElementById('slider-exposure'),
        contrast: document.getElementById('slider-contrast'),
        highlights: document.getElementById('slider-highlights'),
        shadows: document.getElementById('slider-shadows'),
        saturation: document.getElementById('slider-saturation'),
        temperature: document.getElementById('slider-temperature'),
        tint: document.getElementById('slider-tint'),
        sepia: document.getElementById('slider-sepia'),
        sharpness: document.getElementById('slider-sharpness')
    },
    values: {
        exposure: document.getElementById('value-exposure'),
        contrast: document.getElementById('value-contrast'),
        highlights: document.getElementById('value-highlights'),
        shadows: document.getElementById('value-shadows'),
        saturation: document.getElementById('value-saturation'),
        temperature: document.getElementById('value-temperature'),
        tint: document.getElementById('value-tint'),
        sepia: document.getElementById('value-sepia'),
        sharpness: document.getElementById('value-sharpness')
    },
    btnAutoAdjust: document.getElementById('btn-auto-adjust'),
    btnResetAdjustments: document.getElementById('btn-reset-adjustments'),

    // 縮放
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomFit: document.getElementById('btn-zoom-fit'),
    zoomLevel: document.getElementById('zoom-level'),

    // 裁切
    cropOverlay: document.getElementById('crop-overlay'),
    cropArea: document.getElementById('crop-area'),

    // OCR
    ocrOverlay: document.getElementById('ocr-overlay'),
    ocrTextLayer: document.getElementById('ocr-text-layer'),
    ocrResultPanel: document.getElementById('ocr-result-panel'),
    ocrTextOutput: document.getElementById('ocr-text-output'),
    ocrLanguageSelect: document.getElementById('ocr-language-select'),
    btnCopyText: document.getElementById('btn-copy-text'),
    btnSaveText: document.getElementById('btn-save-text'),
    btnCloseOcrPanel: document.getElementById('btn-close-ocr-panel'),

    // OCR 區域選擇
    ocrRegionOverlay: document.getElementById('ocr-region-overlay'),
    ocrRegionBox: document.getElementById('ocr-region-box'),

    // 去背編輯
    maskEditOverlay: document.getElementById('mask-edit-overlay'),
    maskEditCanvas: document.getElementById('mask-edit-canvas'),
    maskEditToolbar: document.getElementById('mask-edit-toolbar'),
    maskToolbarDrag: document.getElementById('mask-toolbar-drag'),
    maskToolNone: document.getElementById('mask-tool-none'),
    maskToolAutoSubject: document.getElementById('mask-tool-auto-subject'),
    maskToolAutoBg: document.getElementById('mask-tool-auto-bg'),
    maskToolRestore: document.getElementById('mask-tool-restore'),
    maskToolErase: document.getElementById('mask-tool-erase'),
    maskToolMagicRestore: document.getElementById('mask-tool-magic-restore'),
    maskToolMagicErase: document.getElementById('mask-tool-magic-erase'),
    maskBrushSize: document.getElementById('mask-brush-size'),
    maskBrushSizeValue: document.getElementById('mask-brush-size-value'),
    maskTolerance: document.getElementById('mask-tolerance'),
    maskToleranceValue: document.getElementById('mask-tolerance-value'),
    maskUndo: document.getElementById('mask-undo'),
    maskRedo: document.getElementById('mask-redo'),
    maskEditClear: document.getElementById('mask-edit-clear'),
    maskEditCancel: document.getElementById('mask-edit-cancel'),
    maskEditApply: document.getElementById('mask-edit-apply'),

    // 尺寸調整對話框
    resizeModal: document.getElementById('resize-modal'),
    resizeWidth: document.getElementById('resize-width'),
    resizeHeight: document.getElementById('resize-height'),
    resizeLink: document.getElementById('resize-link'),
    resizeMaintainRatio: document.getElementById('resize-maintain-ratio'),
    resizeDpi: document.getElementById('resize-dpi'),
    resizeCancel: document.getElementById('resize-cancel'),
    resizeApply: document.getElementById('resize-apply'),
    resizeModalClose: document.getElementById('resize-modal-close'),

    // 畫布導航
    canvasNav: document.getElementById('canvas-nav'),
    navUp: document.getElementById('nav-up'),
    navDown: document.getElementById('nav-down'),
    navLeft: document.getElementById('nav-left'),
    navRight: document.getElementById('nav-right'),
    navHand: document.getElementById('nav-hand'),

    // 狀態
    statusText: document.getElementById('status-text'),
    imageInfo: document.getElementById('image-info'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    toastContainer: document.getElementById('toast-container')
};

const ctx = elements.imageCanvas.getContext('2d');

// ========================================
// 3. 工具函數
// ========================================

// 顯示 Toast 通知
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `nordic-toast nordic-toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${message}`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 顯示/隱藏載入中
function showLoading(text = '處理中...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('nordic-hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('nordic-hidden');
}

// 更新狀態列
function updateStatus(text) {
    elements.statusText.textContent = text;
}

// 更新圖片資訊
function updateImageInfo() {
    if (state.originalImage) {
        // 顯示 DPI（如果有設定）
        const dpiText = state.dpi ? ` | ${state.dpi} DPI` : '';
        // 估算檔案大小（假設未壓縮 RGB）
        const estimatedSizeMB = ((state.imageWidth * state.imageHeight * 3) / (1024 * 1024)).toFixed(1);
        elements.imageInfo.textContent = `${state.fileName} | ${state.imageWidth} × ${state.imageHeight} px${dpiText}`;
    } else {
        elements.imageInfo.textContent = '';
    }
}

// 啟用/停用工具按鈕
function updateToolbarState(enabled) {
    elements.btnSave.disabled = !enabled;
    if (elements.btnClose) elements.btnClose.disabled = !enabled;
    elements.btnCrop.disabled = !enabled;
    elements.btnResize.disabled = !enabled;
    elements.btnRemoveBg.disabled = !enabled;
    elements.btnOcr.disabled = !enabled;
    if (elements.btnUndo) elements.btnUndo.disabled = !enabled || state.historyIndex <= 0;
    if (elements.btnRedo) elements.btnRedo.disabled = !enabled || state.historyIndex >= state.history.length - 1;
}

// 取得檔案副檔名
function getFileExtension(filename) {
    const match = filename.match(/\.([^.]+)$/);
    if (match) {
        const ext = match[1].toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
            return ext;
        }
    }
    return 'png';
}

// ========================================
// 4. 歷史記錄管理
// ========================================

function saveToHistory() {
    // 如果不在歷史末端，移除後面的記錄並清理 Blob URLs
    if (state.historyIndex < state.history.length - 1) {
        // 釋放被移除記錄的 Blob URLs
        for (let i = state.historyIndex + 1; i < state.history.length; i++) {
            if (state.history[i] && state.history[i].blobUrl) {
                URL.revokeObjectURL(state.history[i].blobUrl);
            }
        }
        state.history = state.history.slice(0, state.historyIndex + 1);
    }

    // 使用 toBlob 儲存當前狀態（非同步但更快）
    const canvas = document.createElement('canvas');
    canvas.width = state.imageWidth;
    canvas.height = state.imageHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.originalImage, 0, 0);

    canvas.toBlob((blob) => {
        if (!blob) {
            console.error('Failed to create blob for history');
            return;
        }

        const blobUrl = URL.createObjectURL(blob);

        state.history.push({
            blobUrl: blobUrl,
            width: state.imageWidth,
            height: state.imageHeight
        });

        // 限制歷史記錄數量
        if (state.history.length > state.maxHistory) {
            const removed = state.history.shift();
            if (removed && removed.blobUrl) {
                URL.revokeObjectURL(removed.blobUrl);
            }
        } else {
            state.historyIndex++;
        }

        updateToolbarState(true);
    }, 'image/png');

    // 立即更新索引（非同步保存會在稍後完成）
    // 暫時允許 UI 響應
    updateToolbarState(true);
}

function undo() {
    if (state.historyIndex <= 0) return;

    state.historyIndex--;
    restoreFromHistory(state.historyIndex);
    showToast('已還原');
}

function redo() {
    if (state.historyIndex >= state.history.length - 1) return;

    state.historyIndex++;
    restoreFromHistory(state.historyIndex);
    showToast('已重做');
}

function restoreFromHistory(index) {
    const record = state.history[index];
    if (!record) return;

    const img = new Image();
    img.onload = () => {
        state.originalImage = img;
        state.imageWidth = record.width;
        state.imageHeight = record.height;
        state.aspectRatio = record.width / record.height;

        fitImageToViewport();
        applyAllEffects();
        updateImageInfo();
        updateToolbarState(true);
    };
    // 支援舊格式 (imageData) 和新格式 (blobUrl)
    img.src = record.blobUrl || record.imageData;
}

// ========================================
// 4.5 關閉圖片和重置狀態
// ========================================

function closeImage() {
    // 清理 Blob URLs
    state.history.forEach(record => {
        if (record && record.blobUrl) {
            URL.revokeObjectURL(record.blobUrl);
        }
    });

    // 重置所有狀態
    state.originalImage = null;
    state.currentImage = null;
    state.imageWidth = 0;
    state.imageHeight = 0;
    state.fileName = '';
    state.fileExtension = 'png';
    state.history = [];
    state.historyIndex = -1;
    state.zoom = 1;
    state.activeFilter = 'none';
    state.isCropping = false;
    state.isOCRMode = false;
    state.isMaskEditing = false;
    state.dpi = 300;
    state.aspectRatio = 1;

    // 重置調整值
    resetAdjustments();

    // 清空畫布
    const canvas = elements.imageCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 隱藏編輯器，顯示歡迎畫面
    elements.editorContainer.classList.add('nordic-hidden');
    elements.welcomeScreen.classList.remove('nordic-hidden');

    // 更新 UI
    updateToolbarState(false);
    updateImageInfo();
    updateStatus('已關閉圖片');

    // 重置檔案輸入，允許選擇同一個檔案
    elements.fileInput.value = '';

    showToast('圖片已關閉');
}

// ========================================
// 5. 圖片載入和顯示
// ========================================

function loadImage(file) {
    // 檢查是否為 HEIC/HEIF 檔案
    const isHeic = file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif') ||
        file.type === 'image/heic' ||
        file.type === 'image/heif';

    // 檢測是否在 Electron 環境中
    const isElectron = navigator.userAgent.toLowerCase().includes('electron');

    // Web 版不支援 HEIC，只有 Mac App 支援
    if (isHeic && !isElectron) {
        showToast('Web 版不支援 HEIC 格式，請使用 Mac App 版本或先將檔案轉成 JPEG', 'error', 6000);
        return;
    }

    if (!file || (!file.type.startsWith('image/') && !isHeic)) {
        showToast('請選擇有效的圖片檔案', 'error');
        return;
    }

    showLoading('載入圖片中...');

    // Electron 環境或非 HEIC 檔案：直接載入（macOS 原生支援 HEIC）

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            state.originalImage = img;
            state.currentImage = img;
            state.imageWidth = img.width;
            state.imageHeight = img.height;
            state.fileName = file.name;
            state.fileExtension = getFileExtension(file.name);
            state.aspectRatio = img.width / img.height;

            // 清空並初始化歷史記錄
            state.history = [];
            state.historyIndex = -1;
            saveToHistory();

            // 重置調整值
            resetAdjustments();

            // 顯示編輯器
            elements.welcomeScreen.classList.add('nordic-hidden');
            elements.editorContainer.classList.remove('nordic-hidden');

            // 繪製圖片
            fitImageToViewport();
            applyAllEffects();

            // 更新 UI
            updateToolbarState(true);
            updateImageInfo();
            updateStatus('圖片已載入');
            hideLoading();

            showToast('圖片載入成功');
        };
        img.onerror = () => {
            hideLoading();
            showToast('無法載入圖片', 'error');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// HEIC/HEIF 檔案轉換
async function convertHeicAndLoad(file) {
    showLoading('載入 HEIC 檔案中...');

    // 首先嘗試直接載入（Safari 和某些瀏覽器原生支援 HEIC）
    const directLoadSuccess = await tryDirectLoad(file);
    if (directLoadSuccess) {
        return;
    }

    // 直接載入失敗，使用 heic2any 轉換
    showLoading('轉換 HEIC 格式中...');

    try {
        // 嘗試使用 heic-to 函式庫（對新版 iOS 支援更好）
        showLoading('下載 HEIC 轉換程式...');

        // 嘗試 heic-to（較新的函式庫，支援 iOS 18+）
        try {
            if (typeof heicTo === 'undefined') {
                await loadScript('https://cdn.jsdelivr.net/npm/heic-to@1/dist/heic-to.min.js');
            }

            showLoading('轉換中，請稍候...');
            const blob = await heicTo.heic2jpeg(file, 0.92);
            await loadBlobAsImage(blob, file.name);
            return;
        } catch (e1) {
            console.log('heic-to failed, trying heic2any...', e1);
        }

        // 回退到 heic2any
        try {
            if (typeof heic2any === 'undefined') {
                await loadScript('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js');
            }

            showLoading('轉換中，請稍候...');
            const result = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.92
            });

            const blob = Array.isArray(result) ? result[0] : result;
            await loadBlobAsImage(blob, file.name);
            return;
        } catch (e2) {
            console.log('heic2any also failed', e2);
            throw e2;
        }

    } catch (error) {
        console.error('HEIC conversion error:', error);
        hideLoading();

        // 提供更詳細的錯誤訊息和替代方案
        showToast('HEIC 轉換失敗。建議使用 Mac App 版本，或先用「預覽程式」將 HEIC 轉成 JPEG', 'error', 8000);
    }
}

// 從 Blob 載入圖片
function loadBlobAsImage(blob, originalFileName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                state.currentImage = img;
                state.imageWidth = img.width;
                state.imageHeight = img.height;
                state.fileName = originalFileName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
                state.fileExtension = 'jpg';
                state.aspectRatio = img.width / img.height;

                state.history = [];
                state.historyIndex = -1;
                saveToHistory();
                resetAdjustments();

                elements.welcomeScreen.classList.add('nordic-hidden');
                elements.editorContainer.classList.remove('nordic-hidden');

                fitImageToViewport();
                applyAllEffects();
                updateToolbarState(true);
                updateImageInfo();
                updateStatus('HEIC 圖片已載入');
                hideLoading();

                showToast('HEIC 圖片載入成功');
                resolve();
            };
            img.onerror = () => {
                hideLoading();
                showToast('無法載入轉換後的圖片', 'error');
                reject(new Error('Image load failed'));
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// 動態載入腳本
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // 檢查是否已載入
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 嘗試直接載入圖片（用於測試瀏覽器是否原生支援 HEIC）
function tryDirectLoad(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 成功載入
                state.originalImage = img;
                state.currentImage = img;
                state.imageWidth = img.width;
                state.imageHeight = img.height;
                state.fileName = file.name;
                state.fileExtension = getFileExtension(file.name);
                state.aspectRatio = img.width / img.height;

                state.history = [];
                state.historyIndex = -1;
                saveToHistory();
                resetAdjustments();

                elements.welcomeScreen.classList.add('nordic-hidden');
                elements.editorContainer.classList.remove('nordic-hidden');

                fitImageToViewport();
                applyAllEffects();
                updateToolbarState(true);
                updateImageInfo();
                updateStatus('圖片已載入');
                hideLoading();
                showToast('HEIC 圖片載入成功');
                resolve(true);
            };
            img.onerror = () => {
                // 載入失敗，需要轉換
                resolve(false);
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            resolve(false);
        };
        reader.readAsDataURL(file);
    });
}


function fitImageToViewport() {
    if (!state.originalImage) return;

    const viewport = elements.imageViewport;
    const maxWidth = viewport.clientWidth - 48;
    const maxHeight = viewport.clientHeight - 48;

    const scale = Math.min(
        maxWidth / state.imageWidth,
        maxHeight / state.imageHeight,
        1
    );

    state.zoom = scale;
    updateZoomDisplay();
    renderCanvas();
}

function updateZoomDisplay() {
    elements.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function renderCanvas() {
    const width = Math.round(state.imageWidth * state.zoom);
    const height = Math.round(state.imageHeight * state.zoom);

    elements.imageCanvas.width = width;
    elements.imageCanvas.height = height;

    ctx.drawImage(state.originalImage, 0, 0, width, height);

    // Update viewport layout for proper scrolling
    updateViewportLayout();

    // Update crop area if cropping (so it follows zoom changes)
    if (state.isCropping) {
        updateCropArea();
    }

    // Update mask canvas if in mask editing mode
    if (state.isMaskEditing) {
        updateMaskCanvasSize();
    }
}

// Update viewport inner container size for proper scrolling
function updateViewportLayout() {
    const viewport = elements.imageViewport;
    const inner = elements.imageViewportInner;
    const canvas = elements.imageCanvas;

    if (!viewport || !inner || !canvas) return;

    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Padding around the canvas
    const padding = 48;

    // Always set explicit size:
    // - At minimum, viewport size (for centering small images)
    // - Or canvas + padding (for scrolling large images)
    const innerWidth = Math.max(viewportWidth, canvasWidth + padding);
    const innerHeight = Math.max(viewportHeight, canvasHeight + padding);

    inner.style.width = innerWidth + 'px';
    inner.style.height = innerHeight + 'px';

    // Debug logging
    console.log('Viewport layout:', {
        viewport: { w: viewportWidth, h: viewportHeight },
        canvas: { w: canvasWidth, h: canvasHeight },
        inner: { w: innerWidth, h: innerHeight },
        scrollable: { x: innerWidth > viewportWidth, y: innerHeight > viewportHeight }
    });
}

// ========================================
// 6. 影像處理效果
// ========================================

const filters = {
    none: '',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(80%)',
    warm: 'sepia(20%) saturate(140%) hue-rotate(-10deg)',
    cool: 'saturate(80%) hue-rotate(20deg)',
    vintage: 'sepia(40%) contrast(90%) brightness(95%)',
    dramatic: 'contrast(130%) saturate(120%)',
    fade: 'contrast(80%) brightness(110%) saturate(80%)',
    // 第一批新增濾鏡
    vivid: 'saturate(180%) contrast(110%)',
    blur: 'blur(2px)',
    sharpen: 'contrast(120%) brightness(105%)',
    vignette: 'brightness(95%) contrast(105%)',
    invert: 'invert(100%)',
    sketch: 'grayscale(100%) contrast(150%) brightness(120%)',
    // 第二批新增濾鏡
    cyberpunk: 'saturate(200%) hue-rotate(180deg) contrast(120%)',
    sunset: 'sepia(30%) saturate(150%) hue-rotate(-20deg) brightness(105%)',
    ocean: 'saturate(120%) hue-rotate(180deg) brightness(95%)',
    forest: 'saturate(110%) hue-rotate(60deg) brightness(95%)',
    rose: 'saturate(130%) hue-rotate(-30deg) brightness(105%)',
    golden: 'sepia(50%) saturate(150%) brightness(110%)',
    chrome: 'saturate(0%) contrast(140%) brightness(110%)',
    noir: 'grayscale(100%) contrast(150%) brightness(90%)',
    dream: 'saturate(80%) brightness(115%) contrast(85%) blur(0.5px)',
    pop: 'saturate(200%) contrast(150%) brightness(105%)'
};

function applyAllEffects() {
    if (!state.originalImage) return;

    renderCanvas();

    const imageData = ctx.getImageData(0, 0, elements.imageCanvas.width, elements.imageCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 曝光
        if (state.adjustments.exposure !== 0) {
            const exp = state.adjustments.exposure / 100 * 0.5 + 1;
            r *= exp;
            g *= exp;
            b *= exp;
        }

        // 對比
        if (state.adjustments.contrast !== 0) {
            const con = (state.adjustments.contrast / 100) * 0.5 + 1;
            r = (r - 128) * con + 128;
            g = (g - 128) * con + 128;
            b = (b - 128) * con + 128;
        }

        // 亮部/陰影
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (state.adjustments.highlights !== 0 && luminance > 128) {
            const factor = (luminance - 128) / 127;
            const adj = state.adjustments.highlights / 100 * 0.5 * factor;
            r *= (1 + adj);
            g *= (1 + adj);
            b *= (1 + adj);
        }
        if (state.adjustments.shadows !== 0 && luminance < 128) {
            const factor = (128 - luminance) / 128;
            const adj = state.adjustments.shadows / 100 * 0.5 * factor;
            r *= (1 + adj);
            g *= (1 + adj);
            b *= (1 + adj);
        }

        // 飽和度
        if (state.adjustments.saturation !== 0) {
            const sat = state.adjustments.saturation / 100 + 1;
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = gray + sat * (r - gray);
            g = gray + sat * (g - gray);
            b = gray + sat * (b - gray);
        }

        // 色溫
        if (state.adjustments.temperature !== 0) {
            const temp = state.adjustments.temperature / 100 * 30;
            r += temp;
            b -= temp;
        }

        // 色調
        if (state.adjustments.tint !== 0) {
            const tint = state.adjustments.tint / 100 * 30;
            g += tint;
        }

        // 褐色調
        if (state.adjustments.sepia !== 0) {
            const sep = state.adjustments.sepia / 100;
            const tr = 0.393 * r + 0.769 * g + 0.189 * b;
            const tg = 0.349 * r + 0.686 * g + 0.168 * b;
            const tb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = r * (1 - sep) + tr * sep;
            g = g * (1 - sep) + tg * sep;
            b = b * (1 - sep) + tb * sep;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);
    elements.imageCanvas.style.filter = filters[state.activeFilter] || '';
}

function autoAdjust() {
    if (!state.originalImage) return;

    showLoading('自動調整中...');

    renderCanvas();
    const imageData = ctx.getImageData(0, 0, elements.imageCanvas.width, elements.imageCanvas.height);
    const data = imageData.data;

    let minL = 255, maxL = 0;
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
        minL = Math.min(minL, l);
        maxL = Math.max(maxL, l);
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
    }

    const avgL = (totalR + totalG + totalB) / (pixelCount * 3);

    state.adjustments.exposure = Math.round((128 - avgL) / 2);
    state.adjustments.contrast = Math.round((255 / (maxL - minL + 1) - 1) * 30);

    state.adjustments.exposure = Math.max(-50, Math.min(50, state.adjustments.exposure));
    state.adjustments.contrast = Math.max(-30, Math.min(30, state.adjustments.contrast));

    updateSliderValues();
    applyAllEffects();

    hideLoading();
    showToast('已套用自動色階');
}

function resetAdjustments() {
    state.adjustments = {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        sepia: 0,
        sharpness: 0
    };
    state.activeFilter = 'none';

    updateSliderValues();
    updateFilterSelection();
    applyAllEffects();
}

function updateSliderValues() {
    Object.keys(state.adjustments).forEach(key => {
        if (elements.sliders[key]) {
            elements.sliders[key].value = state.adjustments[key];
        }
        if (elements.values[key]) {
            elements.values[key].textContent = state.adjustments[key];
        }
    });
}

function updateFilterSelection() {
    document.querySelectorAll('.filter-item').forEach(item => {
        item.classList.toggle('active', item.dataset.filter === state.activeFilter);
    });
}

// ========================================
// 7. 裁切功能（改進版）
// ========================================

function startCrop() {
    if (!state.originalImage || state.isCropping) return;

    state.isCropping = true;
    elements.btnCrop.classList.add('active');
    elements.cropOverlay.classList.remove('nordic-hidden');

    // 初始化裁切區域
    const canvas = elements.imageCanvas;
    const margin = 0.1;
    state.cropRect = {
        x: canvas.width * margin,
        y: canvas.height * margin,
        width: canvas.width * (1 - 2 * margin),
        height: canvas.height * (1 - 2 * margin)
    };

    updateCropArea();
    updateStatus('拖曳調整裁切區域，按 Enter 確認 / Esc 取消 / R 重置');
}

function updateCropArea() {
    const crop = elements.cropArea;
    const canvas = elements.imageCanvas;
    const viewport = elements.imageViewport;

    if (!canvas || !crop) return;

    // 取得 canvas 和 viewport 的位置
    const canvasRect = canvas.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    // 計算 canvas 相對於 viewport 的偏移（考慮滾動）
    const offsetX = canvasRect.left - viewportRect.left + viewport.scrollLeft;
    const offsetY = canvasRect.top - viewportRect.top + viewport.scrollTop;

    // cropRect 已經是基於 canvas 顯示尺寸的座標，不需要額外縮放
    crop.style.left = (state.cropRect.x + offsetX) + 'px';
    crop.style.top = (state.cropRect.y + offsetY) + 'px';
    crop.style.width = state.cropRect.width + 'px';
    crop.style.height = state.cropRect.height + 'px';
}

function resetCropArea() {
    if (!state.isCropping) return;

    const canvas = elements.imageCanvas;
    const margin = 0.1;
    state.cropRect = {
        x: canvas.width * margin,
        y: canvas.height * margin,
        width: canvas.width * (1 - 2 * margin),
        height: canvas.height * (1 - 2 * margin)
    };
    updateCropArea();
    showToast('裁切區域已重置');
}

function applyCrop() {
    if (!state.isCropping) return;

    showLoading('裁切中...');

    // 使用 requestAnimationFrame 確保 UI 更新
    requestAnimationFrame(() => {
        setTimeout(() => {
            try {
                const scaleX = state.imageWidth / elements.imageCanvas.width;
                const scaleY = state.imageHeight / elements.imageCanvas.height;

                const cropX = Math.round(state.cropRect.x * scaleX);
                const cropY = Math.round(state.cropRect.y * scaleY);
                const cropW = Math.round(state.cropRect.width * scaleX);
                const cropH = Math.round(state.cropRect.height * scaleY);

                // 建立臨時畫布並裁切
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = cropW;
                tempCanvas.height = cropH;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(state.originalImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                // 使用 toBlob 比 toDataURL 更快
                tempCanvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        URL.revokeObjectURL(url);

                        state.originalImage = img;
                        state.imageWidth = cropW;
                        state.imageHeight = cropH;
                        state.aspectRatio = cropW / cropH;

                        // 儲存到歷史記錄
                        saveToHistory();

                        cancelCrop();
                        fitImageToViewport();
                        applyAllEffects();
                        updateImageInfo();
                        hideLoading();
                        showToast('裁切完成');
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(url);
                        hideLoading();
                        showToast('裁切失敗', 'error');
                    };
                    img.src = url;
                }, 'image/png');
            } catch (error) {
                console.error('Crop error:', error);
                hideLoading();
                showToast('裁切失敗: ' + error.message, 'error');
            }
        }, 50); // 短暫延遲確保 loading 顯示
    });
}

function cancelCrop() {
    state.isCropping = false;
    elements.btnCrop.classList.remove('active');
    elements.cropOverlay.classList.add('nordic-hidden');
    updateStatus('就緒');
}

// ========================================
// 8. 尺寸調整
// ========================================

function openResizeModal() {
    if (!state.originalImage) return;

    // 使用原始圖片的自然尺寸，確保顯示正確的當前尺寸
    const currentWidth = state.originalImage.naturalWidth || state.originalImage.width;
    const currentHeight = state.originalImage.naturalHeight || state.originalImage.height;

    elements.resizeWidth.value = currentWidth;
    elements.resizeHeight.value = currentHeight;
    state.maintainRatio = elements.resizeMaintainRatio.checked;

    // 同步更新 state 中的尺寸，確保一致性
    state.imageWidth = currentWidth;
    state.imageHeight = currentHeight;
    state.aspectRatio = currentWidth / currentHeight;

    elements.resizeModal.classList.remove('nordic-hidden');
}

function closeResizeModal() {
    elements.resizeModal.classList.add('nordic-hidden');
}

function applyResize() {
    const newWidth = parseInt(elements.resizeWidth.value);
    const newHeight = parseInt(elements.resizeHeight.value);
    const newDpi = parseInt(elements.resizeDpi.value) || 72;
    const qualityMode = document.getElementById('resize-quality')?.value || 'smooth';

    if (!newWidth || !newHeight || newWidth < 1 || newHeight < 1) {
        showToast('請輸入有效的尺寸', 'error');
        return;
    }

    // 檢查尺寸限制 - Canvas 最大約 16384px 或 100 百萬像素
    const maxDimension = 16384;
    const maxPixels = 100000000; // 100 MP
    const totalPixels = newWidth * newHeight;

    if (newWidth > maxDimension || newHeight > maxDimension) {
        showToast(`尺寸過大！單邊最大 ${maxDimension}px`, 'error');
        return;
    }

    if (totalPixels > maxPixels) {
        const maxMp = Math.floor(maxPixels / 1000000);
        showToast(`圖片過大！最大約 ${maxMp} 百萬像素`, 'error');
        return;
    }

    showLoading('調整尺寸中...');

    // 使用 requestAnimationFrame 確保 loading 顯示
    requestAnimationFrame(() => {
        setTimeout(() => {
            try {
                let resultCanvas;

                if (qualityMode === 'sharp' && newWidth > state.imageWidth) {
                    // 銳利模式：使用多步驟放大 + 銳化處理（適合文字）
                    resultCanvas = upscaleSharp(state.originalImage, newWidth, newHeight);
                } else if (qualityMode === 'smooth') {
                    // 平滑模式：高品質插值
                    resultCanvas = upscaleSmooth(state.originalImage, newWidth, newHeight);
                } else {
                    // 標準模式：快速處理
                    resultCanvas = upscaleStandard(state.originalImage, newWidth, newHeight);
                }

                const img = new Image();
                img.onload = () => {
                    state.originalImage = img;
                    state.imageWidth = newWidth;
                    state.imageHeight = newHeight;
                    state.aspectRatio = newWidth / newHeight;
                    state.dpi = newDpi;

                    saveToHistory();
                    closeResizeModal();
                    fitImageToViewport();
                    applyAllEffects();
                    updateImageInfo();
                    hideLoading();
                    showToast(`尺寸已調整為 ${newWidth} × ${newHeight} (${newDpi} DPI)`);
                };
                img.src = resultCanvas.toDataURL();
            } catch (error) {
                console.error('Resize error:', error);
                hideLoading();
                showToast('調整尺寸失敗', 'error');
            }
        }, 50);
    });
}

// 標準放大（快速）
function upscaleStandard(sourceImage, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
    return canvas;
}

// 平滑放大（適合照片）
function upscaleSmooth(sourceImage, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
    return canvas;
}

// 銳利放大（適合文字/線條）- 使用多步驟放大 + 銳化
function upscaleSharp(sourceImage, targetWidth, targetHeight) {
    const sourceWidth = sourceImage.width || sourceImage.naturalWidth;
    const sourceHeight = sourceImage.height || sourceImage.naturalHeight;
    const scaleX = targetWidth / sourceWidth;
    const scaleY = targetHeight / sourceHeight;
    const scale = Math.max(scaleX, scaleY);

    // 如果放大倍數大於 2，使用漸進式放大
    if (scale > 2) {
        // 分步放大，每次最多 2 倍
        let currentCanvas = document.createElement('canvas');
        currentCanvas.width = sourceWidth;
        currentCanvas.height = sourceHeight;
        let currentCtx = currentCanvas.getContext('2d');
        currentCtx.drawImage(sourceImage, 0, 0);

        let currentWidth = sourceWidth;
        let currentHeight = sourceHeight;

        while (currentWidth < targetWidth || currentHeight < targetHeight) {
            const nextWidth = Math.min(currentWidth * 2, targetWidth);
            const nextHeight = Math.min(currentHeight * 2, targetHeight);

            const nextCanvas = document.createElement('canvas');
            nextCanvas.width = nextWidth;
            nextCanvas.height = nextHeight;
            const nextCtx = nextCanvas.getContext('2d');
            nextCtx.imageSmoothingEnabled = true;
            nextCtx.imageSmoothingQuality = 'high';
            nextCtx.drawImage(currentCanvas, 0, 0, nextWidth, nextHeight);

            currentCanvas = nextCanvas;
            currentWidth = nextWidth;
            currentHeight = nextHeight;
        }

        // 應用銳化
        return applySharpen(currentCanvas);
    } else {
        // 直接放大並銳化
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
        return applySharpen(canvas);
    }
}

// 銳化處理（Unsharp Mask）
function applySharpen(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // 複製原始資料
    const original = new Uint8ClampedArray(data);

    // Unsharp mask 參數
    const amount = 0.5; // 銳化強度

    // 簡化的銳化核心（3x3 Laplacian）
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            for (let c = 0; c < 3; c++) {
                // 計算拉普拉斯邊緣
                const center = original[idx + c];
                const top = original[((y - 1) * width + x) * 4 + c];
                const bottom = original[((y + 1) * width + x) * 4 + c];
                const left = original[(y * width + (x - 1)) * 4 + c];
                const right = original[(y * width + (x + 1)) * 4 + c];

                const laplacian = 4 * center - top - bottom - left - right;

                // 應用銳化
                data[idx + c] = Math.max(0, Math.min(255, center + amount * laplacian));
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// ========================================
// 8.5 背景移除（純前端 AI 處理，不上傳資料）
// ========================================

// 快取載入的函式庫
let imglyRemoveBackground = null;
// 儲存 AI 生成的遮罩
let aiGeneratedMask = null;

// 點擊「去背」按鈕進入編輯模式（預覽模式）
// 如果已經在編輯模式，再按一次會重置工具列位置
function removeBackground() {
    if (!state.originalImage) return;

    // 如果已經在去背編輯模式，重置工具列位置
    if (state.isMaskEditing) {
        resetToolbarPosition();
        showToast('工具列已重置到預設位置');
        return;
    }

    // 保存原始圖片
    state.imageBeforeRemoveBg = state.originalImage;

    // 進入去背編輯模式（預覽模式）
    startMaskEditMode();

    updateStatus('去背編輯模式 - 使用 AI 選取或手動精修');
    showToast('已進入去背模式。點擊「自動選主體」或手動繪製區域。');
}

// AI 自動選取主體
async function autoSelectSubject() {
    if (!state.imageBeforeRemoveBg) return;

    showLoading('準備分析圖片...');
    updateStatus('AI 正在分析主體...');

    // 動畫進度（模型載入時）
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
        if (fakeProgress < 15) {
            fakeProgress += 0.5;
            elements.loadingText.textContent = `載入 AI 模型... ${Math.round(fakeProgress)}%`;
        }
    }, 100);

    try {
        // 動態載入函式庫（第一次使用時）
        if (!imglyRemoveBackground) {
            try {
                const module = await import('https://esm.sh/@imgly/background-removal@1.4.5');
                imglyRemoveBackground = module.default || module.removeBackground;
            } catch (loadError) {
                clearInterval(progressInterval);
                console.error('Failed to load background removal library:', loadError);
                hideLoading();
                showToast('無法載入 AI 模型，請檢查網路連線', 'error');
                return;
            }
        }

        clearInterval(progressInterval);

        // 將原始圖片轉換為 Blob
        const canvas = document.createElement('canvas');
        canvas.width = state.imageWidth;
        canvas.height = state.imageHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(state.imageBeforeRemoveBg, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        // 使用 imgly 背景移除
        const resultBlob = await imglyRemoveBackground(blob, {
            progress: (key, current, total) => {
                if (key === 'compute:inference') {
                    const percent = Math.round((current / total) * 100);
                    elements.loadingText.textContent = `AI 分析中... ${percent}%`;
                } else if (key === 'fetch:model') {
                    const percent = Math.round((current / total) * 100);
                    elements.loadingText.textContent = `下載模型... ${Math.round(15 + percent * 0.3)}%`;
                }
            }
        });

        // 將結果轉換為圖片用於生成遮罩
        const resultUrl = URL.createObjectURL(resultBlob);
        const resultImg = new Image();

        resultImg.onload = () => {
            // 創建遮罩：比較原圖和去背後的透明度
            generateMaskFromResult(resultImg);

            URL.revokeObjectURL(resultUrl);
            hideLoading();
            updateStatus('AI 選取完成 - 綠色區域為主體，紅色區域將被移除');
            showToast('AI 已選取主體！綠色=保留，紅色=移除。可手動精修後點擊「套用去背」。');
        };

        resultImg.onerror = () => {
            hideLoading();
            showToast('AI 分析失敗', 'error');
            URL.revokeObjectURL(resultUrl);
        };

        resultImg.src = resultUrl;

    } catch (error) {
        clearInterval(progressInterval);
        console.error('Background removal error:', error);
        hideLoading();

        if (error.message && error.message.includes('WebGPU')) {
            showToast('您的瀏覽器不支援 WebGPU，請使用最新版 Chrome', 'error');
        } else {
            showToast('AI 分析失敗: ' + error.message, 'error');
        }
        updateStatus('AI 分析失敗');
    }
}

// 從 AI 結果生成遮罩預覽
function generateMaskFromResult(resultImg) {
    if (!maskCtx) return;

    const maskCanvas = elements.maskEditCanvas;
    const maskWidth = maskCanvas.width;
    const maskHeight = maskCanvas.height;

    // 取得 AI 結果圖片的實際尺寸
    const resultWidth = resultImg.width;
    const resultHeight = resultImg.height;

    // 創建臨時 canvas 來讀取 AI 結果（使用結果圖片的原始尺寸）
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = resultWidth;
    tempCanvas.height = resultHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(resultImg, 0, 0);

    const resultData = tempCtx.getImageData(0, 0, resultWidth, resultHeight);

    // 清除現有遮罩
    maskCtx.clearRect(0, 0, maskWidth, maskHeight);

    // 閾值設定 - alpha > 10 視為主體
    const subjectThreshold = 10;

    // 計數器用於除錯
    let subjectCount = 0;
    let bgCount = 0;

    // 遍歷遮罩畫布的每個像素
    for (let my = 0; my < maskHeight; my++) {
        for (let mx = 0; mx < maskWidth; mx++) {
            // 計算在 AI 結果圖片中對應的位置
            const rx = Math.floor(mx * resultWidth / maskWidth);
            const ry = Math.floor(my * resultHeight / maskHeight);

            const idx = (ry * resultWidth + rx) * 4;
            const alpha = resultData.data[idx + 3];

            if (alpha >= subjectThreshold) {
                // 主體 - 綠色半透明
                maskCtx.fillStyle = 'rgba(94, 161, 118, 0.4)';
                subjectCount++;
            } else {
                // 背景 - 紅色半透明
                maskCtx.fillStyle = 'rgba(209, 105, 105, 0.5)';
                bgCount++;
            }
            maskCtx.fillRect(mx, my, 1, 1);
        }
    }

    console.log(`AI 遮罩生成: 主體像素=${subjectCount}, 背景像素=${bgCount}, 結果圖片尺寸=${resultWidth}x${resultHeight}`);

    // 儲存 AI 遮罩供後續使用
    aiGeneratedMask = maskCtx.getImageData(0, 0, maskWidth, maskHeight);

    // 保存到歷史記錄
    saveMaskToHistory();
}

// AI 自動選取背景（反轉選取）
async function autoSelectBackground() {
    await autoSelectSubject();
    // 反轉遮罩顏色
    if (maskCtx && aiGeneratedMask) {
        const data = aiGeneratedMask.data;
        for (let i = 0; i < data.length; i += 4) {
            // 交換紅色和綠色
            const r = data[i];
            const g = data[i + 1];
            data[i] = g;
            data[i + 1] = r;
        }
        maskCtx.putImageData(aiGeneratedMask, 0, 0);
        showToast('已選取背景區域（反轉選取）');
    }
}

// 魔術棒選取 - 根據顏色相似度選取區域
function magicWandSelect(x, y, isRestore) {
    if (!state.imageBeforeRemoveBg || !maskCtx) return;

    const maskCanvas = elements.maskEditCanvas;
    const tolerance = state.maskTolerance;

    // 取得原始圖片資料
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.imageWidth;
    tempCanvas.height = state.imageHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(state.imageBeforeRemoveBg, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, state.imageWidth, state.imageHeight);

    // 計算點擊位置在原圖中的座標
    const scaleX = state.imageWidth / maskCanvas.width;
    const scaleY = state.imageHeight / maskCanvas.height;
    const imgX = Math.floor(x * scaleX);
    const imgY = Math.floor(y * scaleY);

    // 取得點擊位置的顏色
    const startIdx = (imgY * state.imageWidth + imgX) * 4;
    const startR = imageData.data[startIdx];
    const startG = imageData.data[startIdx + 1];
    const startB = imageData.data[startIdx + 2];

    // 顏色比較函數
    function colorMatch(idx) {
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        const diff = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB);
        return diff <= tolerance * 3; // 乘以 3 因為有 RGB 三個通道
    }

    // Flood fill 演算法
    const visited = new Set();
    const stack = [[imgX, imgY]];
    const selectedPixels = [];

    while (stack.length > 0) {
        const [px, py] = stack.pop();

        // 邊界檢查
        if (px < 0 || px >= state.imageWidth || py < 0 || py >= state.imageHeight) continue;

        const key = py * state.imageWidth + px;
        if (visited.has(key)) continue;
        visited.add(key);

        const idx = key * 4;
        if (!colorMatch(idx)) continue;

        // 記錄選中的像素
        selectedPixels.push([px, py]);

        // 加入相鄰像素
        stack.push([px + 1, py]);
        stack.push([px - 1, py]);
        stack.push([px, py + 1]);
        stack.push([px, py - 1]);
    }

    // 在遮罩上繪製選取區域
    const maskScaleX = maskCanvas.width / state.imageWidth;
    const maskScaleY = maskCanvas.height / state.imageHeight;

    const fillColor = isRestore ? 'rgba(94, 161, 118, 0.6)' : 'rgba(209, 105, 105, 0.6)';
    maskCtx.fillStyle = fillColor;

    for (const [px, py] of selectedPixels) {
        const mx = Math.floor(px * maskScaleX);
        const my = Math.floor(py * maskScaleY);
        maskCtx.fillRect(mx, my, Math.ceil(maskScaleX), Math.ceil(maskScaleY));
    }

    // 保存到歷史記錄
    saveMaskToHistory();

    const action = isRestore ? '加入主體' : '加入去背區';
    showToast(`已選取 ${selectedPixels.length} 個像素${action}`);
}

// ========================================
// 8.6 去背編輯模式
// ========================================

let maskCtx = null;

// 遮罩歷史記錄（獨立於主要圖片歷史）
let maskHistory = [];
let maskHistoryIndex = -1;
const MAX_MASK_HISTORY = 30;

// 保存遮罩狀態到歷史
function saveMaskToHistory() {
    if (!maskCtx) return;

    const canvas = elements.maskEditCanvas;
    const imageData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

    // 如果不是在最新位置，移除之後的歷史
    if (maskHistoryIndex < maskHistory.length - 1) {
        maskHistory = maskHistory.slice(0, maskHistoryIndex + 1);
    }

    // 加入新狀態
    maskHistory.push(imageData);

    // 限制歷史數量
    if (maskHistory.length > MAX_MASK_HISTORY) {
        maskHistory.shift();
    } else {
        maskHistoryIndex++;
    }

    updateMaskHistoryButtons();
}

// 遮罩復原
function maskUndo() {
    if (maskHistoryIndex <= 0 || !maskCtx) return;

    maskHistoryIndex--;
    const imageData = maskHistory[maskHistoryIndex];

    // 確保 canvas 尺寸匹配
    if (imageData.width === elements.maskEditCanvas.width &&
        imageData.height === elements.maskEditCanvas.height) {
        maskCtx.putImageData(imageData, 0, 0);
    }

    updateMaskHistoryButtons();
    showToast('已復原遮罩編輯');
}

// 遮罩重做
function maskRedo() {
    if (maskHistoryIndex >= maskHistory.length - 1 || !maskCtx) return;

    maskHistoryIndex++;
    const imageData = maskHistory[maskHistoryIndex];

    // 確保 canvas 尺寸匹配
    if (imageData.width === elements.maskEditCanvas.width &&
        imageData.height === elements.maskEditCanvas.height) {
        maskCtx.putImageData(imageData, 0, 0);
    }

    updateMaskHistoryButtons();
    showToast('已重做遮罩編輯');
}

// 更新遮罩歷史按鈕狀態
function updateMaskHistoryButtons() {
    if (elements.maskUndo) {
        elements.maskUndo.disabled = maskHistoryIndex <= 0;
    }
    if (elements.maskRedo) {
        elements.maskRedo.disabled = maskHistoryIndex >= maskHistory.length - 1;
    }
}

// 清除遮罩歷史
function clearMaskHistory() {
    maskHistory = [];
    maskHistoryIndex = -1;
    updateMaskHistoryButtons();
}

function startMaskEditMode() {
    state.isMaskEditing = true;
    state.maskBrushMode = 'none'; // 預設為瀏覽模式

    // 顯示編輯介面
    elements.maskEditOverlay.classList.remove('nordic-hidden');
    elements.maskEditToolbar.classList.remove('nordic-hidden');

    // 預設為瀏覽模式（不攔截滑鼠事件）
    elements.maskEditOverlay.classList.remove('restore-mode', 'erase-mode');
    elements.maskEditOverlay.style.pointerEvents = 'none';

    // 設定遮罩畫布
    setupMaskCanvas();

    // 清除遮罩歷史並保存初始狀態
    clearMaskHistory();
    saveMaskToHistory();

    // 更新工具狀態 - 預設選中「瀏覽」
    clearAllToolActive();
    elements.maskToolNone.classList.add('active');
    elements.maskBrushSizeValue.textContent = state.maskBrushSize + 'px';
    elements.maskBrushSize.value = state.maskBrushSize;

    updateStatus('去背編輯模式 - 點擊「自動選主體」或選擇筆刷工具');
}

// 清除所有工具按鈕的 active 狀態
function clearAllToolActive() {
    elements.maskToolNone.classList.remove('active');
    elements.maskToolAutoSubject.classList.remove('active');
    elements.maskToolAutoBg.classList.remove('active');
    elements.maskToolRestore.classList.remove('active');
    elements.maskToolErase.classList.remove('active');
    elements.maskToolMagicRestore.classList.remove('active');
    elements.maskToolMagicErase.classList.remove('active');
}

function setupMaskCanvas() {
    const imageCanvas = elements.imageCanvas;
    const maskCanvas = elements.maskEditCanvas;

    // 設定遮罩畫布尺寸與圖片相同
    maskCanvas.width = imageCanvas.width;
    maskCanvas.height = imageCanvas.height;

    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // 更新遮罩層位置
    updateMaskOverlayPosition();
}

function updateMaskOverlayPosition() {
    const imageCanvas = elements.imageCanvas;
    const maskCanvas = elements.maskEditCanvas;
    const viewport = elements.imageViewport;

    const canvasRect = imageCanvas.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    // 計算 canvas 相對於 viewport 的偏移
    const offsetX = canvasRect.left - viewportRect.left + viewport.scrollLeft;
    const offsetY = canvasRect.top - viewportRect.top + viewport.scrollTop;

    maskCanvas.style.left = offsetX + 'px';
    maskCanvas.style.top = offsetY + 'px';
    maskCanvas.style.width = imageCanvas.width + 'px';
    maskCanvas.style.height = imageCanvas.height + 'px';
}

// 當縮放改變時，重新調整遮罩畫布
function updateMaskCanvasSize() {
    if (!maskCtx) return;

    const imageCanvas = elements.imageCanvas;
    const maskCanvas = elements.maskEditCanvas;

    const newWidth = imageCanvas.width;
    const newHeight = imageCanvas.height;

    // 如果尺寸沒變，只更新位置
    if (maskCanvas.width === newWidth && maskCanvas.height === newHeight) {
        updateMaskOverlayPosition();
        return;
    }

    // 保存舊的遮罩資料
    const oldWidth = maskCanvas.width;
    const oldHeight = maskCanvas.height;
    const oldMaskData = maskCtx.getImageData(0, 0, oldWidth, oldHeight);

    // 調整畫布尺寸
    maskCanvas.width = newWidth;
    maskCanvas.height = newHeight;

    // 重新繪製遮罩（縮放）
    if (oldWidth > 0 && oldHeight > 0) {
        // 創建臨時畫布來保存舊的遮罩
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldWidth;
        tempCanvas.height = oldHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(oldMaskData, 0, 0);

        // 縮放繪製到新尺寸
        maskCtx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
    }

    // 更新位置
    updateMaskOverlayPosition();
}

function applyMaskEdit() {
    if (!state.isMaskEditing) return;

    showLoading('套用編輯...');

    // 創建最終圖片
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = state.imageWidth;
    outputCanvas.height = state.imageHeight;
    const outputCtx = outputCanvas.getContext('2d');

    // 先從原始圖片繪製（完全不透明）
    if (state.imageBeforeRemoveBg) {
        outputCtx.drawImage(state.imageBeforeRemoveBg, 0, 0);
    } else {
        outputCtx.drawImage(state.originalImage, 0, 0);
    }

    // 獲取遮罩資料
    const maskWidth = elements.maskEditCanvas.width;
    const maskHeight = elements.maskEditCanvas.height;
    const maskData = maskCtx.getImageData(0, 0, maskWidth, maskHeight);
    const outputData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);

    // 計算縮放比例（遮罩 -> 原圖）
    const scaleX = state.imageWidth / maskWidth;
    const scaleY = state.imageHeight / maskHeight;

    // 遍歷輸出圖片的每個像素
    for (let oy = 0; oy < outputCanvas.height; oy++) {
        for (let ox = 0; ox < outputCanvas.width; ox++) {
            // 計算對應的遮罩像素位置
            const mx = Math.floor(ox / scaleX);
            const my = Math.floor(oy / scaleY);

            // 確保在遮罩範圍內
            if (mx >= 0 && mx < maskWidth && my >= 0 && my < maskHeight) {
                const maskIdx = (my * maskWidth + mx) * 4;
                const r = maskData.data[maskIdx];
                const g = maskData.data[maskIdx + 1];
                const a = maskData.data[maskIdx + 3];

                const outputIdx = (oy * outputCanvas.width + ox) * 4;

                if (a > 0) {
                    if (r > g) {
                        // 紅色 - 背景（設為透明）
                        outputData.data[outputIdx + 3] = 0;
                    }
                    // 綠色區域保持原圖（已經繪製了）
                }
            }
        }
    }

    outputCtx.putImageData(outputData, 0, 0);

    // 設定檔案格式為 PNG（支援透明度）
    state.fileExtension = 'png';

    // 轉換為圖片
    const resultUrl = outputCanvas.toDataURL('image/png');
    const resultImg = new Image();

    resultImg.onload = () => {
        state.originalImage = resultImg;
        state.currentImage = resultImg;

        saveToHistory();
        fitImageToViewport();
        applyAllEffects();

        // 關閉編輯模式
        closeMaskEditMode();

        hideLoading();
        showToast('去背已套用！');
        updateStatus('圖片已載入');
    };

    resultImg.src = resultUrl;
}

function cancelMaskEdit() {
    if (!state.isMaskEditing) return;

    // 直接關閉，不套用變更
    closeMaskEditMode();

    showToast('已取消去背編輯');
    updateStatus('圖片已載入');
}

function clearMaskEdit() {
    if (!maskCtx) return;

    // 清除所有遮罩
    maskCtx.clearRect(0, 0, elements.maskEditCanvas.width, elements.maskEditCanvas.height);
    aiGeneratedMask = null;

    showToast('已清除所有去背效果');
}

function closeMaskEditMode() {
    state.isMaskEditing = false;
    state.imageBeforeRemoveBg = null;
    aiGeneratedMask = null;

    elements.maskEditOverlay.classList.add('nordic-hidden');
    elements.maskEditToolbar.classList.add('nordic-hidden');
    elements.maskEditOverlay.classList.remove('restore-mode', 'erase-mode');

    if (maskCtx) {
        maskCtx.clearRect(0, 0, elements.maskEditCanvas.width, elements.maskEditCanvas.height);
    }

    // 重置工具列位置
    resetToolbarPosition();
}

// 重置工具列到預設位置（置中底部）
function resetToolbarPosition() {
    elements.maskEditToolbar.style.left = '50%';
    elements.maskEditToolbar.style.top = '';
    elements.maskEditToolbar.style.bottom = '20px';
    elements.maskEditToolbar.style.transform = 'translateX(-50%)';
}

// ========================================
// 9. OCR 文字辨識（改進版 - 支援區域選擇）
// ========================================

function startOCRSelection() {
    if (!state.originalImage) return;

    state.isSelectingOCRRegion = true;
    state.ocrRegion = null;

    // 顯示 OCR 區域選擇覆蓋層
    if (elements.ocrRegionOverlay) {
        elements.ocrRegionOverlay.classList.remove('nordic-hidden');
    }

    // 隱藏 OCR 結果面板（等辨識完再顯示）
    elements.ocrResultPanel.classList.add('nordic-hidden');

    updateStatus('請在圖片上框選要辨識的區域，或按 Enter 辨識整張圖片');
    showToast('請框選要辨識的區域', 'info');
}

// 偵測文字的主要語言
function detectDominantLanguage(text) {
    if (!text || text.length < 5) return 'default';

    // 日文：平假名、片假名
    const hiragana = (text.match(/[\u3040-\u309F]/g) || []).length;
    const katakana = (text.match(/[\u30A0-\u30FF]/g) || []).length;
    const japaneseChars = hiragana + katakana;

    // 韓文：諺文
    const korean = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;

    // 中文：CJK 漢字（排除日文專用漢字的統計方式）
    const cjk = (text.match(/[\u4E00-\u9FFF]/g) || []).length;

    // 英文/拉丁字母
    const latin = (text.match(/[a-zA-Z]/g) || []).length;

    const total = text.length;

    // 如果有日文假名，很可能是日文
    if (japaneseChars > 3 || japaneseChars / total > 0.05) {
        return 'japanese';
    }

    // 如果有韓文字符，很可能是韓文
    if (korean > 3 || korean / total > 0.05) {
        return 'korean';
    }

    // 如果中文字較多
    if (cjk > latin) {
        return 'chinese';
    }

    // 預設使用繁中+英文
    return 'default';
}

async function performOCR(region = null) {
    showLoading('正在辨識文字...');
    updateStatus('OCR 處理中...');

    try {
        let sourceCanvas;

        if (region) {
            // 只辨識選取區域
            // region 座標已經是原始圖片座標（在 initOCRRegionHandlers 中已轉換）
            const regionX = Math.max(0, region.x);
            const regionY = Math.max(0, region.y);
            const regionW = Math.min(region.width, state.imageWidth - regionX);
            const regionH = Math.min(region.height, state.imageHeight - regionY);

            sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = regionW;
            sourceCanvas.height = regionH;
            const sourceCtx = sourceCanvas.getContext('2d');
            sourceCtx.drawImage(state.originalImage, regionX, regionY, regionW, regionH, 0, 0, regionW, regionH);
        } else {
            // 辨識整張圖片
            sourceCanvas = elements.imageCanvas;
        }

        // 語言順序影響辨識優先級
        // 日文放第一位以提高日文準確度
        const languages = 'jpn+chi_tra+chi_sim+eng';
        console.log('OCR 使用語言:', languages);

        const result = await Tesseract.recognize(
            sourceCanvas,
            languages,
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        elements.loadingText.textContent = `辨識中... ${progress}%`;
                    } else if (m.status === 'loading language traineddata') {
                        elements.loadingText.textContent = `載入語言資料...`;
                    }
                }
            }
        );

        state.isOCRMode = true;
        state.ocrWords = result.data.words || [];

        const text = result.data.text.trim();
        elements.ocrTextOutput.value = text;
        elements.ocrResultPanel.classList.remove('nordic-hidden');

        // 隱藏語言選擇提示
        const hintEl = document.getElementById('ocr-hint');
        if (hintEl) hintEl.style.display = 'none';

        if (!region) {
            renderOCROverlay();
        }

        hideLoading();
        updateStatus(`辨識完成，共 ${state.ocrWords.length} 個字詞`);

        if (text) {
            showToast('文字辨識完成');
        } else {
            showToast('未偵測到文字', 'warning');
        }

    } catch (error) {
        console.error('OCR Error:', error);
        hideLoading();
        showToast('文字辨識失敗', 'error');
        updateStatus('OCR 失敗');
    }
}

function startOCR() {
    if (!state.originalImage) return;
    startOCRSelection();
}

function renderOCROverlay() {
    const layer = elements.ocrTextLayer;
    layer.innerHTML = '';

    const scaleX = elements.imageCanvas.width / state.imageWidth;
    const scaleY = elements.imageCanvas.height / state.imageHeight;

    const canvasRect = elements.imageCanvas.getBoundingClientRect();
    const viewportRect = elements.imageViewport.getBoundingClientRect();
    const offsetX = canvasRect.left - viewportRect.left;
    const offsetY = canvasRect.top - viewportRect.top;

    state.ocrWords.forEach((word, index) => {
        if (!word.bbox) return;

        const div = document.createElement('div');
        div.className = 'ocr-word';
        div.dataset.index = index;
        div.dataset.text = word.text;
        div.style.left = (word.bbox.x0 * scaleX + offsetX) + 'px';
        div.style.top = (word.bbox.y0 * scaleY + offsetY) + 'px';
        div.style.width = ((word.bbox.x1 - word.bbox.x0) * scaleX) + 'px';
        div.style.height = ((word.bbox.y1 - word.bbox.y0) * scaleY) + 'px';
        div.title = word.text;

        div.addEventListener('click', () => toggleWordSelection(div, word));

        layer.appendChild(div);
    });

    elements.ocrOverlay.classList.remove('nordic-hidden');
}

function toggleWordSelection(div, word) {
    div.classList.toggle('selected');
    updateSelectedText();
}

function updateSelectedText() {
    const selectedWords = Array.from(document.querySelectorAll('.ocr-word.selected'))
        .map(el => el.dataset.text)
        .join(' ');

    if (selectedWords) {
        state.selectedText = selectedWords;
    }
}

function copyText() {
    const text = elements.ocrTextOutput.value;
    if (!text) {
        showToast('沒有可複製的文字', 'warning');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        showToast('已複製到剪貼簿');
    }).catch(() => {
        showToast('複製失敗', 'error');
    });
}

async function saveAsText() {
    const text = elements.ocrTextOutput.value;
    if (!text) {
        showToast('沒有可儲存的文字', 'warning');
        return;
    }

    // 產生檔名：text_yyyyMMddHHmmss.txt
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
    const defaultName = `text_${timestamp}.txt`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

    // 嘗試使用 File System Access API
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                types: [{
                    description: '文字檔案',
                    accept: {
                        'text/plain': ['.txt']
                    }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            showToast(`已儲存為 ${handle.name}`);
            return;
        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }
        }
    }

    // Fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`已儲存為 ${defaultName}`);
}

function closeOCRPanel() {
    state.isOCRMode = false;
    state.isSelectingOCRRegion = false;
    state.ocrRegion = null;
    elements.ocrResultPanel.classList.add('nordic-hidden');
    elements.ocrOverlay.classList.add('nordic-hidden');
    elements.ocrTextLayer.innerHTML = '';

    if (elements.ocrRegionOverlay) {
        elements.ocrRegionOverlay.classList.add('nordic-hidden');
    }
    if (elements.ocrRegionBox) {
        elements.ocrRegionBox.style.display = 'none';
    }

    updateStatus('就緒');
}

// ========================================
// 10. 儲存圖片（修復版）
// ========================================

// 儲存中標記，防止重複觸發
let isSaving = false;

function saveImage() {
    if (!state.originalImage) return;

    // 防止重複觸發
    if (isSaving) {
        console.log('Save already in progress, skipping...');
        return;
    }
    isSaving = true;

    showLoading('儲存中...');

    // 創建輸出用的 canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = state.imageWidth;
    outputCanvas.height = state.imageHeight;
    const outputCtx = outputCanvas.getContext('2d');

    outputCtx.drawImage(state.originalImage, 0, 0);

    // 套用調整效果到輸出
    const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 曝光
        if (state.adjustments.exposure !== 0) {
            const exp = state.adjustments.exposure / 100 * 0.5 + 1;
            r *= exp;
            g *= exp;
            b *= exp;
        }

        // 對比
        if (state.adjustments.contrast !== 0) {
            const con = (state.adjustments.contrast / 100) * 0.5 + 1;
            r = (r - 128) * con + 128;
            g = (g - 128) * con + 128;
            b = (b - 128) * con + 128;
        }

        // 飽和度
        if (state.adjustments.saturation !== 0) {
            const sat = state.adjustments.saturation / 100 + 1;
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = gray + sat * (r - gray);
            g = gray + sat * (g - gray);
            b = gray + sat * (b - gray);
        }

        // 色溫
        if (state.adjustments.temperature !== 0) {
            const temp = state.adjustments.temperature / 100 * 30;
            r += temp;
            b -= temp;
        }

        // 色調
        if (state.adjustments.tint !== 0) {
            const tint = state.adjustments.tint / 100 * 30;
            g += tint;
        }

        // 褐色調
        if (state.adjustments.sepia !== 0) {
            const sep = state.adjustments.sepia / 100;
            const tr = 0.393 * r + 0.769 * g + 0.189 * b;
            const tg = 0.349 * r + 0.686 * g + 0.168 * b;
            const tb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = r * (1 - sep) + tr * sep;
            g = g * (1 - sep) + tg * sep;
            b = b * (1 - sep) + tb * sep;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    outputCtx.putImageData(imageData, 0, 0);

    // 決定格式和檔名
    let mimeType, extension;
    if (state.fileExtension === 'jpg' || state.fileExtension === 'jpeg') {
        mimeType = 'image/jpeg';
        extension = 'jpg';
    } else if (state.fileExtension === 'webp') {
        mimeType = 'image/webp';
        extension = 'webp';
    } else if (state.fileExtension === 'gif') {
        // GIF 需要特殊處理，瀏覽器不直接支援 GIF 編碼
        // 使用 PNG 格式保持透明度，但標記為 GIF 以供未來 GIF encoder 使用
        mimeType = 'image/png';
        extension = 'png';
        showToast('GIF 格式暫不支援，已以 PNG 格式儲存（保留透明度）', 'warning');
    } else {
        // 預設使用 PNG（支援透明背景）
        mimeType = 'image/png';
        extension = 'png';
    }

    const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

    // 產生檔名：images_yyyyMMddHHmmss.extension
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
    const defaultName = `images_${timestamp}.${extension}`;

    // 檢測是否在 Electron 環境中
    const isElectron = navigator.userAgent.toLowerCase().includes('electron');

    outputCanvas.toBlob(async (blob) => {
        // 在 Electron 環境中，使用傳統下載方式（避免 showSaveFilePicker 衝突）
        // 在瀏覽器中，嘗試使用 File System Access API
        if (!isElectron && 'showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultName,
                    types: [{
                        description: '圖片檔案',
                        accept: {
                            [mimeType]: [`.${extension}`]
                        }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();

                hideLoading();
                isSaving = false;
                showToast(`已儲存為 ${handle.name}`);
                return;
            } catch (err) {
                // 用戶取消或不支援，fallback 到傳統下載
                if (err.name === 'AbortError') {
                    hideLoading();
                    isSaving = false;
                    return;
                }
            }
        }

        // Fallback 或 Electron：傳統下載方式
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        hideLoading();
        isSaving = false;
        showToast(`已儲存為 ${defaultName}`);
    }, mimeType, quality);
}

// ========================================
// 11. 事件監聽器
// ========================================

function initEventListeners() {
    // 開啟檔案
    elements.btnOpen.addEventListener('click', () => elements.fileInput.click());
    elements.btnSelectFile.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            loadImage(e.target.files[0]);
        }
    });

    // 拖放
    elements.canvasArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.canvasArea.classList.add('drag-over');
    });
    elements.canvasArea.addEventListener('dragleave', () => {
        elements.canvasArea.classList.remove('drag-over');
    });
    elements.canvasArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.canvasArea.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) {
            loadImage(e.dataTransfer.files[0]);
        }
    });

    // 儲存
    elements.btnSave.addEventListener('click', saveImage);

    // 關閉
    if (elements.btnClose) elements.btnClose.addEventListener('click', closeImage);


    // 歷史記錄
    if (elements.btnUndo) elements.btnUndo.addEventListener('click', undo);
    if (elements.btnRedo) elements.btnRedo.addEventListener('click', redo);

    // 裁切
    elements.btnCrop.addEventListener('click', () => {
        if (state.isCropping) {
            cancelCrop();
        } else {
            startCrop();
        }
    });

    // 尺寸調整
    elements.btnResize.addEventListener('click', openResizeModal);
    elements.resizeCancel.addEventListener('click', closeResizeModal);
    elements.resizeModalClose.addEventListener('click', closeResizeModal);
    elements.resizeApply.addEventListener('click', applyResize);
    elements.resizeLink.addEventListener('click', () => {
        state.maintainRatio = !state.maintainRatio;
        elements.resizeMaintainRatio.checked = state.maintainRatio;
        elements.resizeLink.classList.toggle('unlinked', !state.maintainRatio);
    });
    elements.resizeMaintainRatio.addEventListener('change', (e) => {
        state.maintainRatio = e.target.checked;
        elements.resizeLink.classList.toggle('unlinked', !state.maintainRatio);
    });
    elements.resizeWidth.addEventListener('input', () => {
        if (state.maintainRatio && state.aspectRatio) {
            elements.resizeHeight.value = Math.round(elements.resizeWidth.value / state.aspectRatio);
        }
    });
    elements.resizeHeight.addEventListener('input', () => {
        if (state.maintainRatio && state.aspectRatio) {
            elements.resizeWidth.value = Math.round(elements.resizeHeight.value * state.aspectRatio);
        }
    });

    // 快速縮放按鈕 - 使用原始圖片尺寸而非 state 中可能被修改的尺寸
    document.querySelectorAll('.resize-scale-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scale = parseFloat(btn.dataset.scale);
            if (scale && state.originalImage) {
                // 使用原始圖片的自然尺寸，而非 state.imageWidth/Height
                const originalWidth = state.originalImage.naturalWidth || state.originalImage.width;
                const originalHeight = state.originalImage.naturalHeight || state.originalImage.height;
                const newWidth = Math.round(originalWidth * scale);
                const newHeight = Math.round(originalHeight * scale);
                elements.resizeWidth.value = newWidth;
                elements.resizeHeight.value = newHeight;
            }
        });
    });

    // 背景移除
    elements.btnRemoveBg.addEventListener('click', removeBackground);

    // OCR
    elements.btnOcr.addEventListener('click', startOCR);
    elements.btnCopyText.addEventListener('click', copyText);
    elements.btnSaveText.addEventListener('click', saveAsText);
    elements.btnCloseOcrPanel.addEventListener('click', closeOCRPanel);

    // 濾鏡
    elements.filterGrid.addEventListener('click', (e) => {
        const filterItem = e.target.closest('.filter-item');
        if (filterItem) {
            state.activeFilter = filterItem.dataset.filter;
            updateFilterSelection();
            applyAllEffects();
        }
    });

    // 調整滑桿
    Object.keys(elements.sliders).forEach(key => {
        if (elements.sliders[key]) {
            elements.sliders[key].addEventListener('input', (e) => {
                state.adjustments[key] = parseInt(e.target.value);
                elements.values[key].textContent = e.target.value;
                applyAllEffects();
            });
        }
    });

    // 自動調整和重置
    elements.btnAutoAdjust.addEventListener('click', autoAdjust);
    elements.btnResetAdjustments.addEventListener('click', resetAdjustments);

    // 縮放
    elements.btnZoomIn.addEventListener('click', () => {
        state.zoom = Math.min(state.zoom * 1.25, 5);
        updateZoomDisplay();
        renderCanvas();
        applyAllEffects();
    });
    elements.btnZoomOut.addEventListener('click', () => {
        state.zoom = Math.max(state.zoom / 1.25, 0.1);
        updateZoomDisplay();
        renderCanvas();
        applyAllEffects();
    });
    elements.btnZoomFit.addEventListener('click', fitImageToViewport);

    // 鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
        // 裁切模式
        if (state.isCropping) {
            e.preventDefault(); // 防止觸發其他事件（如下載）
            if (e.key === 'Enter') {
                applyCrop();
            } else if (e.key === 'Escape') {
                cancelCrop();
            } else if (e.key.toLowerCase() === 'r') {
                resetCropArea();
            }
            return;
        }

        // OCR 區域選擇模式
        if (state.isSelectingOCRRegion) {
            if (e.key === 'Enter') {
                // 辨識整張圖片或選取區域
                state.isSelectingOCRRegion = false;
                if (elements.ocrRegionOverlay) {
                    elements.ocrRegionOverlay.classList.add('nordic-hidden');
                }
                performOCR(state.ocrRegion);
            } else if (e.key === 'Escape') {
                closeOCRPanel();
            }
            return;
        }

        // Ctrl/Cmd + S 儲存（Electron 環境由選單處理，這裡跳過）
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            // 檢查是否在 Electron 環境中（使用 userAgent 偵測）
            const isElectron = navigator.userAgent.toLowerCase().includes('electron');
            if (!isElectron) {
                if (state.originalImage) saveImage();
            }
        }

        // Ctrl/Cmd + O 開啟（Electron 環境由選單處理，這裡跳過）
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            // 檢查是否在 Electron 環境中（使用 userAgent 偵測）
            const isElectron = navigator.userAgent.toLowerCase().includes('electron');
            if (!isElectron) {
                elements.fileInput.click();
            }
        }

        // Ctrl/Cmd + Z 還原
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }

        // Ctrl/Cmd + Shift + Z 重做
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            redo();
        }
    });

    // 視窗大小變化
    window.addEventListener('resize', () => {
        if (state.originalImage && !state.isCropping) {
            fitImageToViewport();
            applyAllEffects();
        }
    });

    // 裁切區域拖曳
    initCropDragHandlers();

    // OCR 區域選擇拖曳
    initOCRRegionHandlers();

    // 畫布導航和拖曳
    initCanvasNavigation();

    // 去背編輯筆刷
    initMaskEditHandlers();
}

// 裁切區域拖曳處理（改進版 - 支援四邊拖曳和縮放）
function initCropDragHandlers() {
    let isDragging = false;
    let dragType = null;
    let startX, startY;
    let startRect = {};

    elements.cropArea.addEventListener('mousedown', (e) => {
        const target = e.target;

        if (target.classList.contains('crop-handle')) {
            // 取得拖曳類型
            const classes = target.className;
            if (classes.includes('nw')) dragType = 'nw';
            else if (classes.includes('ne')) dragType = 'ne';
            else if (classes.includes('sw')) dragType = 'sw';
            else if (classes.includes('se')) dragType = 'se';
            else if (classes.includes('-n')) dragType = 'n';
            else if (classes.includes('-s')) dragType = 's';
            else if (classes.includes('-e')) dragType = 'e';
            else if (classes.includes('-w')) dragType = 'w';
        } else {
            dragType = 'move';
        }

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startRect = { ...state.cropRect };
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // 使用畫布顯示尺寸作為邊界（cropRect 是基於畫布顯示尺寸）
        const canvasWidth = elements.imageCanvas.width;
        const canvasHeight = elements.imageCanvas.height;
        const minSize = 30; // 最小裁切尺寸

        switch (dragType) {
            case 'move':
                state.cropRect.x = Math.max(0, Math.min(canvasWidth - state.cropRect.width, startRect.x + dx));
                state.cropRect.y = Math.max(0, Math.min(canvasHeight - state.cropRect.height, startRect.y + dy));
                break;
            case 'nw':
                {
                    const newX = Math.max(0, Math.min(startRect.x + startRect.width - minSize, startRect.x + dx));
                    const newY = Math.max(0, Math.min(startRect.y + startRect.height - minSize, startRect.y + dy));
                    state.cropRect.width = startRect.width + (startRect.x - newX);
                    state.cropRect.height = startRect.height + (startRect.y - newY);
                    state.cropRect.x = newX;
                    state.cropRect.y = newY;
                }
                break;
            case 'ne':
                {
                    const newWidth = Math.max(minSize, Math.min(canvasWidth - startRect.x, startRect.width + dx));
                    const newY = Math.max(0, Math.min(startRect.y + startRect.height - minSize, startRect.y + dy));
                    state.cropRect.width = newWidth;
                    state.cropRect.height = startRect.height + (startRect.y - newY);
                    state.cropRect.y = newY;
                }
                break;
            case 'sw':
                {
                    const newX = Math.max(0, Math.min(startRect.x + startRect.width - minSize, startRect.x + dx));
                    const maxHeight = canvasHeight - startRect.y;
                    const newHeight = Math.max(minSize, Math.min(maxHeight, startRect.height + dy));
                    state.cropRect.width = startRect.width + (startRect.x - newX);
                    state.cropRect.height = newHeight;
                    state.cropRect.x = newX;
                }
                break;
            case 'se':
                {
                    const maxWidth = canvasWidth - startRect.x;
                    const maxHeight = canvasHeight - startRect.y;
                    state.cropRect.width = Math.max(minSize, Math.min(maxWidth, startRect.width + dx));
                    state.cropRect.height = Math.max(minSize, Math.min(maxHeight, startRect.height + dy));
                }
                break;
            case 'n':
                {
                    const newY = Math.max(0, Math.min(startRect.y + startRect.height - minSize, startRect.y + dy));
                    state.cropRect.height = startRect.height + (startRect.y - newY);
                    state.cropRect.y = newY;
                }
                break;
            case 's':
                {
                    const maxHeight = canvasHeight - startRect.y;
                    state.cropRect.height = Math.max(minSize, Math.min(maxHeight, startRect.height + dy));
                }
                break;
            case 'e':
                {
                    const maxWidth = canvasWidth - startRect.x;
                    state.cropRect.width = Math.max(minSize, Math.min(maxWidth, startRect.width + dx));
                }
                break;
            case 'w':
                {
                    const newX = Math.max(0, Math.min(startRect.x + startRect.width - minSize, startRect.x + dx));
                    state.cropRect.width = startRect.width + (startRect.x - newX);
                    state.cropRect.x = newX;
                }
                break;
        }

        updateCropArea();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragType = null;
    });
}

// OCR 區域選擇處理
function initOCRRegionHandlers() {
    let isDrawing = false;
    let startX, startY;
    let canvasOffsetX, canvasOffsetY;

    const viewport = elements.imageViewport;

    viewport.addEventListener('mousedown', (e) => {
        if (!state.isSelectingOCRRegion) return;

        const canvasRect = elements.imageCanvas.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();

        // 計算 canvas 相對於 viewport 的偏移
        canvasOffsetX = canvasRect.left - viewportRect.left;
        canvasOffsetY = canvasRect.top - viewportRect.top;

        // 檢查是否在圖片範圍內
        if (e.clientX < canvasRect.left || e.clientX > canvasRect.right ||
            e.clientY < canvasRect.top || e.clientY > canvasRect.bottom) {
            return;
        }

        isDrawing = true;
        // 相對於 canvas 顯示區域的座標
        startX = e.clientX - canvasRect.left;
        startY = e.clientY - canvasRect.top;

        // 初始化選擇框（相對於 viewport，加上 canvas 偏移）
        if (elements.ocrRegionBox) {
            elements.ocrRegionBox.style.left = (startX + canvasOffsetX) + 'px';
            elements.ocrRegionBox.style.top = (startY + canvasOffsetY) + 'px';
            elements.ocrRegionBox.style.width = '0px';
            elements.ocrRegionBox.style.height = '0px';
            elements.ocrRegionBox.style.display = 'block';
        }

        e.preventDefault();
    });

    viewport.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;

        const canvasRect = elements.imageCanvas.getBoundingClientRect();

        // 當前滑鼠相對於 canvas 顯示區域的座標（使用 clientRect 的寬高）
        const currentX = Math.max(0, Math.min(canvasRect.width, e.clientX - canvasRect.left));
        const currentY = Math.max(0, Math.min(canvasRect.height, e.clientY - canvasRect.top));

        // 計算選取區域（相對於 canvas 顯示區域）
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        // 更新選擇框位置（相對於 viewport，加上 canvas 偏移）
        if (elements.ocrRegionBox) {
            elements.ocrRegionBox.style.left = (x + canvasOffsetX) + 'px';
            elements.ocrRegionBox.style.top = (y + canvasOffsetY) + 'px';
            elements.ocrRegionBox.style.width = width + 'px';
            elements.ocrRegionBox.style.height = height + 'px';
        }

        // 儲存相對於 canvas 顯示區域的座標（用於 OCR，需轉換為原始圖片座標）
        // 計算縮放比例：原始圖片尺寸 / 顯示尺寸
        const scaleX = state.imageWidth / canvasRect.width;
        const scaleY = state.imageHeight / canvasRect.height;

        state.ocrRegion = {
            x: Math.round(x * scaleX),
            y: Math.round(y * scaleY),
            width: Math.round(width * scaleX),
            height: Math.round(height * scaleY)
        };
    });

    viewport.addEventListener('mouseup', () => {
        if (!isDrawing) return;
        isDrawing = false;

        // 如果選取區域太小，提示用戶
        if (state.ocrRegion && state.ocrRegion.width > 20 && state.ocrRegion.height > 20) {
            showToast('區域已選取，按 Enter 開始辨識', 'info');
        } else {
            state.ocrRegion = null;
            if (elements.ocrRegionBox) {
                elements.ocrRegionBox.style.display = 'none';
            }
        }
    });
}

// 畫布導航和拖曳功能
function initCanvasNavigation() {
    const scrollAmount = 100;

    // 導航按鈕事件
    if (elements.navUp) {
        elements.navUp.addEventListener('click', () => {
            elements.imageViewport.scrollTop -= scrollAmount;
        });
    }

    if (elements.navDown) {
        elements.navDown.addEventListener('click', () => {
            elements.imageViewport.scrollTop += scrollAmount;
        });
    }

    if (elements.navLeft) {
        elements.navLeft.addEventListener('click', () => {
            elements.imageViewport.scrollLeft -= scrollAmount;
        });
    }

    if (elements.navRight) {
        elements.navRight.addEventListener('click', () => {
            elements.imageViewport.scrollLeft += scrollAmount;
        });
    }

    // 拖曳模式切換
    if (elements.navHand) {
        elements.navHand.addEventListener('click', () => {
            state.isDragMode = !state.isDragMode;
            elements.navHand.classList.toggle('active', state.isDragMode);
            elements.imageViewport.classList.toggle('drag-mode', state.isDragMode);

            if (state.isDragMode) {
                showToast('拖曳模式已啟用，可拖曳畫布移動', 'info');
            } else {
                showToast('拖曳模式已關閉');
            }
        });
    }

    // 畫布拖曳功能
    let isDragging = false;
    let lastX, lastY;

    elements.imageViewport.addEventListener('mousedown', (e) => {
        // 只在拖曳模式或按住空白鍵時啟用
        if (!state.isDragMode && !state.isSpacePressed) return;
        if (state.isCropping || state.isSelectingOCRRegion) return;

        isDragging = true;
        elements.imageViewport.classList.add('dragging');
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        elements.imageViewport.scrollLeft -= deltaX;
        elements.imageViewport.scrollTop -= deltaY;

        lastX = e.clientX;
        lastY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            elements.imageViewport.classList.remove('dragging');
        }
    });

    // 空白鍵臨時啟用拖曳模式
    state.isSpacePressed = false;

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !state.isSpacePressed && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            state.isSpacePressed = true;
            elements.imageViewport.classList.add('drag-mode');
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            state.isSpacePressed = false;
            if (!state.isDragMode) {
                elements.imageViewport.classList.remove('drag-mode');
            }
        }
    });
}

// 去背編輯筆刷處理
function initMaskEditHandlers() {
    let isPainting = false;
    let lastX = 0;
    let lastY = 0;

    // 工具列拖曳
    let isDraggingToolbar = false;
    let toolbarStartX = 0;
    let toolbarStartY = 0;
    let toolbarOffsetX = 0;
    let toolbarOffsetY = 0;

    // 工具列拖曳 - 跟隨滑鼠位置
    elements.maskToolbarDrag.addEventListener('mousedown', (e) => {
        isDraggingToolbar = true;
        const rect = elements.maskEditToolbar.getBoundingClientRect();
        // 記錄滑鼠在工具列內的相對位置
        toolbarOffsetX = e.clientX - rect.left;
        toolbarOffsetY = e.clientY - rect.top;
        elements.maskEditToolbar.classList.add('dragging');
        e.preventDefault();
    });

    // 雙擊重置位置
    elements.maskToolbarDrag.addEventListener('dblclick', () => {
        resetToolbarPosition();
        showToast('工具列已重置位置');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingToolbar) return;

        // 計算新位置（滑鼠位置 - 滑鼠在工具列內的偏移）
        let newX = e.clientX - toolbarOffsetX;
        let newY = e.clientY - toolbarOffsetY;

        // 取得工具列和視窗尺寸
        const toolbarRect = elements.maskEditToolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 邊界限制 - 確保至少 100px 可見
        const minVisible = 100;
        newX = Math.max(-toolbarRect.width + minVisible, Math.min(viewportWidth - minVisible, newX));
        newY = Math.max(0, Math.min(viewportHeight - 50, newY));

        elements.maskEditToolbar.style.left = newX + 'px';
        elements.maskEditToolbar.style.top = newY + 'px';
        elements.maskEditToolbar.style.bottom = 'auto';
        elements.maskEditToolbar.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingToolbar) {
            isDraggingToolbar = false;
            elements.maskEditToolbar.classList.remove('dragging');
        }
    });

    // AI 選取按鈕
    elements.maskToolAutoSubject.addEventListener('click', autoSelectSubject);
    elements.maskToolAutoBg.addEventListener('click', autoSelectBackground);

    // 清除按鈕
    elements.maskEditClear.addEventListener('click', clearMaskEdit);

    // 設定筆刷模式的通用函數
    function setMaskBrushMode(mode) {
        // 如果點擊已選中的按鈕，則切換到瀏覽模式
        if (state.maskBrushMode === mode) {
            mode = 'none';
        }

        state.maskBrushMode = mode;
        clearAllToolActive();

        if (mode === 'none') {
            elements.maskToolNone.classList.add('active');
            elements.maskEditOverlay.classList.remove('restore-mode', 'erase-mode');
            elements.maskEditOverlay.style.pointerEvents = 'none'; // 允許點擊穿透
        } else if (mode === 'restore') {
            elements.maskToolRestore.classList.add('active');
            elements.maskEditOverlay.classList.add('restore-mode');
            elements.maskEditOverlay.classList.remove('erase-mode');
            elements.maskEditOverlay.style.pointerEvents = 'auto'; // 攔截繪製事件
        } else if (mode === 'erase') {
            elements.maskToolErase.classList.add('active');
            elements.maskEditOverlay.classList.add('erase-mode');
            elements.maskEditOverlay.classList.remove('restore-mode');
            elements.maskEditOverlay.style.pointerEvents = 'auto'; // 攔截繪製事件
        } else if (mode === 'magic-restore') {
            elements.maskToolMagicRestore.classList.add('active');
            elements.maskEditOverlay.classList.add('restore-mode');
            elements.maskEditOverlay.classList.remove('erase-mode');
            elements.maskEditOverlay.style.pointerEvents = 'auto';
        } else if (mode === 'magic-erase') {
            elements.maskToolMagicErase.classList.add('active');
            elements.maskEditOverlay.classList.add('erase-mode');
            elements.maskEditOverlay.classList.remove('restore-mode');
            elements.maskEditOverlay.style.pointerEvents = 'auto';
        }
    }

    // 瀏覽模式按鈕
    elements.maskToolNone.addEventListener('click', () => {
        setMaskBrushMode('none');
        updateStatus('瀏覽模式 - 可縮放和導覽圖片');
    });

    // 筆刷工具切換（支援 toggle）
    elements.maskToolRestore.addEventListener('click', () => {
        setMaskBrushMode('restore');
        if (state.maskBrushMode === 'restore') {
            updateStatus('恢復筆刷 - 在圖片上繪製以加入主體區域');
        }
    });

    elements.maskToolErase.addEventListener('click', () => {
        setMaskBrushMode('erase');
        if (state.maskBrushMode === 'erase') {
            updateStatus('移除筆刷 - 在圖片上繪製以加入去背區域');
        }
    });

    // 魔術棒工具
    elements.maskToolMagicRestore.addEventListener('click', () => {
        setMaskBrushMode('magic-restore');
        if (state.maskBrushMode === 'magic-restore') {
            updateStatus('魔術棒恢復 - 點擊選取相似顏色加入主體');
        }
    });

    elements.maskToolMagicErase.addEventListener('click', () => {
        setMaskBrushMode('magic-erase');
        if (state.maskBrushMode === 'magic-erase') {
            updateStatus('魔術棒移除 - 點擊選取相似顏色移除');
        }
    });

    // 筆刷大小調整
    elements.maskBrushSize.addEventListener('input', (e) => {
        state.maskBrushSize = parseInt(e.target.value);
        elements.maskBrushSizeValue.textContent = state.maskBrushSize + 'px';
    });

    // 容差調整
    elements.maskTolerance.addEventListener('input', (e) => {
        state.maskTolerance = parseInt(e.target.value);
        elements.maskToleranceValue.textContent = state.maskTolerance;
    });

    // 復原/重做按鈕
    elements.maskUndo.addEventListener('click', maskUndo);
    elements.maskRedo.addEventListener('click', maskRedo);

    // 套用/取消按鈕
    elements.maskEditApply.addEventListener('click', applyMaskEdit);
    elements.maskEditCancel.addEventListener('click', cancelMaskEdit);

    // 繪製功能
    function getCanvasCoords(e) {
        const canvas = elements.maskEditCanvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function drawBrushStroke(x, y) {
        if (!maskCtx) return;

        const brushSize = state.maskBrushSize;

        // 設定筆刷顏色
        if (state.maskBrushMode === 'restore') {
            maskCtx.strokeStyle = 'rgba(94, 161, 118, 0.8)'; // 綠色
            maskCtx.fillStyle = 'rgba(94, 161, 118, 0.8)';
        } else {
            maskCtx.strokeStyle = 'rgba(209, 105, 105, 0.8)'; // 紅色
            maskCtx.fillStyle = 'rgba(209, 105, 105, 0.8)';
        }

        maskCtx.lineWidth = brushSize;
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';

        // 繪製圓點
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();

        // 如果有上一個點，繪製連線
        if (lastX !== 0 || lastY !== 0) {
            maskCtx.beginPath();
            maskCtx.moveTo(lastX, lastY);
            maskCtx.lineTo(x, y);
            maskCtx.stroke();
        }
    }

    // 滑鼠事件
    elements.maskEditCanvas.addEventListener('mousedown', (e) => {
        if (!state.isMaskEditing) return;
        e.preventDefault();

        const coords = getCanvasCoords(e);

        // 魔術棒模式 - 點擊選取相似顏色
        if (state.maskBrushMode === 'magic-restore' || state.maskBrushMode === 'magic-erase') {
            magicWandSelect(coords.x, coords.y, state.maskBrushMode === 'magic-restore');
            return;
        }

        // 一般筆刷模式
        if (state.maskBrushMode === 'restore' || state.maskBrushMode === 'erase') {
            isPainting = true;
            lastX = coords.x;
            lastY = coords.y;
            drawBrushStroke(coords.x, coords.y);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isPainting || !state.isMaskEditing) return;

        const coords = getCanvasCoords(e);
        drawBrushStroke(coords.x, coords.y);
        lastX = coords.x;
        lastY = coords.y;
    });

    document.addEventListener('mouseup', () => {
        // 如果有繪製，保存到歷史
        if (isPainting && state.isMaskEditing) {
            saveMaskToHistory();
        }
        isPainting = false;
        lastX = 0;
        lastY = 0;
    });

    // 觸控支援
    elements.maskEditCanvas.addEventListener('touchstart', (e) => {
        if (!state.isMaskEditing) return;
        e.preventDefault();

        isPainting = true;
        const touch = e.touches[0];
        const coords = getCanvasCoords(touch);
        lastX = coords.x;
        lastY = coords.y;
        drawBrushStroke(coords.x, coords.y);
    });

    elements.maskEditCanvas.addEventListener('touchmove', (e) => {
        if (!isPainting || !state.isMaskEditing) return;
        e.preventDefault();

        const touch = e.touches[0];
        const coords = getCanvasCoords(touch);
        drawBrushStroke(coords.x, coords.y);
        lastX = coords.x;
        lastY = coords.y;
    });

    elements.maskEditCanvas.addEventListener('touchend', () => {
        // 如果有繪製，保存到歷史
        if (isPainting && state.isMaskEditing) {
            saveMaskToHistory();
        }
        isPainting = false;
        lastX = 0;
        lastY = 0;
    });
}

// ========================================
// 12. 初始化
// ========================================

function init() {
    initEventListeners();
    updateStatus('就緒 - 請選擇或拖放圖片');
    console.log('Image Viewer OCR initialized');
}

document.addEventListener('DOMContentLoaded', init);


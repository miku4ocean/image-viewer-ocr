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
    selectedText: '',

    // 尺寸調整
    maintainRatio: true,
    aspectRatio: 1
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

    // 工具列按鈕
    btnOpen: document.getElementById('btn-open'),
    btnSave: document.getElementById('btn-save'),
    btnCrop: document.getElementById('btn-crop'),
    btnResize: document.getElementById('btn-resize'),
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
    btnCopyText: document.getElementById('btn-copy-text'),
    btnSaveText: document.getElementById('btn-save-text'),
    btnCloseOcrPanel: document.getElementById('btn-close-ocr-panel'),

    // OCR 區域選擇
    ocrRegionOverlay: document.getElementById('ocr-region-overlay'),
    ocrRegionBox: document.getElementById('ocr-region-box'),

    // 尺寸調整對話框
    resizeModal: document.getElementById('resize-modal'),
    resizeWidth: document.getElementById('resize-width'),
    resizeHeight: document.getElementById('resize-height'),
    resizeLink: document.getElementById('resize-link'),
    resizeMaintainRatio: document.getElementById('resize-maintain-ratio'),
    resizeCancel: document.getElementById('resize-cancel'),
    resizeApply: document.getElementById('resize-apply'),
    resizeModalClose: document.getElementById('resize-modal-close'),

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
        elements.imageInfo.textContent = `${state.fileName} | ${state.imageWidth} × ${state.imageHeight} px`;
    } else {
        elements.imageInfo.textContent = '';
    }
}

// 啟用/停用工具按鈕
function updateToolbarState(enabled) {
    elements.btnSave.disabled = !enabled;
    elements.btnCrop.disabled = !enabled;
    elements.btnResize.disabled = !enabled;
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
    // 如果不在歷史末端，移除後面的記錄
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }

    // 儲存當前狀態
    const canvas = document.createElement('canvas');
    canvas.width = state.imageWidth;
    canvas.height = state.imageHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.originalImage, 0, 0);

    state.history.push({
        imageData: canvas.toDataURL(),
        width: state.imageWidth,
        height: state.imageHeight
    });

    // 限制歷史記錄數量
    if (state.history.length > state.maxHistory) {
        state.history.shift();
    } else {
        state.historyIndex++;
    }

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
    img.src = record.imageData;
}

// ========================================
// 5. 圖片載入和顯示
// ========================================

function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('請選擇有效的圖片檔案', 'error');
        return;
    }

    showLoading('載入圖片中...');

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
    fade: 'contrast(80%) brightness(110%) saturate(80%)'
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
    crop.style.left = state.cropRect.x + 'px';
    crop.style.top = state.cropRect.y + 'px';
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

    const scaleX = state.imageWidth / elements.imageCanvas.width;
    const scaleY = state.imageHeight / elements.imageCanvas.height;

    const cropX = Math.round(state.cropRect.x * scaleX);
    const cropY = Math.round(state.cropRect.y * scaleY);
    const cropW = Math.round(state.cropRect.width * scaleX);
    const cropH = Math.round(state.cropRect.height * scaleY);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropW;
    tempCanvas.height = cropH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(state.originalImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const img = new Image();
    img.onload = () => {
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
    img.src = tempCanvas.toDataURL();
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

    elements.resizeWidth.value = state.imageWidth;
    elements.resizeHeight.value = state.imageHeight;
    state.maintainRatio = elements.resizeMaintainRatio.checked;

    elements.resizeModal.classList.remove('nordic-hidden');
}

function closeResizeModal() {
    elements.resizeModal.classList.add('nordic-hidden');
}

function applyResize() {
    const newWidth = parseInt(elements.resizeWidth.value);
    const newHeight = parseInt(elements.resizeHeight.value);

    if (!newWidth || !newHeight || newWidth < 1 || newHeight < 1) {
        showToast('請輸入有效的尺寸', 'error');
        return;
    }

    showLoading('調整尺寸中...');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(state.originalImage, 0, 0, newWidth, newHeight);

    const img = new Image();
    img.onload = () => {
        state.originalImage = img;
        state.imageWidth = newWidth;
        state.imageHeight = newHeight;
        state.aspectRatio = newWidth / newHeight;

        // 儲存到歷史記錄
        saveToHistory();

        closeResizeModal();
        fitImageToViewport();
        applyAllEffects();
        updateImageInfo();
        hideLoading();
        showToast(`尺寸已調整為 ${newWidth} × ${newHeight}`);
    };
    img.src = tempCanvas.toDataURL();
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

    updateStatus('請在圖片上框選要辨識的區域，或按 Enter 辨識整張圖片');
    showToast('請框選要辨識的文字區域', 'info');
}

async function performOCR(region = null) {
    showLoading('正在辨識文字...');
    updateStatus('OCR 處理中...');

    try {
        let sourceCanvas;

        if (region) {
            // 只辨識選取區域
            const scaleX = state.imageWidth / elements.imageCanvas.width;
            const scaleY = state.imageHeight / elements.imageCanvas.height;

            const regionX = Math.round(region.x * scaleX);
            const regionY = Math.round(region.y * scaleY);
            const regionW = Math.round(region.width * scaleX);
            const regionH = Math.round(region.height * scaleY);

            sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = regionW;
            sourceCanvas.height = regionH;
            const sourceCtx = sourceCanvas.getContext('2d');
            sourceCtx.drawImage(state.originalImage, regionX, regionY, regionW, regionH, 0, 0, regionW, regionH);
        } else {
            // 辨識整張圖片
            sourceCanvas = elements.imageCanvas;
        }

        const result = await Tesseract.recognize(
            sourceCanvas,
            'chi_tra+eng',
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        elements.loadingText.textContent = `辨識中... ${progress}%`;
                    }
                }
            }
        );

        state.isOCRMode = true;
        state.ocrWords = result.data.words || [];

        const text = result.data.text.trim();
        elements.ocrTextOutput.value = text;
        elements.ocrResultPanel.classList.remove('nordic-hidden');

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

function saveAsText() {
    const text = elements.ocrTextOutput.value;
    if (!text) {
        showToast('沒有可儲存的文字', 'warning');
        return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // 確保檔名正確
    const baseName = state.fileName.replace(/\.[^.]+$/, '') || 'ocr_result';
    a.download = baseName + '_ocr.txt';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('已儲存文字檔');
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

function saveImage() {
    if (!state.originalImage) return;

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
    } else {
        mimeType = 'image/png';
        extension = 'png';
    }

    const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

    // 產生檔名
    const baseName = state.fileName.replace(/\.[^.]+$/, '') || 'image';
    const downloadName = `${baseName}_edited.${extension}`;

    outputCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        hideLoading();
        showToast(`已儲存為 ${downloadName}`);
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

        // Ctrl/Cmd + S 儲存
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (state.originalImage) saveImage();
        }

        // Ctrl/Cmd + O 開啟
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            elements.fileInput.click();
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
}

// 裁切區域拖曳處理（改進版 - 支援四邊拖曳）
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
            else if (classes.includes('n')) dragType = 'n';
            else if (classes.includes('s')) dragType = 's';
            else if (classes.includes('e')) dragType = 'e';
            else if (classes.includes('w')) dragType = 'w';
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
        const canvas = elements.imageCanvas;
        const minSize = 30;

        switch (dragType) {
            case 'move':
                state.cropRect.x = Math.max(0, Math.min(canvas.width - state.cropRect.width, startRect.x + dx));
                state.cropRect.y = Math.max(0, Math.min(canvas.height - state.cropRect.height, startRect.y + dy));
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
                    const newWidth = Math.max(minSize, Math.min(canvas.width - startRect.x, startRect.width + dx));
                    const newY = Math.max(0, Math.min(startRect.y + startRect.height - minSize, startRect.y + dy));
                    state.cropRect.width = newWidth;
                    state.cropRect.height = startRect.height + (startRect.y - newY);
                    state.cropRect.y = newY;
                }
                break;
            case 'sw':
                {
                    const newX = Math.max(0, Math.min(startRect.x + startRect.width - minSize, startRect.x + dx));
                    const newHeight = Math.max(minSize, Math.min(canvas.height - startRect.y, startRect.height + dy));
                    state.cropRect.width = startRect.width + (startRect.x - newX);
                    state.cropRect.height = newHeight;
                    state.cropRect.x = newX;
                }
                break;
            case 'se':
                state.cropRect.width = Math.max(minSize, Math.min(canvas.width - startRect.x, startRect.width + dx));
                state.cropRect.height = Math.max(minSize, Math.min(canvas.height - startRect.y, startRect.height + dy));
                break;
            case 'n':
                {
                    const newY = Math.max(0, Math.min(startRect.y + startRect.height - minSize, startRect.y + dy));
                    state.cropRect.height = startRect.height + (startRect.y - newY);
                    state.cropRect.y = newY;
                }
                break;
            case 's':
                state.cropRect.height = Math.max(minSize, Math.min(canvas.height - startRect.y, startRect.height + dy));
                break;
            case 'e':
                state.cropRect.width = Math.max(minSize, Math.min(canvas.width - startRect.x, startRect.width + dx));
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

    const viewport = elements.imageViewport;

    viewport.addEventListener('mousedown', (e) => {
        if (!state.isSelectingOCRRegion) return;

        const rect = viewport.getBoundingClientRect();
        const canvasRect = elements.imageCanvas.getBoundingClientRect();

        // 檢查是否在圖片範圍內
        if (e.clientX < canvasRect.left || e.clientX > canvasRect.right ||
            e.clientY < canvasRect.top || e.clientY > canvasRect.bottom) {
            return;
        }

        isDrawing = true;
        startX = e.clientX - canvasRect.left;
        startY = e.clientY - canvasRect.top;

        // 初始化選擇框
        if (elements.ocrRegionBox) {
            elements.ocrRegionBox.style.left = startX + 'px';
            elements.ocrRegionBox.style.top = startY + 'px';
            elements.ocrRegionBox.style.width = '0px';
            elements.ocrRegionBox.style.height = '0px';
            elements.ocrRegionBox.style.display = 'block';
        }

        e.preventDefault();
    });

    viewport.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;

        const canvasRect = elements.imageCanvas.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(elements.imageCanvas.width, e.clientX - canvasRect.left));
        const currentY = Math.max(0, Math.min(elements.imageCanvas.height, e.clientY - canvasRect.top));

        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        if (elements.ocrRegionBox) {
            elements.ocrRegionBox.style.left = x + 'px';
            elements.ocrRegionBox.style.top = y + 'px';
            elements.ocrRegionBox.style.width = width + 'px';
            elements.ocrRegionBox.style.height = height + 'px';
        }

        state.ocrRegion = { x, y, width, height };
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

// ========================================
// 12. 初始化
// ========================================

function init() {
    initEventListeners();
    updateStatus('就緒 - 請選擇或拖放圖片');
    console.log('Image Viewer OCR initialized');
}

document.addEventListener('DOMContentLoaded', init);

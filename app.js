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
}

// ========================================
// 4. 圖片載入和顯示
// ========================================

// 載入圖片檔案
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
            state.aspectRatio = img.width / img.height;

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

// 調整圖片大小以適合視窗
function fitImageToViewport() {
    if (!state.originalImage) return;

    const viewport = elements.imageViewport;
    const maxWidth = viewport.clientWidth - 48;
    const maxHeight = viewport.clientHeight - 48;

    const scale = Math.min(
        maxWidth / state.imageWidth,
        maxHeight / state.imageHeight,
        1 // 不放大超過 100%
    );

    state.zoom = scale;
    updateZoomDisplay();
    renderCanvas();
}

// 更新縮放顯示
function updateZoomDisplay() {
    elements.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
}

// 繪製 Canvas
function renderCanvas() {
    const width = Math.round(state.imageWidth * state.zoom);
    const height = Math.round(state.imageHeight * state.zoom);

    elements.imageCanvas.width = width;
    elements.imageCanvas.height = height;

    ctx.drawImage(state.originalImage, 0, 0, width, height);
}

// ========================================
// 5. 影像處理效果
// ========================================

// 濾鏡定義
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

// 套用所有效果
function applyAllEffects() {
    if (!state.originalImage) return;

    // 繪製原始圖片
    renderCanvas();

    // 取得像素資料
    const imageData = ctx.getImageData(0, 0, elements.imageCanvas.width, elements.imageCanvas.height);
    const data = imageData.data;

    // 套用調整
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

        // 亮部/陰影（簡化版）
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

        // 限制範圍
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    // 套用 CSS 濾鏡
    elements.imageCanvas.style.filter = filters[state.activeFilter] || '';
}

// 自動色階
function autoAdjust() {
    if (!state.originalImage) return;

    showLoading('自動調整中...');

    // 分析圖片直方圖
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

    // 計算建議調整值
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    const avgL = (avgR + avgG + avgB) / 3;

    // 自動調整曝光和對比
    state.adjustments.exposure = Math.round((128 - avgL) / 2);
    state.adjustments.contrast = Math.round((255 / (maxL - minL + 1) - 1) * 30);

    // 限制調整範圍
    state.adjustments.exposure = Math.max(-50, Math.min(50, state.adjustments.exposure));
    state.adjustments.contrast = Math.max(-30, Math.min(30, state.adjustments.contrast));

    // 更新 UI
    updateSliderValues();
    applyAllEffects();

    hideLoading();
    showToast('已套用自動色階');
}

// 重置調整
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

// 更新滑桿值顯示
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

// 更新濾鏡選擇狀態
function updateFilterSelection() {
    document.querySelectorAll('.filter-item').forEach(item => {
        item.classList.toggle('active', item.dataset.filter === state.activeFilter);
    });
}

// ========================================
// 6. 裁切功能
// ========================================

function startCrop() {
    if (!state.originalImage || state.isCropping) return;

    state.isCropping = true;
    elements.btnCrop.classList.add('active');
    elements.cropOverlay.classList.remove('nordic-hidden');

    // 初始化裁切區域（預設為圖片中心 80%）
    const canvas = elements.imageCanvas;
    const margin = 0.1;
    state.cropRect = {
        x: canvas.width * margin,
        y: canvas.height * margin,
        width: canvas.width * (1 - 2 * margin),
        height: canvas.height * (1 - 2 * margin)
    };

    updateCropArea();
    updateStatus('拖曳調整裁切區域，按 Enter 確認或 Esc 取消');
}

function updateCropArea() {
    const crop = elements.cropArea;
    crop.style.left = state.cropRect.x + 'px';
    crop.style.top = state.cropRect.y + 'px';
    crop.style.width = state.cropRect.width + 'px';
    crop.style.height = state.cropRect.height + 'px';
}

function applyCrop() {
    if (!state.isCropping) return;

    showLoading('裁切中...');

    // 計算實際裁切區域（對應原始圖片尺寸）
    const scaleX = state.imageWidth / elements.imageCanvas.width;
    const scaleY = state.imageHeight / elements.imageCanvas.height;

    const cropX = Math.round(state.cropRect.x * scaleX);
    const cropY = Math.round(state.cropRect.y * scaleY);
    const cropW = Math.round(state.cropRect.width * scaleX);
    const cropH = Math.round(state.cropRect.height * scaleY);

    // 創建新的裁切後圖片
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropW;
    tempCanvas.height = cropH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(state.originalImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // 更新狀態
    const img = new Image();
    img.onload = () => {
        state.originalImage = img;
        state.imageWidth = cropW;
        state.imageHeight = cropH;
        state.aspectRatio = cropW / cropH;

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
// 7. 尺寸調整
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

    // 創建新尺寸的圖片
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
// 8. OCR 文字辨識
// ========================================

async function startOCR() {
    if (!state.originalImage) return;

    showLoading('正在辨識文字...');
    updateStatus('OCR 處理中...');

    try {
        // 使用 Tesseract.js 進行 OCR
        const result = await Tesseract.recognize(
            elements.imageCanvas,
            'chi_tra+eng', // 繁體中文 + 英文
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

        // 顯示辨識結果
        const text = result.data.text.trim();
        elements.ocrTextOutput.value = text;
        elements.ocrResultPanel.classList.remove('nordic-hidden');

        // 在圖片上標記文字區域
        renderOCROverlay();

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

// 繪製 OCR 文字覆蓋層
function renderOCROverlay() {
    const layer = elements.ocrTextLayer;
    layer.innerHTML = '';

    const scaleX = elements.imageCanvas.width / state.imageWidth;
    const scaleY = elements.imageCanvas.height / state.imageHeight;

    // 取得 canvas 在 viewport 中的位置
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

        // 點擊選取文字
        div.addEventListener('click', () => toggleWordSelection(div, word));

        layer.appendChild(div);
    });

    elements.ocrOverlay.classList.remove('nordic-hidden');
}

// 選取/取消選取文字
function toggleWordSelection(div, word) {
    div.classList.toggle('selected');
    updateSelectedText();
}

// 更新已選取的文字
function updateSelectedText() {
    const selectedWords = Array.from(document.querySelectorAll('.ocr-word.selected'))
        .map(el => el.dataset.text)
        .join(' ');

    if (selectedWords) {
        // 如果有選取的文字，顯示在輸出區
        state.selectedText = selectedWords;
    }
}

// 複製文字
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

// 儲存為 TXT
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
    a.download = state.fileName.replace(/\.[^.]+$/, '') + '_ocr.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('已儲存文字檔');
}

// 關閉 OCR 面板
function closeOCRPanel() {
    state.isOCRMode = false;
    elements.ocrResultPanel.classList.add('nordic-hidden');
    elements.ocrOverlay.classList.add('nordic-hidden');
    elements.ocrTextLayer.innerHTML = '';
    updateStatus('就緒');
}

// ========================================
// 9. 儲存圖片
// ========================================

function saveImage() {
    if (!state.originalImage) return;

    showLoading('儲存中...');

    // 創建輸出用的 canvas（原始尺寸）
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = state.imageWidth;
    outputCanvas.height = state.imageHeight;
    const outputCtx = outputCanvas.getContext('2d');

    // 繪製原始尺寸圖片
    outputCtx.drawImage(state.originalImage, 0, 0);

    // 套用效果（重新在原始尺寸上處理）
    const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    // ... 這裡可以加入完整的效果處理，類似 applyAllEffects
    outputCtx.putImageData(imageData, 0, 0);

    // 下載
    const format = state.fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const quality = format === 'image/jpeg' ? 0.92 : undefined;

    outputCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = state.fileName.replace(/(\.[^.]+)$/, '_edited$1');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        hideLoading();
        showToast('圖片已儲存');
    }, format, quality);
}

// ========================================
// 10. 事件監聽器
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
        if (state.isCropping) {
            if (e.key === 'Enter') {
                applyCrop();
            } else if (e.key === 'Escape') {
                cancelCrop();
            }
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
}

// 裁切區域拖曳處理
function initCropDragHandlers() {
    let isDragging = false;
    let dragType = null;
    let startX, startY;
    let startRect = {};

    elements.cropArea.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('crop-handle')) {
            dragType = e.target.className.replace('crop-handle ', '');
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

        if (dragType === 'move') {
            state.cropRect.x = Math.max(0, Math.min(canvas.width - state.cropRect.width, startRect.x + dx));
            state.cropRect.y = Math.max(0, Math.min(canvas.height - state.cropRect.height, startRect.y + dy));
        } else if (dragType.includes('se')) {
            state.cropRect.width = Math.max(50, Math.min(canvas.width - startRect.x, startRect.width + dx));
            state.cropRect.height = Math.max(50, Math.min(canvas.height - startRect.y, startRect.height + dy));
        } else if (dragType.includes('sw')) {
            const newX = Math.max(0, startRect.x + dx);
            state.cropRect.width = Math.max(50, startRect.width - (newX - startRect.x));
            state.cropRect.x = newX;
            state.cropRect.height = Math.max(50, Math.min(canvas.height - startRect.y, startRect.height + dy));
        } else if (dragType.includes('ne')) {
            state.cropRect.width = Math.max(50, Math.min(canvas.width - startRect.x, startRect.width + dx));
            const newY = Math.max(0, startRect.y + dy);
            state.cropRect.height = Math.max(50, startRect.height - (newY - startRect.y));
            state.cropRect.y = newY;
        } else if (dragType.includes('nw')) {
            const newX = Math.max(0, startRect.x + dx);
            const newY = Math.max(0, startRect.y + dy);
            state.cropRect.width = Math.max(50, startRect.width - (newX - startRect.x));
            state.cropRect.height = Math.max(50, startRect.height - (newY - startRect.y));
            state.cropRect.x = newX;
            state.cropRect.y = newY;
        }

        updateCropArea();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragType = null;
    });
}

// ========================================
// 11. 初始化
// ========================================

function init() {
    initEventListeners();
    updateStatus('就緒 - 請選擇或拖放圖片');
    console.log('Image Viewer OCR initialized');
}

// 啟動應用
document.addEventListener('DOMContentLoaded', init);

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'Image Viewer OCR',
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 15, y: 15 },
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        },
        backgroundColor: '#f8f9fa'
    });

    // 載入 index.html
    mainWindow.loadFile('index.html');

    // 開發時開啟 DevTools
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 建立應用程式選單
function createMenu() {
    const template = [
        {
            label: 'Image Viewer OCR',
            submenu: [
                { role: 'about', label: '關於 Image Viewer OCR' },
                { type: 'separator' },
                { role: 'hide', label: '隱藏' },
                { role: 'hideOthers', label: '隱藏其他' },
                { role: 'unhide', label: '顯示全部' },
                { type: 'separator' },
                { role: 'quit', label: '結束' }
            ]
        },
        {
            label: '檔案',
            submenu: [
                {
                    label: '開啟...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('document.getElementById("file-input").click()');
                    }
                },
                {
                    label: '儲存',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        // 呼叫正確的函數名稱
                        mainWindow.webContents.executeJavaScript('typeof saveImage === "function" && state.originalImage && saveImage()');
                    }
                },
                { type: 'separator' },
                { role: 'close', label: '關閉視窗' }
            ]
        },
        {
            label: '編輯',
            submenu: [
                {
                    label: '復原',
                    accelerator: 'CmdOrCtrl+Z',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('typeof undo === "function" && undo()');
                    }
                },
                {
                    label: '重做',
                    accelerator: 'CmdOrCtrl+Shift+Z',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('typeof redo === "function" && redo()');
                    }
                },
                { type: 'separator' },
                { role: 'cut', label: '剪下' },
                { role: 'copy', label: '複製' },
                { role: 'paste', label: '貼上' },
                { role: 'selectAll', label: '全選' }
            ]
        },
        {
            label: '檢視',
            submenu: [
                { role: 'reload', label: '重新載入' },
                { role: 'toggleDevTools', label: '開發者工具' },
                { type: 'separator' },
                { role: 'resetZoom', label: '實際大小' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '縮小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '全螢幕' }
            ]
        },
        {
            label: '視窗',
            submenu: [
                { role: 'minimize', label: '最小化' },
                { role: 'zoom', label: '縮放' },
                { type: 'separator' },
                { role: 'front', label: '移到最前面' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow();
    createMenu();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

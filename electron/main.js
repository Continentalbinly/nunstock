const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

// ═══════════════════════════════════════════════
//  Config
// ═══════════════════════════════════════════════
const APP_URL = "https://nunmechanic.com";
const isDev = !app.isPackaged;

let mainWindow = null;

// ═══════════════════════════════════════════════
//  Create Window
// ═══════════════════════════════════════════════
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: "นันการช่าง",
        icon: path.join(__dirname, "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        show: false,
    });

    // Show window when ready (prevents white flash)
    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });

    // Load the web app
    mainWindow.loadURL(APP_URL);

    // Handle window title
    mainWindow.on("page-title-updated", (e) => {
        e.preventDefault();
        mainWindow.setTitle("นันการช่าง");
    });

    // Handle external links - open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.startsWith(APP_URL)) {
            require("electron").shell.openExternal(url);
            return { action: "deny" };
        }
        return { action: "allow" };
    });

    // Handle navigation errors
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        if (errorCode === -3) return; // Ignore aborted navigations
        console.error(`Load failed: ${errorDescription} (${errorCode})`);
        // Show offline message
        mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0F172A;color:#94A3B8;font-family:sans-serif;flex-direction:column">
          <h1 style="color:#E2E8F0;font-size:24px">ไม่สามารถเชื่อมต่อได้</h1>
          <p style="margin-top:8px">กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</p>
          <button onclick="location.href='${APP_URL}'" style="margin-top:24px;padding:10px 24px;background:#10B981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">ลองใหม่</button>
        </body>
      </html>
    `);
    });
}

// ═══════════════════════════════════════════════
//  Silent Print (Barcode / Xprinter)
// ═══════════════════════════════════════════════
ipcMain.handle("get-printers", async () => {
    const printers = mainWindow.webContents.getPrintersAsync
        ? await mainWindow.webContents.getPrintersAsync()
        : mainWindow.webContents.getPrinters();
    return printers;
});

// Print barcode using a dedicated hidden window (fixes blank page issue)
ipcMain.handle("print-barcode", async (event, { imageDataUrl, printerName, width, height }) => {
    return new Promise((resolve, reject) => {
        const printWindow = new BrowserWindow({
            width: width || 280,
            height: height || 150,
            show: false,
            webPreferences: { contextIsolation: true },
        });

        const html = `
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; }
                    body { display: flex; align-items: center; justify-content: center; }
                    img { max-width: 100%; height: auto; }
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <img src="${imageDataUrl}" />
            </body>
            </html>
        `;

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        printWindow.webContents.on("did-finish-load", () => {
            const printOptions = {
                silent: true,
                printBackground: true,
                margins: { marginType: "none" },
            };

            if (printerName) {
                printOptions.deviceName = printerName;
            }

            printWindow.webContents.print(printOptions, (success, failureReason) => {
                printWindow.close();
                if (success) {
                    resolve({ success: true });
                } else {
                    reject(new Error(failureReason || "Print failed"));
                }
            });
        });
    });
});

// Silent print for test/general use
ipcMain.handle("silent-print", async (event, options = {}) => {
    return new Promise((resolve, reject) => {
        const printOptions = {
            silent: true,
            printBackground: true,
            ...options,
        };
        if (options.printerName) {
            printOptions.deviceName = options.printerName;
        }
        mainWindow.webContents.print(printOptions, (success, failureReason) => {
            if (success) {
                resolve({ success: true });
            } else {
                reject(new Error(failureReason || "Print failed"));
            }
        });
    });
});

// ═══════════════════════════════════════════════
//  App Lifecycle
// ═══════════════════════════════════════════════
app.whenReady().then(() => {
    createWindow();

    // Check for updates (production only)
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify().catch(() => { });
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// ═══════════════════════════════════════════════
//  Auto Updater Events
// ═══════════════════════════════════════════════
autoUpdater.on("update-available", () => {
    mainWindow?.webContents.send("update-available");
});

autoUpdater.on("update-downloaded", () => {
    dialog
        .showMessageBox(mainWindow, {
            type: "info",
            title: "อัพเดตพร้อมแล้ว",
            message: "มีเวอร์ชันใหม่ อยากรีสตาร์ทเพื่ออัพเดตเลยไหม?",
            buttons: ["อัพเดตเลย", "ทีหลัง"],
        })
        .then(({ response }) => {
            if (response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
});

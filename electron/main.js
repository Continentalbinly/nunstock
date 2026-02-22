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

// Print barcode using a dedicated hidden window
// Uses base64 HTML to avoid double-encoding of the barcode data URL
ipcMain.handle("print-barcode", async (event, { imageDataUrl, printerName, width, height }) => {
    return new Promise((resolve, reject) => {
        try {
            const printWindow = new BrowserWindow({
                width: width || 280,
                height: height || 150,
                show: false,
                webPreferences: { contextIsolation: true },
            });

            const htmlContent = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
img{max-width:100%;height:auto}
@media print{@page{margin:0;size:auto}body{margin:0}}
</style></head>
<body><img src="${imageDataUrl}"/></body></html>`;

            // Use base64 encoding to avoid URL encoding issues with data URLs
            const base64Html = Buffer.from(htmlContent).toString("base64");
            printWindow.loadURL(`data:text/html;base64,${base64Html}`);

            printWindow.webContents.on("did-finish-load", () => {
                // Wait a bit for the image to render
                setTimeout(() => {
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
                }, 300);
            });

            // Timeout safety
            setTimeout(() => {
                if (!printWindow.isDestroyed()) {
                    printWindow.close();
                    reject(new Error("Print timeout"));
                }
            }, 10000);
        } catch (err) {
            reject(err);
        }
    });
});

// Test print - prints a test pattern (not the current page)
ipcMain.handle("test-print", async (event, { printerName }) => {
    return new Promise((resolve, reject) => {
        try {
            const printWindow = new BrowserWindow({
                width: 280,
                height: 150,
                show: false,
                webPreferences: { contextIsolation: true },
            });

            const testHtml = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0}
body{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-family:sans-serif}
.box{border:2px solid #000;padding:10px 20px;text-align:center}
.title{font-size:14px;font-weight:bold}
.sub{font-size:10px;color:#666;margin-top:4px}
@media print{@page{margin:0;size:auto}}
</style></head>
<body>
<div class="box">
<div class="title">นันการช่าง</div>
<div class="sub">ทดสอบเครื่องปริ้น ✓</div>
</div>
</body></html>`;

            const base64Html = Buffer.from(testHtml).toString("base64");
            printWindow.loadURL(`data:text/html;base64,${base64Html}`);

            printWindow.webContents.on("did-finish-load", () => {
                setTimeout(() => {
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
                }, 300);
            });

            setTimeout(() => {
                if (!printWindow.isDestroyed()) {
                    printWindow.close();
                    reject(new Error("Print timeout"));
                }
            }, 10000);
        } catch (err) {
            reject(err);
        }
    });
});

// ═══════════════════════════════════════════════
//  App Lifecycle
// ═══════════════════════════════════════════════
app.whenReady().then(() => {
    createWindow();

    // Check for updates (production only)
    if (!isDev) {
        // Check on startup (with delay to not block launch)
        setTimeout(() => {
            console.log(`[AutoUpdate] Current version: ${app.getVersion()}`);
            autoUpdater.checkForUpdates().catch(() => { });
        }, 5000);

        // Check every 30 minutes
        setInterval(() => {
            autoUpdater.checkForUpdates().catch(() => { });
        }, 30 * 60 * 1000);
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
autoUpdater.on("checking-for-update", () => {
    console.log("[AutoUpdate] Checking for updates...");
});

autoUpdater.on("update-available", (info) => {
    console.log(`[AutoUpdate] Update available: v${info.version}`);
    mainWindow?.webContents.send("update-available");
});

autoUpdater.on("update-not-available", () => {
    console.log("[AutoUpdate] Already up to date");
});

autoUpdater.on("download-progress", (progress) => {
    console.log(`[AutoUpdate] Downloading: ${Math.round(progress.percent)}%`);
});

autoUpdater.on("update-downloaded", (info) => {
    console.log(`[AutoUpdate] Update downloaded: v${info.version}`);
    dialog
        .showMessageBox(mainWindow, {
            type: "info",
            title: "🔄 อัพเดตพร้อมแล้ว!",
            message: `เวอร์ชันใหม่ v${info.version} พร้อมติดตั้ง\n(ปัจจุบัน: v${app.getVersion()})\n\nรีสตาร์ทเพื่ออัพเดตเลยไหม?`,
            buttons: ["อัพเดตเลย", "ทีหลัง"],
            defaultId: 0,
        })
        .then(({ response }) => {
            if (response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
});

autoUpdater.on("error", (err) => {
    console.error("[AutoUpdate] Error:", err.message);
});

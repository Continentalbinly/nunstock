const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to the renderer (web page)
contextBridge.exposeInMainWorld("electronAPI", {
    // Check if running in Electron
    isElectron: true,

    // Get list of available printers
    getPrinters: () => ipcRenderer.invoke("get-printers"),

    // Silent print (for test print on settings page)
    silentPrint: (options) => ipcRenderer.invoke("silent-print", options),

    // Print barcode image directly (uses hidden window for clean output)
    printBarcode: (options) => ipcRenderer.invoke("print-barcode", options),

    // Print to PDF
    printToPDF: () => ipcRenderer.invoke("print-to-pdf"),

    // Listen for update notifications
    onUpdateAvailable: (callback) => {
        ipcRenderer.on("update-available", callback);
    },
});

const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to the renderer (web page)
contextBridge.exposeInMainWorld("electronAPI", {
    // Check if running in Electron
    isElectron: true,

    // Get list of available printers
    getPrinters: () => ipcRenderer.invoke("get-printers"),

    // Print barcode image (uses dedicated hidden window)
    printBarcode: (options) => ipcRenderer.invoke("print-barcode", options),

    // Test print (prints a test pattern)
    testPrint: (options) => ipcRenderer.invoke("test-print", options),

    // Listen for update notifications
    onUpdateAvailable: (callback) => {
        ipcRenderer.on("update-available", callback);
    },
});

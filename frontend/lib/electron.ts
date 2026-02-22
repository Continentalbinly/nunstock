/**
 * Electron Print Helper
 * ตรวจจับว่ารันใน Electron หรือไม่ และใช้ silent print ถ้าใช่
 */

interface ElectronAPI {
    isElectron: boolean;
    getPrinters: () => Promise<any[]>;
    silentPrint: (options?: { printerName?: string; copies?: number }) => Promise<{ success: boolean }>;
    printToPDF: () => Promise<Buffer>;
    onUpdateAvailable: (callback: () => void) => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

/** ตรวจว่ารันอยู่ใน Electron หรือไม่ */
export function isElectron(): boolean {
    return !!(typeof window !== "undefined" && window.electronAPI?.isElectron);
}

/** ดึงรายชื่อเครื่องปริ้นทั้งหมด */
export async function getAvailablePrinters(): Promise<any[]> {
    if (!isElectron()) return [];
    return window.electronAPI!.getPrinters();
}

/**
 * ปริ้นเงียบ (silent print) - ไม่มี preview dialog
 * ใช้ได้เฉพาะใน Electron เท่านั้น
 * ถ้าไม่ใช่ Electron จะ fallback เป็น window.print()
 */
export async function silentPrint(options?: {
    printerName?: string;
    copies?: number;
}): Promise<boolean> {
    if (isElectron()) {
        try {
            const result = await window.electronAPI!.silentPrint(options);
            return result.success;
        } catch (err) {
            console.error("Silent print failed:", err);
            // Fallback to normal print
            window.print();
            return false;
        }
    }

    // Fallback: normal browser print
    window.print();
    return true;
}

/**
 * Electron Print Helper
 * ตรวจจับว่ารันใน Electron หรือไม่ และใช้ print API ถ้าใช่
 */

interface ElectronAPI {
    isElectron: boolean;
    getPrinters: () => Promise<any[]>;
    printBarcode: (options: { imageDataUrl: string; printerName?: string; width?: number; height?: number }) => Promise<{ success: boolean }>;
    testPrint: (options: { printerName: string }) => Promise<{ success: boolean }>;
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
 * ปริ้นบาร์โค้ด — ใช้หน้าต่างแยกเฉพาะบาร์โค้ด
 * จะไม่ปริ้นหน้าเว็บทั้งหมด แก้ปัญหากระดาษเปล่า
 */
export async function printBarcode(options: {
    imageDataUrl: string;
    printerName?: string;
    width?: number;
    height?: number;
}): Promise<{ success: boolean; error?: string }> {
    if (isElectron()) {
        try {
            const result = await window.electronAPI!.printBarcode(options);
            return { success: result.success };
        } catch (err: any) {
            console.error("Barcode print failed:", err);
            return { success: false, error: err.message || "ปริ้นไม่สำเร็จ" };
        }
    }
    // Fallback: normal browser print
    window.print();
    return { success: true };
}

/**
 * ทดสอบปริ้น — ปริ้น test pattern (กล่องข้อความ "นันการช่าง ✓")
 */
export async function testPrint(printerName: string): Promise<{ success: boolean; error?: string }> {
    if (isElectron()) {
        try {
            const result = await window.electronAPI!.testPrint({ printerName });
            return { success: result.success };
        } catch (err: any) {
            console.error("Test print failed:", err);
            return { success: false, error: err.message || "ทดสอบปริ้นไม่สำเร็จ" };
        }
    }
    return { success: false, error: "ใช้ได้เฉพาะแอป Desktop" };
}

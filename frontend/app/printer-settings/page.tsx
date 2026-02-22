"use client";
import { useEffect, useState } from "react";
import { isElectron, getAvailablePrinters } from "@/lib/electron";
import { Printer, CheckCircle, XCircle, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

interface PrinterInfo {
    name: string;
    displayName: string;
    isDefault: boolean;
    status: number;
}

export default function PrinterSettingsPage() {
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [testPrinting, setTestPrinting] = useState(false);
    const [isElectronApp, setIsElectronApp] = useState(false);

    useEffect(() => {
        setIsElectronApp(isElectron());
        const saved = localStorage.getItem("nunmechanic-printer");
        if (saved) setSelectedPrinter(saved);
        loadPrinters();
    }, []);

    const loadPrinters = async () => {
        setLoading(true);
        try {
            const list = await getAvailablePrinters();
            setPrinters(list);
            // Auto-select default printer if none saved
            if (!selectedPrinter && list.length > 0) {
                const defaultPrinter = list.find((p: PrinterInfo) => p.isDefault);
                if (defaultPrinter) {
                    setSelectedPrinter(defaultPrinter.name);
                    localStorage.setItem("nunmechanic-printer", defaultPrinter.name);
                }
            }
        } catch {
            setPrinters([]);
        }
        setLoading(false);
    };

    const selectPrinter = (name: string) => {
        setSelectedPrinter(name);
        localStorage.setItem("nunmechanic-printer", name);
        toast.success(`เลือกเครื่องปริ้น: ${name}`);
    };

    const testPrint = async () => {
        if (!selectedPrinter || !isElectronApp) return;
        setTestPrinting(true);
        try {
            await window.electronAPI!.silentPrint({ printerName: selectedPrinter });
            toast.success("ปริ้นทดสอบสำเร็จ!");
        } catch (err: any) {
            toast.error(`ปริ้นไม่สำเร็จ: ${err.message}`);
        }
        setTestPrinting(false);
    };

    // Web version - show message
    if (!isElectronApp) {
        return (
            <div className="p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>ตั้งค่าเครื่องปริ้น</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>จัดการเครื่องปริ้นสำหรับพิมพ์บาร์โค้ด</p>
                </div>
                <div className="rounded-2xl p-8 text-center" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <Printer className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--t-text-muted)" }} />
                    <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--t-text)" }}>ใช้ได้เฉพาะแอป Desktop</h2>
                    <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>
                        การเชื่อมต่อเครื่องปริ้นโดยตรงใช้ได้เฉพาะแอป Desktop (Electron) เท่านั้น
                    </p>
                    <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                        ดาวน์โหลดแอป Desktop ได้ที่หน้า Login → ปุ่ม &quot;Windows (.exe)&quot;
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>ตั้งค่าเครื่องปริ้น</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกเครื่องปริ้นสำหรับพิมพ์บาร์โค้ด</p>
                </div>
                <button
                    onClick={loadPrinters}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                    style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", color: "var(--t-text-secondary)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f680"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; }}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    รีเฟรช
                </button>
            </div>

            {/* Connection Status */}
            <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-3 rounded-full ${printers.length > 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                    <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>
                        {printers.length > 0
                            ? `พบ ${printers.length} เครื่องปริ้น`
                            : "ไม่พบเครื่องปริ้น"
                        }
                    </p>
                </div>
                {selectedPrinter && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.1)" }}>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm" style={{ color: "var(--t-text)" }}>
                            ใช้งานอยู่: <span className="font-semibold">{selectedPrinter}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Printer List */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "var(--t-text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังค้นหาเครื่องปริ้น...</p>
                </div>
            ) : printers.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--t-text)" }}>ไม่พบเครื่องปริ้น</h2>
                    <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                        กรุณาตรวจสอบว่าเครื่องปริ้นเปิดอยู่และเชื่อมต่อกับคอมพิวเตอร์แล้ว
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {printers.map((printer) => {
                        const isSelected = selectedPrinter === printer.name;
                        return (
                            <div
                                key={printer.name}
                                onClick={() => selectPrinter(printer.name)}
                                className="rounded-xl p-4 transition-all duration-200 cursor-pointer"
                                style={{
                                    background: "var(--t-card)",
                                    border: isSelected ? "2px solid #10B981" : "1px solid var(--t-border-subtle)",
                                }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#3b82f680"; }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "var(--t-border-subtle)"; }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: isSelected ? "rgba(16,185,129,0.1)" : "var(--t-input-bg)" }}>
                                            <Printer className="w-5 h-5" style={{ color: isSelected ? "#10B981" : "var(--t-text-muted)" }} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>{printer.displayName || printer.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {printer.isDefault && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">ค่าเริ่มต้น</span>
                                                )}
                                                <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>{printer.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Test Print */}
            {selectedPrinter && (
                <div className="mt-6">
                    <button
                        onClick={testPrint}
                        disabled={testPrinting}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                        style={{ background: "#10B981", color: "white" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#34D399"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#10B981"; }}
                    >
                        <Zap className="w-4 h-4" />
                        {testPrinting ? "กำลังปริ้น..." : "ทดสอบปริ้น"}
                    </button>
                    <p className="text-xs mt-2" style={{ color: "var(--t-text-dim)" }}>
                        กดเพื่อทดสอบว่าเครื่องปริ้นทำงานปกติ
                    </p>
                </div>
            )}
        </div>
    );
}

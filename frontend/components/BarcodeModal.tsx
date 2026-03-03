"use client";
import { useEffect, useRef, useState } from "react";
import { X, Printer } from "lucide-react";
import { isElectron, printBarcode } from "@/lib/electron";
import { toast } from "sonner";

interface BarcodeModalProps {
    part: any | null;
    onClose: () => void;
}

export default function BarcodeModal({ part, onClose }: BarcodeModalProps) {
    const barcodeRef = useRef<HTMLCanvasElement>(null);
    const [printQty, setPrintQty] = useState(1);

    useEffect(() => {
        if (part && barcodeRef.current) {
            import("jsbarcode").then((JsBarcode) => {
                JsBarcode.default(barcodeRef.current, part.code, {
                    format: "CODE128", width: 3, height: 80, displayValue: true,
                    background: "#FFFFFF", lineColor: "#000000", fontSize: 24,
                    font: "'Courier New', monospace", fontOptions: "bold", margin: 14, textMargin: 10,
                });
            });
        }
        setPrintQty(1);
    }, [part]);

    if (!part) return null;

    const handlePrint = async () => {
        if (!barcodeRef.current) return;
        const dataUrl = barcodeRef.current.toDataURL("image/png");

        if (isElectron()) {
            const savedPrinter = localStorage.getItem("nunmechanic-printer") || undefined;
            if (!savedPrinter) { toast.error("กรุณาเลือกเครื่องปริ้นก่อนที่หน้า 'เครื่องปริ้น'"); return; }
            let successCount = 0;
            for (let i = 0; i < printQty; i++) {
                const result = await printBarcode({ imageDataUrl: dataUrl, printerName: savedPrinter });
                if (result.success) successCount++;
            }
            if (successCount === printQty) toast.success(`ปริ้นบาร์โค้ด ${printQty} แผ่นสำเร็จ!`);
            else toast.error(`ปริ้นสำเร็จ ${successCount}/${printQty} แผ่น`);
        } else {
            const container = document.createElement("div");
            container.id = "barcode-print";
            container.innerHTML = Array(printQty).fill(`<img src="${dataUrl}" />`).join("");
            document.body.appendChild(container);
            setTimeout(() => {
                window.print();
                setTimeout(() => { if (container.parentNode) container.parentNode.removeChild(container); }, 500);
            }, 100);
        }
    };

    const inputStyle: React.CSSProperties = { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center no-print"
            style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }}
            onClick={onClose}>
            <div className="rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl"
                style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold" style={{ color: "var(--t-text)" }}>บาร์โค้ด</h3>
                    <button onClick={onClose} className="p-1 rounded-lg transition-colors cursor-pointer"
                        style={{ color: "var(--t-text-muted)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Part Info */}
                <div className="rounded-lg p-3 mb-4" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                    <p className="font-medium" style={{ color: "var(--t-text)" }}>{part.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{part.code}</span>
                        {part.brand && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>• {part.brand}</span>}
                        {part.category?.name && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>• {part.category.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>คงเหลือ:</span>
                        <span className={`text-sm font-bold ${part.quantity <= part.minStock ? "text-red-500" : "text-emerald-500"}`}>
                            {part.quantity} {part.unit}
                        </span>
                    </div>
                </div>

                {/* Barcode Canvas */}
                <div className="bg-white rounded-xl p-4 flex justify-center print-area overflow-hidden">
                    <canvas ref={barcodeRef} style={{ maxWidth: "100%", height: "auto" }} />
                </div>

                {/* Print Quantity */}
                <div className="flex items-center justify-between mt-4 p-3 rounded-lg" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                    <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>จำนวนแผ่นที่จะปริ้น</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPrintQty(q => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                            style={inputStyle}>−</button>
                        <input type="number" value={printQty}
                            onChange={e => setPrintQty(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                            className="w-12 text-center text-sm font-bold rounded-lg py-1 focus:outline-none"
                            style={inputStyle} min={1} max={99} />
                        <button onClick={() => setPrintQty(q => Math.min(99, q + 1))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                            style={inputStyle}>+</button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                    <button onClick={() => { onClose(); setPrintQty(1); }}
                        className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
                        style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>
                        ปิด
                    </button>
                    <button onClick={handlePrint}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2">
                        <Printer className="w-4 h-4" /> พิมพ์ {printQty > 1 ? `${printQty} แผ่น` : "บาร์โค้ด"}
                    </button>
                </div>
            </div>
        </div>
    );
}

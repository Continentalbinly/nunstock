"use client";
import { useEffect, useRef, useCallback } from "react";
import { useCart } from "@/components/CartContext";
import { toast } from "sonner";

// ============================================================
// Inline SVG Icons — ไม่ import lucide-react
// ============================================================
const IconX = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
const IconPackage = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className || "w-5 h-5"} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
);
const IconCheck = ({ className }: { className?: string }) => (
    <svg className={className || "w-8 h-8"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const IconCart = ({ className }: { className?: string }) => (
    <svg className={className || "w-5 h-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
);
const IconMinus = ({ className }: { className?: string }) => (
    <svg className={className || "w-3 h-3"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
);
const IconPlus = ({ className }: { className?: string }) => (
    <svg className={className || "w-3 h-3"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);
const IconTrash = ({ className }: { className?: string }) => (
    <svg className={className || "w-3.5 h-3.5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
);
const IconArrowUp = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 9-6-6-6 6" /><path d="M12 3v14" /><path d="M5 21h14" /></svg>
);

// ============================================================
// Inline API lookup — ไม่ import จาก @/lib/api
// ============================================================
const lookupPartByCode = async (code: string) => {
    const res = await fetch(`/api/parts/lookup/${encodeURIComponent(code)}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    return res.json();
};

// ============================================================
// Component — Scanner detection + Cart UI
// ============================================================
export function GlobalBarcodeScanner() {
    const { cart, isOpen, setIsOpen, addToCart, removeItem, updateQty, clearCart, submitting, success, reason, setReason, handleBatchSubmit, totalItems } = useCart();

    const keyBuffer = useRef("");
    const lastKeyTime = useRef(0);
    const scannerTimeout = useRef<NodeJS.Timeout | null>(null);
    const lookingUp = useRef(false);

    // Thai Kedmanee → English mapping
    const thaiToEng: Record<string, string> = {
        "ๅ": "1", "/": "2", "-": "3", "ภ": "4", "ถ": "5", "ุ": "6", "ึ": "7", "ค": "8", "ต": "9", "จ": "0",
        "ข": "-", "ช": "=",
        "ๆ": "q", "ไ": "w", "ำ": "e", "พ": "r", "ะ": "t", "ั": "y", "ี": "u", "ร": "i", "น": "o", "ย": "p",
        "บ": "[", "ล": "]", "ฃ": "\\",
        "ฟ": "a", "ห": "s", "ก": "d", "ด": "f", "เ": "g", "้": "h", "่": "j", "า": "k", "ส": "l", "ว": ";",
        "ง": "'",
        "ผ": "z", "ป": "x", "แ": "c", "อ": "v", "ิ": "b", "ื": "n", "ท": "m", "ม": ",", "ใ": ".", "ฝ": "/",
        "๐": "Q", "ฎ": "E", "ฑ": "R", "ธ": "T", "ํ": "Y", "๊": "U", "ณ": "I", "ฯ": "O", "ญ": "P",
        "ฤ": "A", "ฆ": "S", "ฏ": "D", "โ": "F", "ฌ": "G", "็": "H", "๋": "J", "ษ": "K", "ศ": "L",
        "ฉ": "C", "ฮ": "V", "ฺ": "B", "์": "N", "ฒ": "<", "ฬ": ">",
        "๑": "@", "๒": "#", "๓": "$", "๔": "%", "ู": "^", "฿": "&", "๕": "*", "๖": "(", "๗": ")",
        "๘": "_", "๙": "+",
    };
    const hasThai = (s: string) => /[\u0E00-\u0E7F]/.test(s);
    const convertBuffer = (buf: string): string =>
        hasThai(buf) ? buf.split("").map(c => thaiToEng[c] || c).join("") : buf;

    const handleLookup = useCallback(async (rawCode: string) => {
        const code = rawCode.trim();
        if (code.length < 2 || lookingUp.current) return;
        lookingUp.current = true;
        try {
            const result = await lookupPartByCode(code);
            if (result.success && result.data) {
                addToCart(result.data);
            } else {
                toast.error(`ไม่พบรายการ "${code}" ในระบบ`, { duration: 2500 });
            }
        } catch {
            toast.error(`ไม่พบรายการ "${code}" ในระบบ`, { duration: 2500 });
        } finally {
            lookingUp.current = false;
        }
    }, [addToCart]);

    // Physical Scanner (keydown)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const isContentEditable = (e.target as HTMLElement)?.isContentEditable;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || isContentEditable) return;

            const now = Date.now();
            const timeDiff = now - lastKeyTime.current;

            if (e.key === "Enter") {
                e.preventDefault();
                if (scannerTimeout.current) { clearTimeout(scannerTimeout.current); scannerTimeout.current = null; }
                if (keyBuffer.current.length >= 2) {
                    const code = convertBuffer(keyBuffer.current);
                    keyBuffer.current = "";
                    handleLookup(code);
                }
                return;
            }

            if (e.key.length !== 1) return;

            if (timeDiff < 50) {
                keyBuffer.current += e.key;
            } else {
                keyBuffer.current = e.key;
            }
            lastKeyTime.current = now;

            if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
            scannerTimeout.current = setTimeout(() => {
                if (keyBuffer.current.length >= 3) {
                    const code = convertBuffer(keyBuffer.current);
                    keyBuffer.current = "";
                    handleLookup(code);
                } else {
                    keyBuffer.current = "";
                }
            }, 300);
        };

        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
            if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
        };
    }, [handleLookup]);

    return (
        <>
            {/* Floating cart button */}
            {!isOpen && cart.length > 0 && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl transition-all hover:-translate-y-1 cursor-pointer"
                    style={{ zIndex: 9999, background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", boxShadow: "0 8px 32px rgba(249,115,22,0.4)" }}>
                    <IconCart className="w-5 h-5" />
                    <span className="font-bold text-sm">ตะกร้าเบิก</span>
                    <span className="bg-white text-orange-600 font-bold text-xs px-2 py-0.5 rounded-full ml-1">{cart.length}</span>
                </button>
            )}

            {/* Cart Modal — กลางจอ */}
            {isOpen && (
                <div className="fixed inset-0 z-90 flex items-center justify-center"
                    style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }}
                    onClick={() => !submitting && !success && setIsOpen(false)}>
                    <div className="w-[90%] max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", maxHeight: "85vh", animation: "slideUp 200ms ease" }}
                        onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--t-border-subtle)", background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
                                    <IconCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>ตะกร้าเบิก</h3>
                                    <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{cart.length} รายการ • {totalItems} ชิ้น</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }} title="ซ่อน">
                                    <IconMinus className="w-4 h-4" />
                                </button>
                                <button onClick={clearCart} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }} title="ล้างทั้งหมด">
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {success ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.15)" }}>
                                    <IconCheck className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="font-bold text-lg text-emerald-500 mb-1">เบิกสำเร็จ!</p>
                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>เบิกอะไหล่ {cart.length} รายการเรียบร้อย</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-4 py-2 flex items-center gap-2 shrink-0" style={{ background: "rgba(249,115,22,0.05)", borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[11px] font-medium" style={{ color: "var(--t-text-muted)" }}>ยิงบาร์โค้ดหรือกดเบิกจากหน้ารายการเพื่อเพิ่ม</span>
                                </div>

                                {cart.length === 0 && (
                                    <div className="p-6 text-center">
                                        <IconPackage className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} />
                                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีรายการ</p>
                                        <p className="text-[11px] mt-1" style={{ color: "var(--t-text-dim)" }}>ยิงบาร์โค้ดหรือกดเบิกจากหน้ารายการ</p>
                                    </div>
                                )}

                                {cart.length > 0 && (
                                    <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                                        {cart.map((item, idx) => {
                                            const isLow = item.withdrawQty >= item.quantity;
                                            return (
                                                <div key={item.id} className="px-4 py-3 flex items-center gap-3"
                                                    style={{ borderBottom: idx < cart.length - 1 ? "1px solid var(--t-border-subtle)" : "none" }}>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{item.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="font-mono text-[10px]" style={{ color: "var(--t-text-muted)" }}>{item.code}</span>
                                                            {item.brand && <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>• {item.brand}</span>}
                                                        </div>
                                                        <p className="text-[10px] mt-0.5" style={{ color: isLow ? "#EF4444" : "var(--t-text-dim)" }}>
                                                            สต็อก: {item.quantity} {item.unit}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => updateQty(item.id, -1)} disabled={item.withdrawQty <= 1}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-30 transition-colors"
                                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>
                                                            <IconMinus />
                                                        </button>
                                                        <span className="w-8 text-center text-sm font-bold" style={{ color: isLow ? "#EF4444" : "#F97316" }}>
                                                            {item.withdrawQty}
                                                        </span>
                                                        <button onClick={() => updateQty(item.id, 1)} disabled={item.withdrawQty >= item.quantity}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-30 transition-colors"
                                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>
                                                            <IconPlus />
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeItem(item.id)}
                                                        className="p-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
                                                        style={{ color: "var(--t-text-dim)" }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-dim)"; }}>
                                                        <IconTrash />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {cart.length > 0 && (
                                    <div className="p-4 space-y-3 shrink-0" style={{ borderTop: "1px solid var(--t-border-subtle)", background: "var(--t-modal-bg)" }}>
                                        <input
                                            type="text"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter" && cart.length > 0) handleBatchSubmit(); }}
                                            placeholder="เหตุผลการเบิก (ถ้ามี)"
                                            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                                        />
                                        <button
                                            onClick={handleBatchSubmit}
                                            disabled={submitting || cart.length === 0}
                                            className="w-full flex items-center justify-center gap-2 text-white font-bold rounded-xl py-3 text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                            style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 8px 20px rgba(249,115,22,0.3)" }}>
                                            <IconArrowUp className="w-4 h-4" />
                                            {submitting ? "กำลังเบิก..." : `เบิกทั้งหมด ${cart.length} รายการ (${totalItems} ชิ้น)`}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

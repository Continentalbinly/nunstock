"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { lookupPartByCode, createBatchMovements } from "@/lib/api";
import { toast } from "sonner";
import {
    X, Package, CheckCircle2, AlertTriangle, AlertCircle,
    ArrowUpFromLine, Minus, Plus, Trash2, ShoppingCart
} from "lucide-react";

interface CartItem {
    id: string;
    code: string;
    name: string;
    brand?: string;
    unit: string;
    quantity: number;
    categoryPath: string;
    withdrawQty: number;
}

export function GlobalBarcodeScanner() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [reason, setReason] = useState("");

    // Scanner refs
    const keyBuffer = useRef("");
    const lastKeyTime = useRef(0);
    const scannerTimeout = useRef<NodeJS.Timeout | null>(null);
    const lookingUp = useRef(false);

    // Thai Kedmanee → English mapping (both layers)
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

    const getCategoryPath = (p: any): string => {
        if (!p?.category) return "";
        const parts: string[] = [p.category.name];
        if (p.category.parent) {
            parts.unshift(p.category.parent.name);
            if (p.category.parent.parent) parts.unshift(p.category.parent.parent.name);
        }
        return parts.join(" › ");
    };

    const addToCart = useCallback((part: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === part.id);
            if (existing) {
                if (existing.withdrawQty < existing.quantity) {
                    toast.success(`${part.name} +1 (รวม ${existing.withdrawQty + 1})`, { duration: 1500 });
                    return prev.map(i => i.id === part.id ? { ...i, withdrawQty: i.withdrawQty + 1 } : i);
                } else {
                    toast.warning(`${part.name}: สต็อกไม่เพียงพอ (มี ${existing.quantity} ${existing.unit})`, { duration: 2000 });
                    return prev;
                }
            }
            toast.success(`เพิ่ม ${part.name} ลงตะกร้า`, { duration: 1500 });
            return [...prev, {
                id: part.id, code: part.code, name: part.name, brand: part.brand,
                unit: part.unit, quantity: part.quantity,
                categoryPath: getCategoryPath(part), withdrawQty: 1,
            }];
        });
        setIsOpen(true);
    }, []);

    const handleLookup = useCallback(async (rawCode: string) => {
        // Strip invisible/control chars and trim whitespace
        const code = rawCode.replace(/[^\x20-\x7E]/g, "").trim();
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

    // === Physical Scanner (keydown) — ทำงานทุก platform ===
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const isContentEditable = (e.target as HTMLElement)?.isContentEditable;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || isContentEditable) return;

            const now = Date.now();
            const timeDiff = now - lastKeyTime.current;

            if (e.key === "Enter") {
                e.preventDefault();
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

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id !== id) return item;
            const newQty = Math.max(1, Math.min(item.withdrawQty + delta, item.quantity));
            return { ...item, withdrawQty: newQty };
        }));
    };

    const removeItem = (id: string) => {
        setCart(prev => {
            const next = prev.filter(i => i.id !== id);
            if (next.length === 0) setIsOpen(false);
            return next;
        });
    };

    const clearCart = () => {
        setCart([]);
        setIsOpen(false);
        setReason("");
        setSuccess(false);
    };

    const handleBatchSubmit = async () => {
        if (cart.length === 0) return;
        setSubmitting(true);
        try {
            await createBatchMovements({
                items: cart.map(i => ({ partId: i.id, quantity: i.withdrawQty })),
                reason: reason || undefined,
            });
            setSuccess(true);
            setTimeout(() => clearCart(), 2500);
        } catch (err: any) {
            toast.error(err.message || "ไม่สามารถเบิกได้");
        } finally {
            setSubmitting(false);
        }
    };

    const totalItems = cart.reduce((sum, i) => sum + i.withdrawQty, 0);

    return (
        <>
            {/* Floating cart button (only when cart has items & panel closed) */}
            {!isOpen && cart.length > 0 && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-80 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-2xl transition-all hover:-translate-y-1 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", boxShadow: "0 8px 32px rgba(249,115,22,0.4)" }}>
                    <ShoppingCart className="w-5 h-5" />
                    <span className="font-bold text-sm">ตะกร้าเบิก</span>
                    <span className="bg-white text-orange-600 font-bold text-xs px-2 py-0.5 rounded-full ml-1">{cart.length}</span>
                </button>
            )}

            {/* Cart Panel */}
            {isOpen && (
                <div className="fixed bottom-0 right-0 z-80 w-full sm:w-[420px] sm:bottom-4 sm:right-4 flex flex-col"
                    style={{ maxHeight: "90vh", animation: "slideUp 200ms ease" }}>
                    <div className="rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", maxHeight: "90vh" }}>

                        {/* Header */}
                        <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--t-border-subtle)", background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
                                    <ShoppingCart className="w-5 h-5" style={{ color: "#F97316" }} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>ตะกร้าเบิก</h3>
                                    <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{cart.length} รายการ • {totalItems} ชิ้น</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={clearCart} className="p-1.5 rounded-lg transition-colors cursor-pointer text-xs font-medium px-2.5 py-1.5"
                                    style={{ color: "var(--t-text-muted)" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-muted)"; }}>
                                    ล้าง
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {success ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.15)" }}>
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="font-bold text-lg text-emerald-500 mb-1">เบิกสำเร็จ!</p>
                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>เบิกอะไหล่ {cart.length} รายการเรียบร้อย</p>
                            </div>
                        ) : (
                            <>
                                {/* Scan hint */}
                                <div className="px-4 py-2 flex items-center gap-2 shrink-0" style={{ background: "rgba(249,115,22,0.05)", borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[11px] font-medium" style={{ color: "var(--t-text-muted)" }}>ยิงบาร์โค้ดเพื่อเพิ่มรายการ</span>
                                </div>

                                {/* Empty state */}
                                {cart.length === 0 && (
                                    <div className="p-6 text-center">
                                        <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} />
                                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีรายการ</p>
                                        <p className="text-[11px] mt-1" style={{ color: "var(--t-text-dim)" }}>ยิงบาร์โค้ดเพื่อเพิ่มอะไหล่</p>
                                    </div>
                                )}

                                {/* Cart Items */}
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
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-8 text-center text-sm font-bold" style={{ color: isLow ? "#EF4444" : "#F97316" }}>
                                                            {item.withdrawQty}
                                                        </span>
                                                        <button onClick={() => updateQty(item.id, 1)} disabled={item.withdrawQty >= item.quantity}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-30 transition-colors"
                                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeItem(item.id)}
                                                        className="p-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
                                                        style={{ color: "var(--t-text-dim)" }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-dim)"; }}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Footer */}
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
                                            <ArrowUpFromLine className="w-4 h-4" />
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

"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { lookupPartByCode, createMovement } from "@/lib/api";
import {
    ScanBarcode, X, Package, CheckCircle2, AlertTriangle,
    ArrowDownToLine, ArrowUpFromLine, Minus, Plus, AlertCircle
} from "lucide-react";

export function GlobalBarcodeScanner() {
    const [part, setPart] = useState<any>(null);
    const [notFound, setNotFound] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [scanIndicator, setScanIndicator] = useState(false);

    // Action modal state
    const [actionType, setActionType] = useState<"IN" | "OUT">("IN");
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Scanner detection refs
    const keyBuffer = useRef("");
    const lastKeyTime = useRef(0);
    const scannerTimeout = useRef<NodeJS.Timeout | null>(null);

    const resetModal = useCallback(() => {
        setPart(null);
        setNotFound(null);
        setActionType("IN");
        setQty(1);
        setReason("");
        setSubmitting(false);
        setSuccess("");
        setError("");
    }, []);

    const handleLookup = useCallback(async (code: string) => {
        if (code.length < 2) return;
        setLoading(true);
        setScanIndicator(true);
        try {
            const result = await lookupPartByCode(code);
            if (result.success && result.data) {
                setPart(result.data);
                setActionType("IN");
                setQty(1);
                setReason("");
                setSuccess("");
                setError("");
            } else {
                setNotFound(code);
            }
        } catch {
            setNotFound(code);
        } finally {
            setLoading(false);
            setTimeout(() => setScanIndicator(false), 1000);
        }
    }, []);

    // Global keydown listener for barcode scanner detection
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Skip if focus is in an input/textarea/select or if a modal is already open
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (part || notFound) return;

            const now = Date.now();
            const timeDiff = now - lastKeyTime.current;

            if (e.key === "Enter") {
                e.preventDefault();
                if (keyBuffer.current.length >= 2) {
                    const code = keyBuffer.current;
                    keyBuffer.current = "";
                    handleLookup(code);
                }
                return;
            }

            // Only single printable characters
            if (e.key.length !== 1) return;

            // Detect rapid typing (scanner: < 50ms between chars)
            if (timeDiff < 50) {
                keyBuffer.current += e.key;
            } else {
                // Reset: slow typing = human, start new buffer
                keyBuffer.current = e.key;
            }
            lastKeyTime.current = now;

            // Auto-trigger after 300ms of no more input (scanner finished)
            if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
            scannerTimeout.current = setTimeout(() => {
                if (keyBuffer.current.length >= 3) {
                    const code = keyBuffer.current;
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
    }, [part, notFound, handleLookup]);

    const handleSubmit = async () => {
        if (!part) return;
        if (actionType === "OUT" && qty > part.quantity) {
            setError(`สต็อกไม่เพียงพอ (เหลือ ${part.quantity} ${part.unit})`);
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await createMovement({
                partId: part.id,
                type: actionType,
                quantity: qty,
                reason: reason || undefined,
            });
            setSuccess(
                actionType === "IN"
                    ? `เพิ่ม ${part.name} จำนวน ${qty} ${part.unit} สำเร็จ!`
                    : `เบิก ${part.name} จำนวน ${qty} ${part.unit} สำเร็จ!`
            );
            // Re-fetch updated part
            const updated = await lookupPartByCode(part.code);
            if (updated.success) setPart(updated.data);
            setTimeout(() => resetModal(), 2000);
        } catch (err: any) {
            setError(err.message || "ไม่สามารถดำเนินการได้");
        } finally {
            setSubmitting(false);
        }
    };

    // Build category breadcrumb
    const getCategoryPath = (p: any): string => {
        if (!p?.category) return "";
        const parts: string[] = [p.category.name];
        if (p.category.parent) {
            parts.unshift(p.category.parent.name);
            if (p.category.parent.parent) {
                parts.unshift(p.category.parent.parent.name);
            }
        }
        return parts.join(" › ");
    };

    const isIn = actionType === "IN";
    const accentColor = isIn ? "#22C55E" : "#F97316";

    return (
        <>
            {/* Scan indicator — brief flash when barcode detected */}
            {(scanIndicator || loading) && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
                    style={{ background: "var(--t-modal-bg)", border: "1px solid #22C55E40", animation: "fadeIn 100ms ease" }}>
                    <ScanBarcode className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>
                        {loading ? "กำลังค้นหา..." : "สแกนบาร์โค้ด"}
                    </span>
                </div>
            )}

            {/* Not Found Modal */}
            {notFound && (
                <div className="fixed inset-0 z-90 flex items-center justify-center"
                    style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }}
                    onClick={resetModal}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl"
                        style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="font-bold text-lg mb-2" style={{ color: "var(--t-text)" }}>ไม่พบรายการนี้ในระบบ</h3>
                            <div className="rounded-lg px-4 py-2.5 mb-4" style={{ background: "var(--t-badge-bg)" }}>
                                <p className="font-mono text-sm font-semibold" style={{ color: "var(--t-text-secondary)" }}>{notFound}</p>
                            </div>
                            <p className="text-sm mb-5" style={{ color: "var(--t-text-muted)" }}>
                                ไม่มีอะไหล่ที่ตรงกับบาร์โค้ดนี้ในระบบ
                            </p>
                            <button onClick={resetModal}
                                className="w-full rounded-xl py-3 text-sm font-semibold transition-colors cursor-pointer"
                                style={{ background: "var(--t-input-bg)", color: "var(--t-text)", border: "1px solid var(--t-input-border)" }}>
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Part Found Modal */}
            {part && (
                <div className="fixed inset-0 z-90 flex items-center justify-center"
                    style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }}
                    onClick={() => !submitting && !success && resetModal()}>
                    <div className="rounded-2xl w-[90%] max-w-md shadow-2xl overflow-hidden"
                        style={{ background: "var(--t-modal-bg)", border: `1px solid var(--t-modal-border)`, animation: "slideUp 200ms ease" }}
                        onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-5 flex items-center justify-between" style={{ borderBottom: `2px solid ${accentColor}20` }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                                    <ScanBarcode className="w-5 h-5" style={{ color: "#22C55E" }} />
                                </div>
                                <div>
                                    <h3 className="font-bold" style={{ color: "var(--t-text)" }}>สแกนบาร์โค้ด</h3>
                                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>พบอะไหล่ในระบบ</p>
                                </div>
                            </div>
                            <button onClick={resetModal} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {success ? (
                            <div className="p-8 text-center" style={{ animation: "slideUp 200ms ease" }}>
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${accentColor}15` }}>
                                    <CheckCircle2 className="w-8 h-8" style={{ color: accentColor }} />
                                </div>
                                <p className="font-bold text-lg" style={{ color: accentColor }}>{success}</p>
                            </div>
                        ) : (
                            <div className="p-5 space-y-5">
                                {/* Part Info Card */}
                                <div className="rounded-xl p-4" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-input-bg)" }}>
                                            <Package className="w-5 h-5" style={{ color: "var(--t-text-muted)" }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{part.name}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)" }}>{part.code}</span>
                                                {part.brand && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{part.brand}</span>}
                                            </div>
                                            {getCategoryPath(part) && (
                                                <p className="text-[11px] mt-1.5" style={{ color: "var(--t-text-dim)" }}>
                                                    📍 {getCategoryPath(part)}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>สต็อกปัจจุบัน:</span>
                                                <span className={`text-sm font-bold ${part.quantity <= part.minStock ? "text-red-500" : "text-emerald-500"}`}>
                                                    {part.quantity} {part.unit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Type Toggle */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setActionType("IN"); setError(""); }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer`}
                                        style={isIn ? { background: "#22C55E", color: "#fff", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" } : { background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>
                                        <ArrowDownToLine className="w-4 h-4" /> เพิ่มสต็อก
                                    </button>
                                    <button
                                        onClick={() => { setActionType("OUT"); setError(""); }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer`}
                                        style={!isIn ? { background: "#F97316", color: "#fff", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" } : { background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>
                                        <ArrowUpFromLine className="w-4 h-4" /> เบิกอะไหล่
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <p className="text-sm text-red-500">{error}</p>
                                    </div>
                                )}

                                {/* Quantity */}
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>{isIn ? "จำนวนที่เพิ่ม" : "จำนวนที่เบิก"}</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1 relative">
                                            <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                                                className="w-full rounded-xl text-center text-3xl font-bold py-2 focus:outline-none"
                                                style={{ background: "var(--t-input-bg)", border: `2px solid ${accentColor}40`, color: "var(--t-text)" }}
                                                min={1} max={actionType === "OUT" ? part.quantity : undefined} />
                                            {!isIn && (
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--t-text-dim)" }}>
                                                    / {part.quantity} {part.unit}
                                                </span>
                                            )}
                                        </div>
                                        <button type="button"
                                            onClick={() => setQty(actionType === "OUT" ? Math.min(qty + 1, part.quantity) : qty + 1)}
                                            disabled={actionType === "OUT" && qty >= part.quantity}
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {!isIn && (
                                        <div className="mt-2">
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-border-subtle)" }}>
                                                <div className={`h-full rounded-full transition-all duration-300 ${qty > part.quantity * 0.8 ? "bg-red-500" : qty > part.quantity * 0.5 ? "bg-amber-500" : "bg-orange-500"}`}
                                                    style={{ width: `${Math.min((qty / part.quantity) * 100, 100)}%` }} />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>เบิก {qty} {part.unit}</span>
                                                <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>คงเหลือ {Math.max(0, part.quantity - qty)} {part.unit}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>
                                        เหตุผล <span className="font-normal text-xs" style={{ color: "var(--t-text-dim)" }}>(ถ้ามี)</span>
                                    </label>
                                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                                        className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                                        style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                                        placeholder={isIn ? "เช่น สั่งซื้อเข้าคลัง, รับคืน" : "เช่น ซ่อมรถลูกค้า, ใช้ในงาน"} />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-1">
                                    <button onClick={resetModal}
                                        className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors cursor-pointer"
                                        style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>
                                        ปิด
                                    </button>
                                    <button onClick={handleSubmit}
                                        disabled={submitting || (actionType === "OUT" && qty > part.quantity)}
                                        className="flex-1 flex items-center justify-center gap-2 text-white font-bold rounded-xl py-3 text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                        style={{ background: accentColor, boxShadow: `0 8px 16px ${accentColor}30` }}>
                                        {isIn ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                                        {submitting ? "กำลัง..." : isIn ? "เพิ่มสต็อก" : "เบิกอะไหล่"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

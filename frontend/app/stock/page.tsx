"use client";
import { useEffect, useState, useRef } from "react";
import { getParts, getCategories, createMovement } from "@/lib/api";
import { Package, Search, Filter, TrendingDown, CheckCircle2, ScanBarcode, ArrowDownToLine, ArrowUpFromLine, Minus, Plus, X, AlertCircle } from "lucide-react";

export default function StockPage() {
    const [parts, setParts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // Modal
    const [selectedPart, setSelectedPart] = useState<any>(null);
    const [actionType, setActionType] = useState<"IN" | "OUT">("IN");
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Scanner
    const lastKeyTime = useRef(0);
    const [scannerMode, setScannerMode] = useState(false);
    const keyBuffer = useRef("");

    const fetchData = async () => {
        try {
            const [p, c] = await Promise.all([getParts(), getCategories()]);
            setParts(p);
            setCategories(c);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filtered = parts.filter((p) => {
        const q = search.toLowerCase();
        const matchSearch = !search || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q));
        const matchCat = !categoryFilter || p.categoryId === categoryFilter;
        const matchLow = !lowStockOnly || p.quantity <= p.minStock;
        return matchSearch && matchCat && matchLow;
    });

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const now = Date.now();
        const timeDiff = now - lastKeyTime.current;
        if (timeDiff < 50 && e.key.length === 1) {
            setScannerMode(true);
            keyBuffer.current += e.key;
        } else if (e.key.length === 1) {
            keyBuffer.current = e.key;
            setScannerMode(false);
        }
        lastKeyTime.current = now;
    };

    useEffect(() => {
        if (scannerMode && search.length >= 3) {
            const timer = setTimeout(() => setScannerMode(false), 500);
            return () => clearTimeout(timer);
        }
    }, [search, scannerMode]);

    const openModal = (part: any, type: "IN" | "OUT") => {
        setSelectedPart(part);
        setActionType(type);
        setQty(1);
        setReason("");
        setError("");
        setSuccess("");
    };

    const closeModal = () => {
        setSelectedPart(null);
        setSuccess("");
        setError("");
    };

    const handleSubmit = async () => {
        if (!selectedPart) return;
        if (actionType === "OUT" && qty > selectedPart.quantity) {
            setError(`สต็อกไม่เพียงพอ (เหลือ ${selectedPart.quantity} ${selectedPart.unit})`);
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await createMovement({
                partId: selectedPart.id,
                type: actionType,
                quantity: qty,
                reason: reason || undefined,
            });
            setSuccess(
                actionType === "IN"
                    ? `เพิ่ม ${selectedPart.name} จำนวน ${qty} ${selectedPart.unit} สำเร็จ!`
                    : `เบิก ${selectedPart.name} จำนวน ${qty} ${selectedPart.unit} สำเร็จ!`
            );
            fetchData();
            setTimeout(() => closeModal(), 2000);
        } catch (err: any) {
            setError(err.message || "ไม่สามารถดำเนินการได้");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading)
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} />
                    <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );

    const isIn = actionType === "IN";
    const accentColor = isIn ? "#22C55E" : "#F97316";

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>คลังอะไหล่</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>จัดการสต็อก — ค้นหา, เบิก, เพิ่มอะไหล่</p>
            </div>

            {/* Search */}
            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {scannerMode ? <ScanBarcode className="w-4 h-4 text-emerald-500 animate-pulse" /> : <Search className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />}
                        </div>
                        <input
                            type="text"
                            placeholder="ค้นหาหรือสแกนบาร์โค้ด... (ชื่อ, รหัส, ยี่ห้อ)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full rounded-lg pl-10 pr-10 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1" style={{ color: "var(--t-text-dim)" }}>
                            {scannerMode && <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded font-medium">SCAN</span>}
                            <ScanBarcode className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-lg px-3 py-2.5 text-sm focus:outline-none cursor-pointer min-w-[140px]"
                        style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                    >
                        <option value="">ทุกประเภท</option>
                        {categories.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setLowStockOnly(!lowStockOnly)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${lowStockOnly ? "bg-amber-500/15 text-amber-500 border border-amber-500/30" : ""}`}
                        style={lowStockOnly ? {} : { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-secondary)" }}
                    >
                        <Filter className="w-4 h-4" /> {lowStockOnly ? "ของใกล้หมด" : "ทั้งหมด"}
                    </button>
                </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>
                พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{filtered.length}</span> รายการ
            </p>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                        <p style={{ color: "var(--t-text-muted)" }}>ไม่พบอะไหล่</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    {["รหัส", "ชื่ออะไหล่", "ยี่ห้อ", "ประเภท", "จำนวน", "สถานะ", "จัดการ"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p) => {
                                    const isLow = p.quantity <= p.minStock;
                                    return (
                                        <tr
                                            key={p.id}
                                            className="transition-colors"
                                            style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--t-hover-overlay)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                        >
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--t-text-secondary)" }}>{p.code}</td>
                                            <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.name}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{p.brand || "-"}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--t-badge-bg)", color: "var(--t-badge-text)" }}>{p.category?.name}</span>
                                            </td>
                                            <td className={`px-4 py-3 text-sm font-bold ${isLow ? "text-red-500" : ""}`} style={isLow ? {} : { color: "var(--t-text)" }}>
                                                {p.quantity} <span className="font-normal text-xs" style={{ color: "var(--t-text-muted)" }}>{p.unit}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isLow
                                                    ? <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium"><TrendingDown className="w-3 h-3" /> ใกล้หมด</span>
                                                    : <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium"><CheckCircle2 className="w-3 h-3" /> ปกติ</span>
                                                }
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openModal(p, "IN")}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
                                                    >
                                                        <ArrowDownToLine className="w-3.5 h-3.5" /> เพิ่ม
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(p, "OUT")}
                                                        disabled={p.quantity === 0}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer bg-orange-500 hover:bg-orange-400 text-white shadow-sm hover:shadow-md hover:shadow-orange-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ArrowUpFromLine className="w-3.5 h-3.5" /> เบิก
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Modal — shows selected part detail + form */}
            {selectedPart && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }}
                    onClick={() => !submitting && !success && closeModal()}
                >
                    <div
                        className="rounded-2xl w-[90%] max-w-md shadow-2xl overflow-hidden"
                        style={{ background: "var(--t-modal-bg)", border: `1px solid var(--t-modal-border)`, animation: "slideUp 200ms ease" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 flex items-center justify-between" style={{ borderBottom: `2px solid ${accentColor}20` }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                                    {isIn ? <ArrowDownToLine className="w-5 h-5" style={{ color: accentColor }} /> : <ArrowUpFromLine className="w-5 h-5" style={{ color: accentColor }} />}
                                </div>
                                <div>
                                    <h3 className="font-bold" style={{ color: "var(--t-text)" }}>{isIn ? "เพิ่มสต็อก" : "เบิกอะไหล่"}</h3>
                                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{isIn ? "เพิ่มจำนวนเข้าคลัง" : "เบิกออกจากคลัง"}</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Success state */}
                        {success ? (
                            <div className="p-8 text-center" style={{ animation: "slideUp 200ms ease" }}>
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${accentColor}15` }}>
                                    <CheckCircle2 className="w-8 h-8" style={{ color: accentColor }} />
                                </div>
                                <p className="font-bold text-lg" style={{ color: accentColor }}>{success}</p>
                                <p className="text-xs mt-2" style={{ color: "var(--t-text-muted)" }}>สต็อกถูกปรับเรียบร้อยแล้ว</p>
                            </div>
                        ) : (
                            <div className="p-5 space-y-5">
                                {/* Part info card */}
                                <div className="rounded-xl p-4" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-input-bg)" }}>
                                            <Package className="w-5 h-5" style={{ color: "var(--t-text-muted)" }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{selectedPart.name}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)" }}>{selectedPart.code}</span>
                                                {selectedPart.brand && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedPart.brand}</span>}
                                                <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>{selectedPart.category?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>สต็อกปัจจุบัน:</span>
                                                <span className={`text-sm font-bold ${selectedPart.quantity <= selectedPart.minStock ? "text-red-500" : "text-emerald-500"}`}>
                                                    {selectedPart.quantity} {selectedPart.unit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <p className="text-sm text-red-500">{error}</p>
                                    </div>
                                )}

                                {/* Quantity */}
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>
                                        {isIn ? "จำนวนที่เพิ่ม" : "จำนวนที่เบิก"}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setQty(Math.max(1, qty - 1))}
                                            disabled={qty <= 1}
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={qty}
                                                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                                                className="w-full rounded-xl text-center text-3xl font-bold py-2 focus:outline-none"
                                                style={{ background: "var(--t-input-bg)", border: `2px solid ${accentColor}40`, color: "var(--t-text)" }}
                                                min={1}
                                                max={actionType === "OUT" ? selectedPart.quantity : undefined}
                                            />
                                            {!isIn && (
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--t-text-dim)" }}>
                                                    / {selectedPart.quantity} {selectedPart.unit}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setQty(actionType === "OUT" ? Math.min(qty + 1, selectedPart.quantity) : qty + 1)}
                                            disabled={actionType === "OUT" && qty >= selectedPart.quantity}
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {/* Progress bar for OUT */}
                                    {!isIn && (
                                        <div className="mt-2">
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-border-subtle)" }}>
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${qty > selectedPart.quantity * 0.8 ? "bg-red-500" : qty > selectedPart.quantity * 0.5 ? "bg-amber-500" : "bg-orange-500"}`}
                                                    style={{ width: `${Math.min((qty / selectedPart.quantity) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>เบิก {qty} {selectedPart.unit}</span>
                                                <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>คงเหลือ {Math.max(0, selectedPart.quantity - qty)} {selectedPart.unit}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>เหตุผล <span className="font-normal text-xs" style={{ color: "var(--t-text-dim)" }}>(ถ้ามี)</span></label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                                        className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                                        style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                                        placeholder={isIn ? "เช่น สั่งซื้อเข้าคลัง, รับคืน" : "เช่น ซ่อมรถลูกค้า, ใช้ในงาน"}
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors cursor-pointer"
                                        style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting || (actionType === "OUT" && qty > selectedPart.quantity)}
                                        className="flex-1 flex items-center justify-center gap-2 text-white font-bold rounded-xl py-3 text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                        style={{ background: accentColor, boxShadow: `0 8px 16px ${accentColor}30` }}
                                    >
                                        {isIn ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                                        {submitting ? "กำลัง..." : isIn ? "เพิ่มสต็อก" : "เบิกอะไหล่"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

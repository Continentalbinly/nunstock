"use client";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { getParts, getCategories, createMovement, createPart, updatePart, deletePart, deletePartForce, getLookupOptions } from "@/lib/api";
import { Palette, Search, Filter, TrendingDown, CheckCircle2, ScanBarcode, ArrowDownToLine, ArrowUpFromLine, Minus, Plus, X, AlertCircle, PackagePlus, Pencil, Trash2, Droplets } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import BarcodeModal from "@/components/BarcodeModal";


const PAINT_TYPES = ["ทั้งหมด", "แม่สี", "สีรองพื้น"];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    "แม่สี": { bg: "rgba(239,68,68,0.12)", text: "#EF4444" },
    "สีรองพื้น": { bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
};

export default function PaintsPage() {
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [paintCatId, setPaintCatId] = useState<string>("");
    const [parts, setParts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

    // Modal
    const [selectedPart, setSelectedPart] = useState<any>(null);
    const [actionType, setActionType] = useState<"IN" | "OUT">("IN");
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ code: "", name: "", description: "", brand: "", specification: "แม่สี", unit: "กระป๋อง", quantity: 0, minStock: 3 });
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");

    // Edit/Delete
    const [editingPart, setEditingPart] = useState<any>(null);
    const [editPartForm, setEditPartForm] = useState({ code: "", name: "", description: "", brand: "", specification: "แม่สี", unit: "กระป๋อง", minStock: 3 });
    const [editPartSaving, setEditPartSaving] = useState(false);
    const [editPartError, setEditPartError] = useState("");
    const [confirmDeletePart, setConfirmDeletePart] = useState<any>(null);
    const [deletePartMsg, setDeletePartMsg] = useState("");
    const [deletePartCanForce, setDeletePartCanForce] = useState(false);
    const [customUnit, setCustomUnit] = useState(false);
    const [customEditUnit, setCustomEditUnit] = useState(false);

    // Dynamic unit options from DB
    const [unitOptions, setUnitOptions] = useState<string[]>([]);
    useEffect(() => {
        getLookupOptions("UNIT_PAINT").then(r => setUnitOptions(r.map((o: any) => o.value))).catch(() => { });
    }, []);
    const [barcodePart, setBarcodePart] = useState<any>(null);

    // Top-level tab


    // Scanner
    const lastKeyTime = useRef(0);
    const [scannerMode, setScannerMode] = useState(false);

    useEffect(() => {
        getCategories()
            .then(c => {
                setAllCategories(c);
                const root = c.find((cat: any) => cat.name === "สีพ่นรถยนต์" && !cat.parentId);
                if (root) setPaintCatId(root.id);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchParts = async () => {
        if (!paintCatId) return;
        try {
            const params: Record<string, string> = { page: String(page), pageSize: "20", categoryId: paintCatId };
            if (debouncedSearch) params.search = debouncedSearch;
            if (lowStockOnly) params.lowStock = "true";
            const result = await getParts(params);
            setParts(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (paintCatId) fetchParts(); }, [paintCatId, page, debouncedSearch, lowStockOnly]);

    const handleFilterChange = (setter: (v: any) => void, value: any) => { setPage(1); setter(value); };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const now = Date.now();
        if (now - lastKeyTime.current < 50 && e.key.length === 1) setScannerMode(true);
        else if (e.key.length === 1) setScannerMode(false);
        lastKeyTime.current = now;
    };

    const openModal = (part: any, type: "IN" | "OUT") => { setSelectedPart(part); setActionType(type); setQty(1); setReason(""); setError(""); setSuccess(""); };
    const closeModal = () => { setSelectedPart(null); setSuccess(""); setError(""); };

    const handleSubmit = async () => {
        if (!selectedPart) return;
        if (actionType === "OUT" && qty > selectedPart.quantity) { setError(`สต็อกไม่เพียงพอ (เหลือ ${selectedPart.quantity} ${selectedPart.unit})`); return; }
        setSubmitting(true); setError("");
        try {
            await createMovement({ partId: selectedPart.id, type: actionType, quantity: qty, reason: reason || undefined });
            setSuccess(actionType === "IN" ? `เพิ่ม ${selectedPart.name} จำนวน ${qty} ${selectedPart.unit} สำเร็จ!` : `เบิก ${selectedPart.name} จำนวน ${qty} ${selectedPart.unit} สำเร็จ!`);
            fetchParts();
            setTimeout(() => closeModal(), 2000);
        } catch (err: any) { setError(err.message || "ไม่สามารถดำเนินการได้"); }
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} />
                <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดคลังสี...</p>
            </div>
        </div>
    );

    const filteredParts = typeFilter === "ทั้งหมด" ? parts : parts.filter(p => p.specification === typeFilter);
    const isIn = actionType === "IN";
    const accentColor = isIn ? "#22C55E" : "#8B5CF6";

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                        <Palette className="w-6 h-6" style={{ color: "#8B5CF6" }} /> คลังสี
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>จัดการแม่สี และสีรองพื้น</p>
                </div>
                <button onClick={() => { setCreateForm({ code: "", name: "", description: "", brand: "", specification: "แม่สี", unit: "กระป๋อง", quantity: 0, minStock: 3 }); setCreateError(""); setShowCreate(true); }} className="flex items-center gap-2 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer" style={{ background: "#8B5CF6" }} onMouseEnter={e => e.currentTarget.style.background = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.background = "#8B5CF6"}><Plus className="w-4 h-4" /> เพิ่มสีใหม่</button>
            </div>

            {/* Type filter chips */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {PAINT_TYPES.map(t => (
                    <button key={t} onClick={() => { setPage(1); setTypeFilter(t); }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                        style={typeFilter === t
                            ? { background: "#8B5CF6", color: "white" }
                            : { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-secondary)" }
                        }
                    >{t}</button>
                ))}
            </div>

            {/* Search & filters */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {scannerMode ? <ScanBarcode className="w-4 h-4 text-purple-500 animate-pulse" /> : <Search className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />}
                    </div>
                    <input type="text" placeholder="ค้นหาสี... (ชื่อ, รหัส, แม่สี)" value={search} onChange={(e) => handleFilterChange(setSearch, e.target.value)} onKeyDown={handleSearchKeyDown} className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                </div>
                <button onClick={() => handleFilterChange(setLowStockOnly, !lowStockOnly)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${lowStockOnly ? "bg-purple-500/15 text-purple-500 border border-purple-500/30" : ""}`} style={lowStockOnly ? {} : { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-secondary)" }}>
                    <Filter className="w-4 h-4" /> {lowStockOnly ? "ของใกล้หมด" : "ทั้งหมด"}
                </button>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{filteredParts.length}</span> รายการ</p>

            {/* Parts list */}
            {filteredParts.length === 0 ? (
                <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <Palette className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                    <p style={{ color: "var(--t-text-muted)" }}>ไม่พบสีในคลัง</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredParts.map((p) => {
                        const isLow = p.quantity <= p.minStock;
                        const tc = TYPE_COLORS[p.specification] || { bg: "rgba(139,92,246,0.1)", text: "#8B5CF6" };
                        return (
                            <div key={p.id} className="rounded-xl p-4 transition-all cursor-pointer" style={{ background: "var(--t-card)", border: `1px solid ${isLow ? "rgba(239,68,68,0.25)" : "var(--t-border-subtle)"}` }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"} onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"} onClick={() => setBarcodePart(p)}>
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: tc.bg }}>
                                            {p.specification === "สีรองพื้น" ? <Droplets className="w-5 h-5" style={{ color: tc.text }} /> : <Palette className="w-5 h-5" style={{ color: tc.text }} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-sm truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
                                                {isLow && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium shrink-0"><TrendingDown className="w-2.5 h-2.5" /> ใกล้หมด</span>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                <span className="font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{p.code}</span>
                                                {p.brand && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>• {p.brand}</span>}
                                                {p.specification && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: tc.bg, color: tc.text }}>{p.specification}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center px-4">
                                        <p className={`text-lg font-bold ${isLow ? "text-red-500" : ""}`} style={isLow ? {} : { color: "var(--t-text)" }}>{p.quantity}</p>
                                        <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{p.unit}</p>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); openModal(p, "IN"); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-emerald-600 hover:text-white hover:bg-emerald-500" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#22C55E"; e.currentTarget.style.borderColor = "#22C55E"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)"; e.currentTarget.style.color = "rgb(22,163,74)"; }}>
                                            <ArrowDownToLine className="w-3.5 h-3.5" /> เพิ่ม
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); openModal(p, "OUT"); }} disabled={p.quantity === 0} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#8B5CF6" }} onMouseEnter={(e) => { if (p.quantity > 0) { e.currentTarget.style.background = "#8B5CF6"; e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "white"; } }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.1)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"; e.currentTarget.style.color = "#8B5CF6"; }}>
                                            <ArrowUpFromLine className="w-3.5 h-3.5" /> เบิก
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingPart(p); setEditPartForm({ code: p.code, name: p.name, description: p.description || "", brand: p.brand || "", specification: p.specification || "แม่สี", unit: p.unit, minStock: p.minStock }); setEditPartError(""); }} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }} title="แก้ไข">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeletePartMsg(""); setDeletePartCanForce(false); setConfirmDeletePart(p); }} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }} title="ลบ">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-4">
                <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPageChange={setPage} />
            </div>

            {/* Action Modal (เพิ่ม/เบิก) */}
            {selectedPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => !submitting && !success && closeModal()}>
                    <div className="rounded-2xl w-[90%] max-w-md shadow-2xl overflow-hidden" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 flex items-center justify-between" style={{ borderBottom: `2px solid ${accentColor}20` }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                                    {isIn ? <ArrowDownToLine className="w-5 h-5" style={{ color: accentColor }} /> : <ArrowUpFromLine className="w-5 h-5" style={{ color: accentColor }} />}
                                </div>
                                <div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>{isIn ? "เพิ่มสต็อกสี" : "เบิกสี"}</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{isIn ? "เพิ่มจำนวนเข้าคลัง" : "เบิกออกจากคลัง"}</p></div>
                            </div>
                            <button onClick={closeModal} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
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
                                <div className="rounded-xl p-4" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                    <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{selectedPart.name}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)" }}>{selectedPart.code}</span>
                                        {selectedPart.brand && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedPart.brand}</span>}
                                        {selectedPart.specification && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: TYPE_COLORS[selectedPart.specification]?.bg || "rgba(139,92,246,0.1)", color: TYPE_COLORS[selectedPart.specification]?.text || "#8B5CF6" }}>{selectedPart.specification}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>สต็อกปัจจุบัน:</span>
                                        <span className={`text-sm font-bold ${selectedPart.quantity <= selectedPart.minStock ? "text-red-500" : "text-emerald-500"}`}>{selectedPart.quantity} {selectedPart.unit}</span>
                                    </div>
                                </div>
                                {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-500">{error}</p></div>}
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>{isIn ? "จำนวนที่เพิ่ม" : "จำนวนที่เบิก"}</label>
                                    <div className="flex items-stretch gap-0 rounded-xl overflow-hidden" style={{ border: `2px solid ${accentColor}30` }}>
                                        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} className="w-14 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 shrink-0" style={{ background: `${accentColor}10`, color: accentColor }}><Minus className="w-5 h-5" strokeWidth={3} /></button>
                                        <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="flex-1 text-center text-2xl font-bold py-3 focus:outline-none" style={{ background: "var(--t-input-bg)", color: "var(--t-text)", borderLeft: `1px solid ${accentColor}20`, borderRight: `1px solid ${accentColor}20` }} min={1} />
                                        <button type="button" onClick={() => setQty(actionType === "OUT" ? Math.min(qty + 1, selectedPart.quantity) : qty + 1)} disabled={actionType === "OUT" && qty >= selectedPart.quantity} className="w-14 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 shrink-0" style={{ background: `${accentColor}10`, color: accentColor }}><Plus className="w-5 h-5" strokeWidth={3} /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>เหตุผล <span className="font-normal text-xs" style={{ color: "var(--t-text-dim)" }}>(ถ้ามี)</span></label>
                                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder={isIn ? "เช่น สั่งซื้อเพิ่ม" : "เช่น ใช้งาน JOB-0003"} />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={closeModal} className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={handleSubmit} disabled={submitting || (actionType === "OUT" && qty > selectedPart.quantity)} className="flex-1 flex items-center justify-center gap-2 text-white font-bold rounded-xl py-3 text-sm transition-all cursor-pointer disabled:opacity-40 shadow-lg" style={{ background: accentColor, boxShadow: `0 8px 16px ${accentColor}30` }}>
                                        {isIn ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                                        {submitting ? "กำลัง..." : isIn ? "เพิ่มสต็อก" : "เบิกสี"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Paint Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowCreate(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}><Palette className="w-5 h-5" style={{ color: "#8B5CF6" }} /></div>
                                <div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>เพิ่มสีใหม่</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>เพิ่มสีเข้าคลัง</p></div>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        {createError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{createError}</div>}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัสสี (สีเบอร์) *</label><input value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="PT-013" /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>แม่สี / ยี่ห้อ</label><input value={createForm.brand} onChange={(e) => setCreateForm({ ...createForm, brand: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="Sikkens, Standox" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่อสี *</label><input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="สีแดงมิลาน 3P0" /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ประเภท</label>
                                    <select value={createForm.specification} onChange={(e) => setCreateForm({ ...createForm, specification: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30 cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                        {PAINT_TYPES.filter(t => t !== "ทั้งหมด").map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} rows={2} placeholder="อัตราผสม 2:1, สำหรับพ่นรถญี่ปุ่น" /></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>จำนวน</label><input type="number" value={createForm.quantity} onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} min={0} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ขั้นต่ำ</label><input type="number" value={createForm.minStock} onChange={(e) => setCreateForm({ ...createForm, minStock: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} min={0} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หน่วย</label>
                                    {customUnit ? (<div className="flex gap-1.5"><input value={createForm.unit} onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="กรอกหน่วย..." autoFocus /><button type="button" onClick={() => { setCustomUnit(false); setCreateForm({ ...createForm, unit: "กระป๋อง" }); }} className="px-2 rounded-lg text-xs shrink-0 cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-muted)" }}>เลือก</button></div>) : (<select value={createForm.unit} onChange={(e) => { if (e.target.value === "__custom__") { setCustomUnit(true); setCreateForm({ ...createForm, unit: "" }); } else { setCreateForm({ ...createForm, unit: e.target.value }); } }} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>{unitOptions.map(u => <option key={u} value={u}>{u}</option>)}<option value="__custom__">+ กรอกเอง...</option></select>)}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!createForm.code || !createForm.name) { setCreateError("กรุณากรอกรหัสและชื่อสี"); return; } setCreateSaving(true); setCreateError(""); try { await createPart({ ...createForm, quantity: Number(createForm.quantity), minStock: Number(createForm.minStock), categoryId: paintCatId }); setShowCreate(false); fetchParts(); } catch (err: any) { setCreateError(err.message || "เกิดข้อผิดพลาด"); } finally { setCreateSaving(false); } }} disabled={createSaving} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50" style={{ background: "#8B5CF6" }}>{createSaving ? "กำลังบันทึก..." : "เพิ่มสี"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Paint Modal */}
            {editingPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setEditingPart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}><Pencil className="w-5 h-5" style={{ color: "#8B5CF6" }} /></div><div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>แก้ไขสี</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{editingPart.name}</p></div></div>
                            <button onClick={() => setEditingPart(null)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        {editPartError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{editPartError}</div>}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัสสี *</label><input value={editPartForm.code} onChange={(e) => setEditPartForm({ ...editPartForm, code: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>แม่สี / ยี่ห้อ</label><input value={editPartForm.brand} onChange={(e) => setEditPartForm({ ...editPartForm, brand: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่อสี *</label><input value={editPartForm.name} onChange={(e) => setEditPartForm({ ...editPartForm, name: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ประเภท</label>
                                    <select value={editPartForm.specification} onChange={(e) => setEditPartForm({ ...editPartForm, specification: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                        {PAINT_TYPES.filter(t => t !== "ทั้งหมด").map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={editPartForm.description} onChange={(e) => setEditPartForm({ ...editPartForm, description: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} rows={2} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>สต็อกขั้นต่ำ</label><input type="number" value={editPartForm.minStock} onChange={(e) => setEditPartForm({ ...editPartForm, minStock: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} min={0} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หน่วย</label>
                                    {customEditUnit ? (<div className="flex gap-1.5"><input value={editPartForm.unit} onChange={(e) => setEditPartForm({ ...editPartForm, unit: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="กรอกหน่วย..." autoFocus /><button type="button" onClick={() => { setCustomEditUnit(false); setEditPartForm({ ...editPartForm, unit: "กระป๋อง" }); }} className="px-2 rounded-lg text-xs shrink-0 cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-muted)" }}>เลือก</button></div>) : (<select value={editPartForm.unit} onChange={(e) => { if (e.target.value === "__custom__") { setCustomEditUnit(true); setEditPartForm({ ...editPartForm, unit: "" }); } else { setEditPartForm({ ...editPartForm, unit: e.target.value }); } }} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>{unitOptions.map(u => <option key={u} value={u}>{u}</option>)}<option value="__custom__">+ กรอกเอง...</option></select>)}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setEditingPart(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!editPartForm.code || !editPartForm.name) { setEditPartError("กรุณากรอกรหัสและชื่อ"); return; } setEditPartSaving(true); setEditPartError(""); try { await updatePart(editingPart.id, editPartForm); setEditingPart(null); toast.success("แก้ไขสีเรียบร้อย"); fetchParts(); } catch (err: any) { setEditPartError(err.message || "เกิดข้อผิดพลาด"); } finally { setEditPartSaving(false); } }} disabled={editPartSaving} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50" style={{ background: "#8B5CF6" }}>{editPartSaving ? "กำลังบันทึก..." : "บันทึก"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Part Modal */}
            {confirmDeletePart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setConfirmDeletePart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>ลบสี</h3></div>
                        <p className="text-sm mb-1" style={{ color: "var(--t-text-secondary)" }}>คุณต้องการลบ <strong>{confirmDeletePart.name}</strong> ใช่ไหม?</p>
                        {deletePartMsg && <div className={`text-xs mt-2 mb-3 p-2 rounded-lg ${deletePartCanForce ? "bg-amber-500/10 border border-amber-500/20 text-amber-600" : "bg-red-500/10 border border-red-500/20 text-red-500"}`}>{deletePartMsg}</div>}
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setConfirmDeletePart(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            {deletePartCanForce && <button onClick={async () => { try { await deletePartForce(confirmDeletePart.id); setConfirmDeletePart(null); toast.success("ลบสีและประวัติเรียบร้อย"); fetchParts(); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบพร้อมประวัติ</button>}
                            <button onClick={async () => { const r = await deletePart(confirmDeletePart.id); if (r.success) { setConfirmDeletePart(null); toast.success("ลบสีเรียบร้อย"); fetchParts(); } else { setDeletePartMsg(r.error || "ลบไม่ได้"); setDeletePartCanForce(r.canForce || false); } }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

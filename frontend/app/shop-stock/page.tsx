"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
    getShopStock, getShopStockSummary, createShopStock,
    updateShopStockCondition, deleteShopStock, getCategories,
} from "@/lib/api";
import {
    Warehouse, Search, Filter, Plus, X, AlertCircle, CheckCircle2,
    Wrench, Skull, Package, Trash2, Car, ChevronDown,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import BarcodeModal from "@/components/BarcodeModal";

const SOURCE_LABELS: Record<string, string> = {
    EXCESS_ORDER: "สั่ง Supply เกิน",
    CUSTOMER_LEFTOVER: "ลูกค้าไม่เอาคืน",
    CLAIM_MISMATCH: "เคลมไม่ตรง",
    CLAIM_NO_PICKUP: "ลูกค้าไม่มารับ",
};
const SOURCE_COLORS: Record<string, string> = {
    EXCESS_ORDER: "#F97316",
    CUSTOMER_LEFTOVER: "#F59E0B",
    CLAIM_MISMATCH: "#EF4444",
    CLAIM_NO_PICKUP: "#A855F7",
};
const CONDITION_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    USABLE: { label: "ใช้ได้", icon: CheckCircle2, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
    NEEDS_REPAIR: { label: "ต้องซ่อมก่อน", icon: Wrench, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
    SCRAP: { label: "ซาก", icon: Skull, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};

export default function ShopStockPage() {
    const [items, setItems] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterSource, setFilterSource] = useState("");
    const [filterCondition, setFilterCondition] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

    // Modals
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({
        name: "", description: "", categoryId: "", carBrand: "", carModel: "",
        quantity: 1, unit: "ชิ้น", source: "EXCESS_ORDER" as string, sourceRef: "", sourceNote: "",
        condition: "USABLE" as string,
    });
    const [addSaving, setAddSaving] = useState(false);
    const [addError, setAddError] = useState("");

    // Condition change
    const [conditionDropdown, setConditionDropdown] = useState<string | null>(null);

    // Delete
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [barcodePart, setBarcodePart] = useState<any>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), pageSize: "20" };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterSource) params.source = filterSource;
            if (filterCondition) params.condition = filterCondition;
            if (filterCategory) params.categoryId = filterCategory;
            const [result, sum, cats] = await Promise.all([
                getShopStock(params),
                getShopStockSummary(),
                getCategories(),
            ]);
            setItems(result.data);
            setPagination(result.pagination);
            setSummary(sum);
            setCategories(cats);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [page, debouncedSearch, filterSource, filterCondition, filterCategory]);

    const resetPage = (setter: (v: any) => void, val: any) => { setPage(1); setter(val); };

    // ---- Add handler ----
    const handleAdd = async () => {
        if (!addForm.name || !addForm.categoryId) { setAddError("กรุณากรอกชื่อและเลือกประเภท"); return; }
        setAddSaving(true); setAddError("");
        try {
            await createShopStock({ ...addForm, quantity: Number(addForm.quantity) });
            setShowAdd(false);
            toast.success("เพิ่มอะไหล่เข้าสต็อกเรียบร้อย");
            fetchAll();
        } catch (err: any) { setAddError(err.message || "ไม่สามารถเพิ่มได้"); }
        finally { setAddSaving(false); }
    };

    // ---- Condition change handler ----
    const handleCondition = async (id: string, condition: string) => {
        try {
            await updateShopStockCondition(id, condition);
            setConditionDropdown(null);
            toast.success("เปลี่ยนสถานะเรียบร้อย");
            fetchAll();
        } catch (err: any) { toast.error(err.message); }
    };

    // ---- Delete handler ----
    const handleDelete = async (id: string) => {
        try {
            await deleteShopStock(id);
            setConfirmDelete(null);
            toast.success("ลบรายการเรียบร้อย");
            fetchAll();
        } catch (err: any) { toast.error(err.message); }
    };

    if (loading && items.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} />
                    <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดสต็อกอู่...</p>
                </div>
            </div>
        );
    }

    const summaryCards = [
        { label: "ทั้งหมด", value: summary?.total?.qty ?? 0, count: summary?.total?.count ?? 0, icon: Warehouse, color: "#8B5CF6" },
        { label: "ใช้ได้", value: summary?.usable?.qty ?? 0, count: summary?.usable?.count ?? 0, icon: CheckCircle2, color: "#22C55E" },
        { label: "ต้องซ่อม", value: summary?.needsRepair?.qty ?? 0, count: summary?.needsRepair?.count ?? 0, icon: Wrench, color: "#F59E0B" },
        { label: "ซาก", value: summary?.scrap?.qty ?? 0, count: summary?.scrap?.count ?? 0, icon: Skull, color: "#EF4444" },
    ];

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>สต็อกอู่</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>อะไหล่ที่เก็บสะสมจากการซ่อมและเคลม</p>
                </div>
                <button onClick={() => {
                    setAddForm({ name: "", description: "", categoryId: "", carBrand: "", carModel: "", quantity: 1, unit: "ชิ้น", source: "EXCESS_ORDER", sourceRef: "", sourceNote: "", condition: "USABLE" });
                    setAddError(""); setShowAdd(true);
                }} className="flex items-center gap-2 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer" style={{ background: "#8B5CF6" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#7C3AED"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#8B5CF6"}>
                    <Plus className="w-4 h-4" /> เพิ่มเข้าสต็อก
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {summaryCards.map((s) => (
                    <div key={s.label} className="rounded-xl p-4 transition-all" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: `2px solid ${s.color}` }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${s.color}20` }}>
                                <s.icon className="w-5 h-5" style={{ color: s.color }} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{s.value} <span className="text-sm font-normal" style={{ color: "var(--t-text-muted)" }}>ชิ้น</span></div>
                                <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                        <input value={search} onChange={(e) => resetPage(setSearch, e.target.value)} placeholder="ค้นหา... (ชื่อ, ยี่ห้อรถ, รุ่นรถ)" className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>
                    <select value={filterSource} onChange={(e) => resetPage(setFilterSource, e.target.value)} className="rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                        <option value="">ที่มาทั้งหมด</option>
                        {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select value={filterCondition} onChange={(e) => resetPage(setFilterCondition, e.target.value)} className="rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                        <option value="">สถานะทั้งหมด</option>
                        {Object.entries(CONDITION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{pagination.total}</span> รายการ</p>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {items.length === 0 ? (
                    <div className="text-center py-16">
                        <Warehouse className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                        <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีอะไหล่ในสต็อกอู่</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    {["ชื่ออะไหล่", "ยี่ห้อ/รุ่นรถ", "ที่มา", "สถานะ", "จำนวน", "จัดการ"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const cond = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.USABLE;
                                    const CondIcon = cond.icon;
                                    const barcodeItem = { code: `SS-${item.id.slice(-6).toUpperCase()}`, name: item.name, brand: item.carBrand ? `${item.carBrand} ${item.carModel || ""}`.trim() : "", quantity: item.quantity, minStock: 0, unit: item.unit, category: item.category };
                                    return (
                                        <tr key={item.id} className="transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            onClick={() => setBarcodePart(barcodeItem)}>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{item.name}</p>
                                                {item.description && <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{item.description}</p>}
                                                <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-dim)" }}>{item.category?.name}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.carBrand || item.carModel ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Car className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
                                                        <span className="text-sm" style={{ color: "var(--t-text-secondary)" }}>{[item.carBrand, item.carModel].filter(Boolean).join(" ")}</span>
                                                    </div>
                                                ) : <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>-</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${SOURCE_COLORS[item.source]}15`, color: SOURCE_COLORS[item.source] }}>
                                                    {SOURCE_LABELS[item.source]}
                                                </span>
                                                {item.sourceRef && <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-dim)" }}>{item.sourceRef}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={(e) => { e.stopPropagation(); setConditionDropdown(conditionDropdown === item.id ? null : item.id); }}
                                                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80" style={{ background: cond.bg, color: cond.color }}>
                                                    <CondIcon className="w-3 h-3" />
                                                    {cond.label}
                                                    <ChevronDown className="w-3 h-3 ml-0.5" />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-bold" style={{ color: item.quantity === 0 ? "#EF4444" : "var(--t-text)" }}>{item.quantity}</span>
                                                <span className="text-xs ml-1" style={{ color: "var(--t-text-muted)" }}>{item.unit}</span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(item); }}
                                                    className="p-1.5 rounded-lg cursor-pointer transition-colors"
                                                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }} title="ลบ">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPageChange={setPage} />
            </div>

            {/* ──── Add Modal ──── */}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAdd(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}><Warehouse className="w-5 h-5" style={{ color: "#8B5CF6" }} /></div>
                                <div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>เพิ่มอะไหล่เข้าสต็อกอู่</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>กรอกข้อมูลอะไหล่ที่ได้มา</p></div>
                            </div>
                            <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>

                        {addError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-500">{addError}</p></div>}

                        <div className="space-y-4">
                            {/* ชื่อ */}
                            <div><label className="text-sm mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ *</label><input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="เช่น ไฟหน้า, กันชนหน้า" /></div>

                            {/* ประเภท */}
                            <div><label className="text-sm mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ประเภท *</label>
                                <select value={addForm.categoryId} onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                    <option value="">-- เลือกประเภท --</option>
                                    {categories.filter(c => !c.parentId).map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* ยี่ห้อ/รุ่นรถ */}
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ยี่ห้อรถ</label><input value={addForm.carBrand} onChange={(e) => setAddForm({ ...addForm, carBrand: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="Toyota, Honda" /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รุ่นรถ</label><input value={addForm.carModel} onChange={(e) => setAddForm({ ...addForm, carModel: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="Vios, Civic" /></div>
                            </div>

                            {/* ที่มา */}
                            <div><label className="text-sm mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ที่มา *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                                        <button key={key} type="button" onClick={() => setAddForm({ ...addForm, source: key })}
                                            className="rounded-lg px-3 py-2.5 text-xs font-medium text-left cursor-pointer transition-all"
                                            style={{
                                                background: addForm.source === key ? `${SOURCE_COLORS[key]}15` : "var(--t-input-bg)",
                                                border: `1.5px solid ${addForm.source === key ? SOURCE_COLORS[key] : "var(--t-input-border)"}`,
                                                color: addForm.source === key ? SOURCE_COLORS[key] : "var(--t-text-secondary)",
                                            }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reference + Note */}
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>อ้างอิง</label><input value={addForm.sourceRef} onChange={(e) => setAddForm({ ...addForm, sourceRef: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="Job #xxx, Claim #xxx" /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เหตุผล</label><input value={addForm.sourceNote} onChange={(e) => setAddForm({ ...addForm, sourceNote: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="หมายเหตุเพิ่มเติม" /></div>
                            </div>

                            {/* สถานะ + จำนวน */}
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>สถานะ</label>
                                    <select value={addForm.condition} onChange={(e) => setAddForm({ ...addForm, condition: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                        {Object.entries(CONDITION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>จำนวน</label><input type="number" value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: Math.max(1, Number(e.target.value)) })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} min={1} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หน่วย</label><input value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            </div>

                            {/* Description */}
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียดเพิ่มเติม</label><textarea value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} rows={2} /></div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowAdd(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleAdd} disabled={addSaving} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50 transition-colors" style={{ background: "#8B5CF6" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#7C3AED"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "#8B5CF6"}>
                                {addSaving ? "กำลังบันทึก..." : "เพิ่มเข้าสต็อก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──── Delete Modal ──── */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setConfirmDelete(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div>
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>ยืนยันการลบ</h3>
                        </div>
                        <p className="text-sm mb-4" style={{ color: "var(--t-text-secondary)" }}>คุณต้องการลบ <strong>{confirmDelete.name}</strong> ออกจากสต็อกอู่?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={() => handleDelete(confirmDelete.id)} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──── Condition Change Modal ──── */}
            {conditionDropdown && (() => {
                const item = items.find((i: any) => i.id === conditionDropdown);
                if (!item) return null;
                const currentCond = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.USABLE;
                const CurrentIcon = currentCond.icon;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setConditionDropdown(null)}>
                        <div className="rounded-2xl p-5 w-[90%] max-w-xs shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: currentCond.bg }}>
                                    <CurrentIcon className="w-5 h-5" style={{ color: currentCond.color }} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>เปลี่ยนสถานะ</h3>
                                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{item.name}</p>
                                </div>
                                <button onClick={() => setConditionDropdown(null)} className="ml-auto p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-2">
                                {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => {
                                    const Icon = cfg.icon;
                                    const isActive = key === item.condition;
                                    return (
                                        <button key={key} onClick={() => handleCondition(item.id, key)}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all"
                                            style={{
                                                background: isActive ? cfg.bg : "transparent",
                                                border: `1.5px solid ${isActive ? cfg.color : "var(--t-border-subtle)"}`,
                                                color: isActive ? cfg.color : "var(--t-text-secondary)",
                                            }}>
                                            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                                            {cfg.label}
                                            {isActive && <span className="ml-auto text-xs">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <BarcodeModal part={barcodePart} onClose={() => setBarcodePart(null)} />
        </div>
    );
}

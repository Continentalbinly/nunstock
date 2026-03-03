"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getParts, getCategories, createPart, updatePart, deletePart, deletePartForce, createCategory, deleteCategory, updateCategory } from "@/lib/api";
import { getCarLogoUrl } from "@/lib/carLogos";
import { Barcode, Search, Package, X, Printer, ScanBarcode, Car, Wrench, ChevronLeft, Plus, Building2, Pencil, Trash2, PackagePlus, ShieldCheck } from "lucide-react";
import { isElectron, printBarcode } from "@/lib/electron";
import { toast } from "sonner";
import { Pagination } from "@/components/Pagination";

type TabType = "shop" | "insurance" | "consumables";
const TAB_CONFIG: Record<TabType, { label: string; icon: any; color: string }> = {
    shop: { label: "หน้าร้าน", icon: Car, color: "#22C55E" },
    insurance: { label: "ประกัน", icon: ShieldCheck, color: "#F97316" },
    consumables: { label: "วัสดุสิ้นเปลือง", icon: Wrench, color: "#F59E0B" },
};

const inputStyle: React.CSSProperties = { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" };
const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500/30";

export default function PartsCatalogPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [parts, setParts] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 24, total: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [pendingSearch, setPendingSearch] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>((searchParams.get("tab") as TabType) || "shop");

    // Navigation state
    const [selectedCompanyId, setSelectedCompanyId] = useState(searchParams.get("company") || "");
    const [selectedBrandId, setSelectedBrandId] = useState(searchParams.get("brand") || "");
    const [selectedModelId, setSelectedModelId] = useState(searchParams.get("model") || "");
    const [brandSearch, setBrandSearch] = useState("");
    const [modelSearch, setModelSearch] = useState("");
    const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

    // Barcode
    const [selectedPart, setSelectedPart] = useState<any>(null);
    const barcodeRef = useRef<HTMLCanvasElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [printQty, setPrintQty] = useState(1);
    const lastKeyTime = useRef(0);
    const keyBuffer = useRef("");
    const [scannerMode, setScannerMode] = useState(false);

    // CRUD modals
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [addCategoryParentId, setAddCategoryParentId] = useState<string | null>(null);
    const [addCategoryLabel, setAddCategoryLabel] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [editName, setEditName] = useState("");

    // Create/Edit Part
    const [showCreatePart, setShowCreatePart] = useState(false);
    const [createForm, setCreateForm] = useState({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5 });
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");
    const [editingPart, setEditingPart] = useState<any>(null);
    const [editPartForm, setEditPartForm] = useState({ code: "", name: "", description: "", brand: "" });
    const [editPartSaving, setEditPartSaving] = useState(false);
    const [editPartError, setEditPartError] = useState("");
    const [confirmDeletePart, setConfirmDeletePart] = useState<any>(null);
    const [deletePartMsg, setDeletePartMsg] = useState("");
    const [deletePartCanForce, setDeletePartCanForce] = useState(false);

    // Root categories
    const shopRoot = categories.find(c => c.name === "รถหน้าร้าน" && !c.parentId);
    const insuranceRoot = categories.find(c => c.name === "รถประกัน" && !c.parentId);
    const consumableRoot = categories.find(c => c.name === "อุปกรณ์สิ้นเปลือง" && !c.parentId);

    // Derived lists based on tab
    const companies = categories.filter(c => c.parentId === insuranceRoot?.id); // insurance companies
    const shopBrands = categories.filter(c => c.parentId === shopRoot?.id);
    const currentParentId = activeTab === "shop" ? shopRoot?.id : activeTab === "insurance" ? insuranceRoot?.id : consumableRoot?.id;

    // Selected objects
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const brands = activeTab === "insurance" && selectedCompany ? categories.filter(c => c.parentId === selectedCompany.id) : shopBrands;
    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const models = selectedBrand ? categories.filter(c => c.parentId === selectedBrand.id) : [];
    const selectedModel = models.find(m => m.id === selectedModelId);

    // Active color
    const activeColor = TAB_CONFIG[activeTab]?.color || "#22C55E";

    useEffect(() => {
        getCategories().then(c => setCategories(c)).catch(console.error).finally(() => setLoading(false));
    }, []);

    // Tab counts
    useEffect(() => {
        if (categories.length === 0) return;
        getParts({ pageSize: "1" }).then(r => {
            const total = r.pagination.total;
            if (consumableRoot) {
                getParts({ categoryId: consumableRoot.id, pageSize: "1" }).then(cr => {
                    setTabCounts({ shop: total - cr.pagination.total, consumables: cr.pagination.total, insurance: 0 });
                }).catch(() => setTabCounts({ shop: total, consumables: 0, insurance: 0 }));
            } else { setTabCounts({ shop: total, consumables: 0, insurance: 0 }); }
        }).catch(() => { });
    }, [categories, consumableRoot?.id]);

    const fetchParts = async (currentPage = 1, currentSearch = search) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(currentPage), pageSize: "24" };
            if (currentSearch) params.search = currentSearch;
            if (activeTab === "shop" && selectedModelId) params.categoryId = selectedModelId;
            else if (activeTab === "insurance" && selectedModelId) params.categoryId = selectedModelId;
            else if (activeTab === "consumables" && consumableRoot) params.categoryId = consumableRoot.id;
            const result = await getParts(params);
            setParts(result.data);
            setPagination(result.pagination);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        if (categories.length > 0 && (selectedModelId || activeTab === "consumables")) fetchParts(page, search);
    }, [activeTab, selectedModelId, page, consumableRoot?.id]);

    // Barcode rendering
    useEffect(() => {
        if (selectedPart && barcodeRef.current) {
            import("jsbarcode").then(JsBarcode => {
                JsBarcode.default(barcodeRef.current, selectedPart.code, {
                    format: "CODE128", width: 4, height: 120, displayValue: true,
                    background: "#FFFFFF", lineColor: "#000000", fontSize: 32, font: "bold 'Courier New', monospace", fontOptions: "bold", margin: 12, textMargin: 12,
                });
            });
        }
    }, [selectedPart]);

    const updateUrl = (tab: TabType, companyId?: string, brandId?: string, modelId?: string) => {
        const params = new URLSearchParams();
        params.set("tab", tab);
        if (companyId) params.set("company", companyId);
        if (brandId) params.set("brand", brandId);
        if (modelId) params.set("model", modelId);
        router.push(`/barcode?${params.toString()}`);
    };

    const switchTab = (tab: TabType) => {
        setActiveTab(tab); setSelectedCompanyId(""); setSelectedBrandId(""); setSelectedModelId("");
        setSearch(""); setPendingSearch(""); setBrandSearch(""); setModelSearch("");
        setParts([]); setPage(1);
        updateUrl(tab);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const now = Date.now(); const timeDiff = now - lastKeyTime.current;
        if (e.key === "Enter") {
            e.preventDefault();
            if (keyBuffer.current.length >= 3) {
                const match = parts.find(p => p.code.toLowerCase() === keyBuffer.current.toLowerCase());
                if (match) { setSelectedPart(match); setPendingSearch(""); setScannerMode(false); keyBuffer.current = ""; return; }
            }
            if (parts.length === 1) setSelectedPart(parts[0]);
            keyBuffer.current = ""; return;
        }
        if (timeDiff < 50 && e.key.length === 1) { setScannerMode(true); keyBuffer.current += e.key; }
        else if (e.key.length === 1) { keyBuffer.current = e.key; setScannerMode(false); }
        lastKeyTime.current = now;
    };

    const handlePrint = async () => {
        if (!barcodeRef.current || !selectedPart) return;
        const dataUrl = barcodeRef.current.toDataURL("image/png");
        if (isElectron()) {
            const savedPrinter = localStorage.getItem("nunmechanic-printer") || undefined;
            if (!savedPrinter) { toast.error("กรุณาเลือกเครื่องปริ้นก่อนที่หน้า 'เครื่องปริ้น'"); return; }
            let successCount = 0;
            for (let i = 0; i < printQty; i++) { const r = await printBarcode({ imageDataUrl: dataUrl, printerName: savedPrinter }); if (r.success) successCount++; }
            if (successCount === printQty) toast.success(`ปริ้นบาร์โค้ด ${printQty} แผ่นสำเร็จ!`);
            else toast.error(`ปริ้นสำเร็จ ${successCount}/${printQty} แผ่น`);
        } else {
            const container = document.createElement("div"); container.id = "barcode-print";
            container.innerHTML = Array(printQty).fill(`<img src="${dataUrl}" />`).join("");
            document.body.appendChild(container);
            setTimeout(() => { window.print(); setTimeout(() => { if (container.parentNode) container.parentNode.removeChild(container); }, 500); }, 100);
        }
    };

    const getCategoryLabel = (part: any): string => part.category ? part.category.name : "-";

    const refreshCategories = async () => { const c = await getCategories(); setCategories(c); };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim() || !addCategoryParentId) return;
        try { await createCategory({ name: newCategoryName.trim(), parentId: addCategoryParentId }); setShowAddCategory(false); await refreshCategories(); }
        catch (err: any) { toast.error(err.message); }
    };

    const handleDeleteCategory = async () => {
        if (!confirmDelete) return;
        try {
            await deleteCategory(confirmDelete.id); setConfirmDelete(null); await refreshCategories();
            if (selectedCompanyId === confirmDelete.id) { setSelectedCompanyId(""); setSelectedBrandId(""); setSelectedModelId(""); }
            else if (selectedBrandId === confirmDelete.id) { setSelectedBrandId(""); setSelectedModelId(""); }
            else if (selectedModelId === confirmDelete.id) { setSelectedModelId(""); }
        } catch (err: any) { toast.error(err.message); setConfirmDelete(null); }
    };

    const handleEditCategory = async () => {
        if (!editingCategory || !editName.trim()) return;
        try { await updateCategory(editingCategory.id, { name: editName.trim() }); setEditingCategory(null); await refreshCategories(); }
        catch (err: any) { toast.error(err.message); }
    };

    if (loading && categories.length === 0) return (
        <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-center">
            <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: activeColor }} />
            <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p>
        </div></div>
    );

    // ──── Shared Modals ─────────────────────────────────────────
    const sharedModals = (
        <>
            {/* Add Category */}
            {showAddCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setShowAddCategory(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>{addCategoryLabel}</h3>
                        <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateCategory()}
                            className={inputCls} style={inputStyle} placeholder="ชื่อ..." autoFocus />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowAddCategory(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleCreateCategory} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer" style={{ background: activeColor }}>เพิ่ม</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Category */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setEditingCategory(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>แก้ไขชื่อ</h3>
                        <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEditCategory()}
                            className={inputCls} style={inputStyle} autoFocus />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setEditingCategory(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleEditCategory} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer" style={{ background: activeColor }}>บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Category */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setConfirmDelete(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div>
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>ลบ {confirmDelete.name}?</h3>
                        </div>
                        <p className="text-xs mb-4" style={{ color: "var(--t-text-dim)" }}>⚠️ รายการย่อยและอะไหล่ทั้งหมดจะถูกลบด้วย</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleDeleteCategory} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Part */}
            {showCreatePart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setShowCreatePart(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${activeColor}15` }}><PackagePlus className="w-5 h-5" style={{ color: activeColor }} /></div>
                                <div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>สร้างอะไหล่ใหม่</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedBrand?.name} {selectedModel?.name}</p></div></div>
                            <button onClick={() => setShowCreatePart(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        {createError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{createError}</div>}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัส *</label><input value={createForm.code} onChange={e => setCreateForm({ ...createForm, code: e.target.value })} className={inputCls} style={inputStyle} /></div>
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>คุณภาพ</label><input value={createForm.brand} onChange={e => setCreateForm({ ...createForm, brand: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            </div>
                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ *</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} className={inputCls} style={inputStyle} rows={2} /></div>
                        </div>
                        <div className="flex gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowCreatePart(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => {
                                if (!createForm.code || !createForm.name) { setCreateError("กรุณากรอกรหัสและชื่อ"); return; }
                                setCreateSaving(true); setCreateError("");
                                try { await createPart({ ...createForm, quantity: 0, minStock: 0, categoryId: selectedModelId }); setShowCreatePart(false); fetchParts(page, search); }
                                catch (err: any) { setCreateError(err.message); }
                                finally { setCreateSaving(false); }
                            }} disabled={createSaving} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50" style={{ background: activeColor }}>
                                {createSaving ? "กำลังบันทึก..." : "สร้างอะไหล่"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Part */}
            {editingPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setEditingPart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>แก้ไขอะไหล่</h3>
                            <button onClick={() => setEditingPart(null)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        {editPartError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{editPartError}</div>}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัส *</label><input value={editPartForm.code} onChange={e => setEditPartForm({ ...editPartForm, code: e.target.value })} className={inputCls} style={inputStyle} /></div>
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>คุณภาพ</label><input value={editPartForm.brand} onChange={e => setEditPartForm({ ...editPartForm, brand: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            </div>
                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ *</label><input value={editPartForm.name} onChange={e => setEditPartForm({ ...editPartForm, name: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={editPartForm.description} onChange={e => setEditPartForm({ ...editPartForm, description: e.target.value })} className={inputCls} style={inputStyle} rows={2} /></div>
                        </div>
                        <div className="flex gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setEditingPart(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => {
                                if (!editPartForm.code || !editPartForm.name) { setEditPartError("กรุณากรอกรหัสและชื่อ"); return; }
                                setEditPartSaving(true); setEditPartError("");
                                try { await updatePart(editingPart.id, editPartForm); setEditingPart(null); toast.success("แก้ไขเรียบร้อย"); fetchParts(page, search); }
                                catch (err: any) { setEditPartError(err.message); }
                                finally { setEditPartSaving(false); }
                            }} disabled={editPartSaving} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50" style={{ background: activeColor }}>
                                {editPartSaving ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Part */}
            {confirmDeletePart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setConfirmDeletePart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>ลบ {confirmDeletePart.name}?</h3></div>
                        {deletePartMsg && <div className={`text-xs mb-3 p-2 rounded-lg ${deletePartCanForce ? "bg-amber-500/10 border border-amber-500/20 text-amber-600" : "bg-red-500/10 border border-red-500/20 text-red-500"}`}>{deletePartMsg}</div>}
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeletePart(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            {deletePartCanForce && <button onClick={async () => { try { await deletePartForce(confirmDeletePart.id); setConfirmDeletePart(null); toast.success("ลบเรียบร้อย"); fetchParts(page, search); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบพร้อมประวัติ</button>}
                            <button onClick={async () => { const r = await deletePart(confirmDeletePart.id); if (r.success) { setConfirmDeletePart(null); toast.success("ลบเรียบร้อย"); fetchParts(page, search); } else { setDeletePartMsg(r.error || "ลบไม่ได้"); setDeletePartCanForce(r.canForce || false); } }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Barcode Modal */}
            {selectedPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center no-print" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setSelectedPart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold" style={{ color: "var(--t-text)" }}>บาร์โค้ด</h3>
                            <button onClick={() => setSelectedPart(null)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="rounded-lg p-3 mb-4" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                            <p className="font-medium" style={{ color: "var(--t-text)" }}>{selectedPart.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedPart.code}</span>
                                {selectedPart.brand && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>• {selectedPart.brand}</span>}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 flex justify-center overflow-hidden"><canvas ref={barcodeRef} style={{ maxWidth: "100%", height: "auto" }} /></div>
                        <div className="flex items-center justify-between mt-4 p-3 rounded-lg" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                            <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>จำนวนแผ่น</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPrintQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>−</button>
                                <input type="number" value={printQty} onChange={e => setPrintQty(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))} className="w-12 text-center text-sm font-bold rounded-lg py-1 focus:outline-none" style={inputStyle} min={1} max={99} />
                                <button onClick={() => setPrintQty(q => Math.min(99, q + 1))} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>+</button>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => { setSelectedPart(null); setPrintQty(1); }} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ปิด</button>
                            <button onClick={handlePrint} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer flex items-center justify-center gap-2" style={{ background: "#22C55E" }}><Printer className="w-4 h-4" /> พิมพ์ {printQty > 1 ? `${printQty} แผ่น` : "บาร์โค้ด"}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // ──── Tab Header (shared) ───────────────────────────────────
    const tabHeader = (
        <div className="flex gap-2 mb-6">
            {(Object.entries(TAB_CONFIG) as [TabType, typeof TAB_CONFIG[TabType]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => switchTab(key)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                    style={{ background: activeTab === key ? `${cfg.color}15` : "var(--t-input-bg)", border: `1px solid ${activeTab === key ? `${cfg.color}40` : "var(--t-input-border)"}`, color: activeTab === key ? cfg.color : "var(--t-text-secondary)" }}>
                    <cfg.icon className="w-4 h-4" /> {cfg.label}
                    <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: activeTab === key ? `${cfg.color}20` : "var(--t-badge-bg)", color: activeTab === key ? cfg.color : "var(--t-text-muted)" }}>{tabCounts[key] || 0}</span>
                </button>
            ))}
        </div>
    );

    // ──── Card Grid helper ──────────────────────────────────────
    const CategoryCard = ({ item, label, onClick, showLogo, logoName }: { item: any; label: string; onClick: () => void; showLogo?: boolean; logoName?: string }) => (
        <div className="group relative rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}80`; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 25px ${activeColor}15`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            onClick={onClick}>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={e => { e.stopPropagation(); setEditingCategory(item); setEditName(item.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไข"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} /></button>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(item); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${activeColor}12` }}>
                {showLogo && logoName && getCarLogoUrl(logoName) ? <img src={getCarLogoUrl(logoName)!} alt={logoName} className="w-10 h-10 object-contain" loading="lazy" /> :
                    activeTab === "insurance" && !selectedCompanyId ? <Building2 className="w-7 h-7" style={{ color: activeColor }} /> :
                        <Car className="w-7 h-7" style={{ color: activeColor }} />}
            </div>
            <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{item.name}</p>
            <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{label}</p>
        </div>
    );

    const AddCard = ({ label, onClick }: { label: string; onClick: () => void }) => (
        <button onClick={onClick} className="rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center border-2 border-dashed" style={{ borderColor: "var(--t-border-subtle)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}80`; e.currentTarget.style.background = `${activeColor}05`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}>
            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${activeColor}10` }}><Plus className="w-7 h-7" style={{ color: activeColor }} /></div>
            <p className="font-bold text-sm" style={{ color: activeColor }}>{label}</p>
        </button>
    );

    // ──── INSURANCE: Company Selection ───────────────────────────
    if (activeTab === "insurance" && !selectedCompanyId) {
        return (<>{sharedModals}<div className="p-6 lg:p-8">
            <div className="mb-8"><h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>คลังอะไหล่</h1><p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>จัดการอะไหล่ทั้งหมด — ประกัน, หน้าร้าน, วัสดุสิ้นเปลือง</p></div>
            {tabHeader}
            <p className="text-sm mb-3 font-medium" style={{ color: "var(--t-text-muted)" }}>เลือกบริษัทประกัน</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {companies.map(c => <CategoryCard key={c.id} item={c} label={`${categories.filter(x => x.parentId === c.id).length} ยี่ห้อรถ`}
                    onClick={() => { setSelectedCompanyId(c.id); updateUrl("insurance", c.id); }} />)}
                <AddCard label="เพิ่มบริษัทประกัน" onClick={() => { setNewCategoryName(""); setAddCategoryParentId(insuranceRoot?.id); setAddCategoryLabel("เพิ่มบริษัทประกันใหม่"); setShowAddCategory(true); }} />
            </div>
        </div></>);
    }

    // ──── Brand Selection (shop or insurance) ──────────────────
    if ((activeTab === "shop" || (activeTab === "insurance" && selectedCompanyId)) && !selectedBrandId) {
        const backLabel = activeTab === "insurance" ? "กลับไปเลือกบริษัทประกัน" : undefined;
        const headerTitle = activeTab === "insurance" ? selectedCompany?.name : "คลังอะไหล่";
        return (<>{sharedModals}<div className="p-6 lg:p-8">
            <div className="mb-8">
                {backLabel && <button onClick={() => { setSelectedCompanyId(""); updateUrl("insurance"); }} className="flex items-center gap-2 text-sm mb-3 cursor-pointer" style={{ color: "var(--t-text-muted)" }}
                    onMouseEnter={e => e.currentTarget.style.color = activeColor} onMouseLeave={e => e.currentTarget.style.color = "var(--t-text-muted)"}><ChevronLeft className="w-4 h-4" /> {backLabel}</button>}
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>{headerTitle}</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกยี่ห้อรถเพื่อดูอะไหล่</p>
            </div>
            {tabHeader}
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                <input value={brandSearch} onChange={e => setBrandSearch(e.target.value)} placeholder="ค้นหายี่ห้อรถ..." className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none`} style={inputStyle} /></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {brands.filter(b => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => {
                    const modelCount = categories.filter(c => c.parentId === brand.id).length;
                    return <CategoryCard key={brand.id} item={brand} label={`${modelCount} รุ่น`} showLogo logoName={brand.name}
                        onClick={() => { setSelectedBrandId(brand.id); setSelectedModelId(""); updateUrl(activeTab, selectedCompanyId || undefined, brand.id); }} />;
                })}
                <AddCard label="เพิ่มยี่ห้อรถ" onClick={() => { setNewCategoryName(""); setAddCategoryParentId(activeTab === "insurance" ? selectedCompanyId : shopRoot?.id); setAddCategoryLabel("เพิ่มยี่ห้อรถใหม่"); setShowAddCategory(true); }} />
            </div>
        </div></>);
    }

    // ──── Model Selection (after brand) ─────────────────────────
    if ((activeTab === "shop" || activeTab === "insurance") && selectedBrandId && !selectedModelId) {
        return (<>{sharedModals}<div className="p-6 lg:p-8">
            <div className="mb-8">
                <button onClick={() => { setSelectedBrandId(""); setSelectedModelId(""); updateUrl(activeTab, selectedCompanyId || undefined); }}
                    className="flex items-center gap-2 text-sm mb-3 cursor-pointer" style={{ color: "var(--t-text-muted)" }}
                    onMouseEnter={e => e.currentTarget.style.color = activeColor} onMouseLeave={e => e.currentTarget.style.color = "var(--t-text-muted)"}>
                    <ChevronLeft className="w-4 h-4" /> กลับไปเลือกยี่ห้อ
                </button>
                <div className="flex items-center gap-3">
                    {selectedBrand && getCarLogoUrl(selectedBrand.name) && <img src={getCarLogoUrl(selectedBrand.name)!} alt={selectedBrand.name} className="w-10 h-10 object-contain" />}
                    <div><h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>{selectedCompany ? `${selectedCompany.name} — ` : ""}{selectedBrand?.name}</h1>
                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกรุ่นรถ</p></div>
                </div>
            </div>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                <input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="ค้นหารุ่นรถ..." className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none" style={inputStyle} /></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {models.filter(m => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase())).map(model => (
                    <CategoryCard key={model.id} item={model} label={`${model._count?.parts || 0} อะไหล่`} showLogo logoName={selectedBrand?.name}
                        onClick={() => { setSelectedModelId(model.id); setPage(1); setSearch(""); updateUrl(activeTab, selectedCompanyId || undefined, selectedBrandId, model.id); }} />
                ))}
                <AddCard label="เพิ่มรุ่น" onClick={() => { setNewCategoryName(""); setAddCategoryParentId(selectedBrandId); setAddCategoryLabel(`เพิ่มรุ่นรถใหม่ — ${selectedBrand?.name}`); setShowAddCategory(true); }} />
            </div>
        </div></>);
    }

    // ──── Parts List View (after model, or consumables tab) ─────
    const showBackButton = activeTab !== "consumables" && selectedModelId;
    return (<>{sharedModals}<div className="p-6 lg:p-8">
        <div className="mb-6">
            {showBackButton && (
                <button onClick={() => { setSelectedModelId(""); setParts([]); updateUrl(activeTab, selectedCompanyId || undefined, selectedBrandId); }}
                    className="flex items-center gap-2 text-sm mb-3 cursor-pointer" style={{ color: "var(--t-text-muted)" }}
                    onMouseEnter={e => e.currentTarget.style.color = activeColor} onMouseLeave={e => e.currentTarget.style.color = "var(--t-text-muted)"}>
                    <ChevronLeft className="w-4 h-4" /> กลับไปเลือกรุ่น {selectedBrand?.name}
                </button>
            )}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
                        คลังอะไหล่{selectedCompany ? ` — ${selectedCompany.name}` : ""}{selectedBrand ? ` ${selectedBrand.name}` : ""}{selectedModel ? ` ${selectedModel.name}` : ""}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>คลิกอะไหล่เพื่อดูบาร์โค้ด หรือสแกนเพื่อค้นหา</p>
                </div>
                {selectedModelId && <button onClick={() => { setCreateForm({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5 }); setCreateError(""); setShowCreatePart(true); }}
                    className="flex items-center gap-2 text-white font-semibold rounded-lg px-4 py-2 text-sm cursor-pointer" style={{ background: activeColor }}><Plus className="w-4 h-4" /> สร้างอะไหล่</button>}
            </div>
        </div>

        {tabHeader}

        {/* Search with scanner */}
        <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">{scannerMode ? <ScanBarcode className="w-4 h-4 animate-pulse" style={{ color: activeColor }} /> : <Search className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />}</div>
                <input ref={searchRef} value={pendingSearch} onChange={e => setPendingSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { setSearch(pendingSearch); setPage(1); fetchParts(1, pendingSearch); } else { handleSearchKeyDown(e); } }}
                    placeholder="ค้นหาหรือสแกนบาร์โค้ด..." className="w-full rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1" style={{ ...inputStyle, "--tw-ring-color": `${activeColor}30` } as any} />
                {scannerMode && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${activeColor}15`, color: activeColor }}>SCAN</span>}
            </div>
        </div>

        <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{pagination.total}</span> รายการ</p>

        {/* Parts Grid */}
        {parts.length === 0 ? (
            <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                <p style={{ color: "var(--t-text-muted)" }}>ไม่พบอะไหล่</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {parts.map(p => {
                    const isLow = p.quantity <= p.minStock;
                    return (
                        <div key={p.id} className="group relative text-left rounded-xl p-4 transition-all cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}80`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; }}
                            onClick={() => setSelectedPart(p)}>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={e => { e.stopPropagation(); setEditingPart(p); setEditPartForm({ code: p.code, name: p.name, description: p.description || "", brand: p.brand || "" }); setEditPartError(""); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }}><Pencil className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} /></button>
                                <button onClick={e => { e.stopPropagation(); setDeletePartMsg(""); setDeletePartCanForce(false); setConfirmDeletePart(p); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }}><Trash2 className="w-3 h-3 text-red-400" /></button>
                            </div>
                            <div className="flex items-start justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${activeColor}15` }}><Barcode className="w-4 h-4" style={{ color: activeColor }} /></div>
                                {isLow && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium">ใกล้หมด</span>}
                            </div>
                            <p className="font-medium text-sm mb-0.5 truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
                            <p className="font-mono text-xs mb-1" style={{ color: "var(--t-text-muted)" }}>{p.code}</p>
                            {p.brand && <p className="text-xs mb-1" style={{ color: "var(--t-text-dim)" }}>{p.brand}</p>}
                            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                                <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>{getCategoryLabel(p)}</span>
                                <span className="text-xs font-medium" style={{ color: isLow ? "#EF4444" : "var(--t-text-secondary)" }}>{p.quantity} {p.unit}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPageChange={p => { setPage(p); fetchParts(p, search); }} />
    </div></>);
}

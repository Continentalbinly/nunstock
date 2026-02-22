"use client";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getParts, getCategories, createMovement, createPart, createCategory, deleteCategory, updateCategory } from "@/lib/api";
import { getCarLogoUrl } from "@/lib/carLogos";
import { Package, Search, Filter, TrendingDown, CheckCircle2, ScanBarcode, ArrowDownToLine, ArrowUpFromLine, Minus, Plus, X, AlertCircle, ChevronLeft, Car, Building2, PackagePlus, Trash2, Pencil } from "lucide-react";
import { Pagination } from "@/components/Pagination";

export default function InsurancePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [parts, setParts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [lowStockOnly, setLowStockOnly] = useState(false);
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

    // Scanner
    const lastKeyTime = useRef(0);
    const [scannerMode, setScannerMode] = useState(false);
    const keyBuffer = useRef("");

    // Create modals
    const [showAddCompany, setShowAddCompany] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState("");
    const [showAddBrand, setShowAddBrand] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");
    const [showAddModel, setShowAddModel] = useState(false);
    const [newModelName, setNewModelName] = useState("");
    const [brandSearch, setBrandSearch] = useState("");
    const [modelSearch, setModelSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5 });
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");

    // Get the "รถประกัน" root category, its company children, and brand children
    const insuranceRoot = allCategories.find(c => c.name === "รถประกัน" && !c.parentId);
    const companies = allCategories.filter(c => c.parentId === insuranceRoot?.id);
    const brands = selectedCompany ? allCategories.filter(c => c.parentId === selectedCompany.id) : [];
    const models = selectedBrand ? allCategories.filter((c: any) => c.parentId === selectedBrand.id) : [];

    useEffect(() => {
        getCategories()
            .then(c => setAllCategories(c))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Sync state with URL on back/forward navigation
    useEffect(() => {
        if (allCategories.length === 0) return;
        const companyParam = searchParams.get("company");
        const brandParam = searchParams.get("brand");
        const modelParam = searchParams.get("model");

        if (companyParam) {
            const comp = companies.find((c: any) => c.id === companyParam);
            if (comp && comp.id !== selectedCompany?.id) {
                setSelectedCompany(comp);
            }
            if (brandParam && comp) {
                const compBrands = allCategories.filter((c: any) => c.parentId === comp.id);
                const br = compBrands.find((b: any) => b.id === brandParam);
                if (br && br.id !== selectedBrand?.id) {
                    setSelectedBrand(br);
                }
                if (modelParam && br) {
                    const brandModels = allCategories.filter((c: any) => c.parentId === br.id);
                    const foundModel = brandModels.find((m: any) => m.id === modelParam);
                    if (foundModel && foundModel.id !== selectedModel?.id) {
                        setSelectedModel(foundModel);
                        setPage(1);
                    }
                } else if (!modelParam && selectedModel) {
                    setSelectedModel(null);
                    setParts([]);
                }
            } else if (!brandParam && selectedBrand) {
                setSelectedBrand(null);
                setSelectedModel(null);
                setParts([]);
            }
        } else {
            if (selectedCompany) {
                setSelectedCompany(null);
                setSelectedBrand(null);
                setSelectedModel(null);
                setParts([]);
            }
        }
    }, [searchParams, allCategories]);

    const fetchParts = async () => {
        if (!selectedModel) return;
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), pageSize: "20", categoryId: selectedModel.id };
            if (search) params.search = search;
            if (lowStockOnly) params.lowStock = "true";
            const result = await getParts(params);
            setParts(result.data);
            setPagination(result.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedModel) fetchParts();
    }, [selectedModel, page, search, lowStockOnly]);

    const handleFilterChange = (setter: (v: any) => void, value: any) => {
        setPage(1);
        setter(value);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const now = Date.now();
        const timeDiff = now - lastKeyTime.current;
        if (timeDiff < 50 && e.key.length === 1) { setScannerMode(true); keyBuffer.current += e.key; }
        else if (e.key.length === 1) { keyBuffer.current = e.key; setScannerMode(false); }
        lastKeyTime.current = now;
    };

    useEffect(() => {
        if (scannerMode && search.length >= 3) {
            const timer = setTimeout(() => setScannerMode(false), 500);
            return () => clearTimeout(timer);
        }
    }, [search, scannerMode]);

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

    if (loading && !selectedCompany)
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#3b82f6" }} />
                    <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );

    const isIn = actionType === "IN";
    const accentColor = isIn ? "#22C55E" : "#F97316";

    // ─── Shared Modals (rendered in all views) ────────────────
    const sharedModals = (
        <>
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setConfirmDelete(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div>
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>ยืนยันการลบ</h3>
                        </div>
                        <p className="text-sm mb-1" style={{ color: "var(--t-text-secondary)" }}>คุณต้องการลบ <strong>{confirmDelete.name}</strong> ใช่ไหม?</p>
                        <p className="text-xs mb-5" style={{ color: "var(--t-text-muted)" }}>⚠️ {(() => { const children = allCategories.filter((c: any) => c.parentId === confirmDelete.id); const hasGrandchildren = children.some((child: any) => allCategories.some((c: any) => c.parentId === child.id)); if (hasGrandchildren) return "ยี่ห้อรถ รุ่น และอะไหล่ทั้งหมดที่อยู่ภายในจะถูกลบด้วย"; if (children.length > 0) return "รุ่นย่อยและอะไหล่ทั้งหมดที่อยู่ภายในจะถูกลบด้วย"; return "อะไหล่ทั้งหมดที่อยู่ภายในจะถูกลบด้วย"; })()}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { try { await deleteCategory(confirmDelete.id); setConfirmDelete(null); const c = await getCategories(); setAllCategories(c); if (selectedCompany?.id === confirmDelete.id) { setSelectedCompany(null); setSelectedBrand(null); setSelectedModel(null); setParts([]); router.push("/insurance"); } else if (selectedBrand?.id === confirmDelete.id) { setSelectedBrand(null); setSelectedModel(null); setParts([]); router.push(`/insurance?company=${selectedCompany?.id}`); } else if (selectedModel?.id === confirmDelete.id) { setSelectedModel(null); setParts([]); router.push(`/insurance?company=${selectedCompany?.id}&brand=${selectedBrand?.id}`); } } catch (err: any) { toast.error(err.message); setConfirmDelete(null); } }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setEditingCategory(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>แก้ไขชื่อ</h3>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && editName.trim()) { try { await updateCategory(editingCategory.id, { name: editName.trim() }); setEditingCategory(null); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                        <div className="flex gap-3">
                            <button onClick={() => setEditingCategory(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!editName.trim()) return; try { await updateCategory(editingCategory.id, { name: editName.trim() }); setEditingCategory(null); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // ─── Step 1: Select Insurance Company ───────────────────
    if (!selectedCompany) {
        return (
            <>{sharedModals}
                <div className="p-6 lg:p-8">
                    <div className="mb-8">
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>อะไหล่ประกัน</h1>
                        <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกบริษัทประกันเพื่อดูอะไหล่</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {companies.map((company) => {
                            const brandCount = allCategories.filter(c => c.parentId === company.id).length;
                            return (
                                <div key={company.id} className="group relative rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(59,130,246,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }} onClick={() => { setSelectedCompany(company); router.push(`/insurance?company=${company.id}`); }}>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingCategory(company); setEditName(company.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไขชื่อ"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(company); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                    </div>
                                    <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                                        <Building2 className="w-7 h-7" style={{ color: "#3b82f6" }} />
                                    </div>
                                    <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{company.name}</p>
                                    <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{brandCount} ยี่ห้อรถ</p>
                                </div>
                            );
                        })}
                        {/* Add Company Card */}
                        <button
                            onClick={() => { setNewCompanyName(""); setShowAddCompany(true); }}
                            className="rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center border-2 border-dashed"
                            style={{ borderColor: "var(--t-border-subtle)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f680"; e.currentTarget.style.background = "rgba(59,130,246,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.08)" }}>
                                <Plus className="w-7 h-7" style={{ color: "#3b82f6" }} />
                            </div>
                            <p className="font-bold text-sm" style={{ color: "#3b82f6" }}>เพิ่มบริษัทประกัน</p>
                        </button>
                    </div>

                    {companies.length === 0 && (
                        <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                            <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีบริษัทประกัน</p>
                        </div>
                    )}

                    {/* Add Company Modal */}
                    {showAddCompany && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddCompany(false)}>
                            <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มบริษัทประกันใหม่</h3>
                                <input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newCompanyName.trim()) { try { await createCategory({ name: newCompanyName.trim(), parentId: insuranceRoot?.id }); setShowAddCompany(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} placeholder="ชื่อบริษัทประกัน" className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddCompany(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={async () => { if (!newCompanyName.trim()) return; try { await createCategory({ name: newCompanyName.trim(), parentId: insuranceRoot?.id }); setShowAddCompany(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">เพิ่ม</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ─── Step 2: Brand Selection (after company) ─────────────
    if (selectedCompany && !selectedBrand) {
        return (
            <>{sharedModals}
                <div className="p-6 lg:p-8">
                    <div className="mb-8">
                        <button
                            onClick={() => { setSelectedCompany(null); setSelectedBrand(null); setSelectedModel(null); router.push("/insurance"); }}
                            className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2"
                            style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f660"; e.currentTarget.style.color = "#3b82f6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.1)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.color = "var(--t-text-secondary)"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                        >
                            <ChevronLeft className="w-4 h-4" /> กลับไปเลือกบริษัทประกัน
                        </button>
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
                            {selectedCompany.name}
                        </h1>
                        <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกยี่ห้อรถเพื่อดูอะไหล่</p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                        <input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="ค้นหายี่ห้อรถ..." className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {brands.filter((b: any) => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())).map((brand: any) => {
                            const modelCount = allCategories.filter((c: any) => c.parentId === brand.id).length;
                            return (
                                <div key={brand.id} className="group relative rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(59,130,246,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }} onClick={() => { setSelectedBrand(brand); setSelectedModel(null); setParts([]); setSearch(""); setLowStockOnly(false); setModelSearch(""); router.push(`/insurance?company=${selectedCompany.id}&brand=${brand.id}`); }}>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingCategory(brand); setEditName(brand.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไขชื่อ"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(brand); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                    </div>
                                    <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                                        {getCarLogoUrl(brand.name) ? (
                                            <img src={getCarLogoUrl(brand.name)!} alt={brand.name} className="w-10 h-10 object-contain" loading="lazy" />
                                        ) : (
                                            <Car className="w-7 h-7" style={{ color: "#3b82f6" }} />
                                        )}
                                    </div>
                                    <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{brand.name}</p>
                                    <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{modelCount} รุ่น</p>
                                </div>
                            );
                        })}
                        {/* Add Brand Card */}
                        <button
                            onClick={() => { setNewBrandName(""); setShowAddBrand(true); }}
                            className="rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center border-2 border-dashed"
                            style={{ borderColor: "var(--t-border-subtle)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f680"; e.currentTarget.style.background = "rgba(59,130,246,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.08)" }}>
                                <Plus className="w-7 h-7" style={{ color: "#3b82f6" }} />
                            </div>
                            <p className="font-bold text-sm" style={{ color: "#3b82f6" }}>เพิ่มยี่ห้อรถ</p>
                        </button>
                    </div>

                    {/* Add Brand Modal */}
                    {showAddBrand && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddBrand(false)}>
                            <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มยี่ห้อรถใน {selectedCompany.name}</h3>
                                <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newBrandName.trim()) { try { await createCategory({ name: newBrandName.trim(), parentId: selectedCompany.id }); setShowAddBrand(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} placeholder="ชื่อยี่ห้อรถ (เช่น Nissan)" className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddBrand(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={async () => { if (!newBrandName.trim()) return; try { await createCategory({ name: newBrandName.trim(), parentId: selectedCompany.id }); setShowAddBrand(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">เพิ่ม</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ─── Step 3: Model Selection (after brand) ───────────────
    if (selectedCompany && selectedBrand && !selectedModel) {
        return (
            <>{sharedModals}
                <div className="p-6 lg:p-8">
                    <div className="mb-8">
                        <button
                            onClick={() => { setSelectedBrand(null); setSelectedModel(null); setParts([]); router.push(`/insurance?company=${selectedCompany.id}`); }}
                            className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2"
                            style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f660"; e.currentTarget.style.color = "#3b82f6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.1)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.color = "var(--t-text-secondary)"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                        >
                            <ChevronLeft className="w-4 h-4" /> กลับไปเลือกยี่ห้อ
                        </button>
                        <div className="flex items-center gap-3">
                            {getCarLogoUrl(selectedBrand.name) && (
                                <img src={getCarLogoUrl(selectedBrand.name)!} alt={selectedBrand.name} className="w-10 h-10 object-contain" />
                            )}
                            <div>
                                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>{selectedCompany.name} — {selectedBrand.name}</h1>
                                <p className="mt-0.5 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกรุ่นรถเพื่อดูอะไหล่</p>
                            </div>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                        <input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="ค้นหารุ่นรถ..." className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {models.filter((m: any) => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase())).map((model: any) => (
                            <div key={model.id} className="group relative rounded-2xl p-5 transition-all duration-200 text-center cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(59,130,246,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }} onClick={() => { setSelectedModel(model); setPage(1); setSearch(""); setLowStockOnly(false); router.push(`/insurance?company=${selectedCompany.id}&brand=${selectedBrand.id}&model=${model.id}`); }}>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingCategory(model); setEditName(model.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไขชื่อ"><Pencil className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(model); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3 h-3 text-red-400" /></button>
                                </div>
                                <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.06)" }}>
                                    {getCarLogoUrl(selectedBrand.name) ? (
                                        <img src={getCarLogoUrl(selectedBrand.name)!} alt={selectedBrand.name} className="w-7 h-7 object-contain opacity-60" loading="lazy" />
                                    ) : (
                                        <Car className="w-5 h-5" style={{ color: "#3b82f6" }} />
                                    )}
                                </div>
                                <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>{model.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{model._count?.parts || 0} อะไหล่</p>
                            </div>
                        ))}
                        {/* Add Model Card */}
                        <button
                            onClick={() => { setNewModelName(""); setShowAddModel(true); }}
                            className="rounded-2xl p-5 transition-all duration-200 cursor-pointer text-center border-2 border-dashed"
                            style={{ borderColor: "var(--t-border-subtle)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f680"; e.currentTarget.style.background = "rgba(59,130,246,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.08)" }}>
                                <Plus className="w-5 h-5" style={{ color: "#3b82f6" }} />
                            </div>
                            <p className="font-bold text-xs" style={{ color: "#3b82f6" }}>เพิ่มรุ่น</p>
                        </button>
                    </div>

                    {models.length === 0 && (
                        <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <Car className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                            <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีรุ่นรถ</p>
                        </div>
                    )}

                    {/* Add Model Modal */}
                    {showAddModel && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddModel(false)}>
                            <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มรุ่นรถใหม่ — {selectedBrand.name}</h3>
                                <input value={newModelName} onChange={(e) => setNewModelName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newModelName.trim()) { try { await createCategory({ name: newModelName.trim(), parentId: selectedBrand.id }); setShowAddModel(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} placeholder="ชื่อรุ่นรถ (เช่น Hilux Revo, Civic)" className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddModel(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={async () => { if (!newModelName.trim()) return; try { await createCategory({ name: newModelName.trim(), parentId: selectedBrand.id }); setShowAddModel(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">เพิ่ม</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ─── Step 4: Parts List (after model) ────────────────────
    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <button
                    onClick={() => { setSelectedModel(null); setParts([]); router.push(`/insurance?company=${selectedCompany.id}&brand=${selectedBrand.id}`); }}
                    className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2"
                    style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f660"; e.currentTarget.style.color = "#3b82f6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.color = "var(--t-text-secondary)"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                >
                    <ChevronLeft className="w-4 h-4" /> กลับไปเลือกรุ่น {selectedBrand.name}
                </button>
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
                    {selectedCompany.name} — {selectedBrand.name} {selectedModel?.name}
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ค้นหา, เพิ่ม, เบิกอะไหล่</p>
                <button onClick={() => { setCreateForm({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5 }); setCreateError(""); setShowCreate(true); }} className="mt-3 flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"><Plus className="w-4 h-4" /> สร้างอะไหล่ใหม่</button>
            </div>

            {/* Search */}
            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {scannerMode ? <ScanBarcode className="w-4 h-4 text-blue-500 animate-pulse" /> : <Search className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />}
                        </div>
                        <input type="text" placeholder="ค้นหาอะไหล่... (ชื่อ, รหัส, ยี่ห้อ)" value={search} onChange={(e) => handleFilterChange(setSearch, e.target.value)} onKeyDown={handleSearchKeyDown} className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>
                    <button onClick={() => handleFilterChange(setLowStockOnly, !lowStockOnly)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${lowStockOnly ? "bg-amber-500/15 text-amber-500 border border-amber-500/30" : ""}`} style={lowStockOnly ? {} : { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-secondary)" }}>
                        <Filter className="w-4 h-4" /> {lowStockOnly ? "ของใกล้หมด" : "ทั้งหมด"}
                    </button>
                </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{pagination.total}</span> รายการ</p>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {parts.length === 0 ? (
                    <div className="text-center py-16"><Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }}>ไม่พบอะไหล่</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                {["รหัส", "ชื่ออะไหล่", "ยี่ห้อ", "จำนวน", "สถานะ", "จัดการ"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {parts.map((p) => {
                                    const isLow = p.quantity <= p.minStock;
                                    return (
                                        <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--t-hover-overlay)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--t-text-secondary)" }}>{p.code}</td>
                                            <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.name}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{p.brand || "-"}</td>
                                            <td className={`px-4 py-3 text-sm font-bold ${isLow ? "text-red-500" : ""}`} style={isLow ? {} : { color: "var(--t-text)" }}>{p.quantity} <span className="font-normal text-xs" style={{ color: "var(--t-text-muted)" }}>{p.unit}</span></td>
                                            <td className="px-4 py-3">
                                                {isLow ? <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium"><TrendingDown className="w-3 h-3" /> ใกล้หมด</span> : <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium"><CheckCircle2 className="w-3 h-3" /> ปกติ</span>}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => openModal(p, "IN")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm"><ArrowDownToLine className="w-3.5 h-3.5" /> เพิ่ม</button>
                                                    <button onClick={() => openModal(p, "OUT")} disabled={p.quantity === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer bg-orange-500 hover:bg-orange-400 text-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUpFromLine className="w-3.5 h-3.5" /> เบิก</button>
                                                </div>
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

            {/* Action Modal */}
            {selectedPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => !submitting && !success && closeModal()}>
                    <div className="rounded-2xl w-[90%] max-w-md shadow-2xl overflow-hidden" style={{ background: "var(--t-modal-bg)", border: `1px solid var(--t-modal-border)`, animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
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
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>สต็อกปัจจุบัน:</span>
                                        <span className={`text-sm font-bold ${selectedPart.quantity <= selectedPart.minStock ? "text-red-500" : "text-emerald-500"}`}>{selectedPart.quantity} {selectedPart.unit}</span>
                                    </div>
                                </div>
                                {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-500">{error}</p></div>}
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>{isIn ? "จำนวนที่เพิ่ม" : "จำนวนที่เบิก"}</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}><Minus className="w-5 h-5" /></button>
                                        <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="flex-1 rounded-xl text-center text-3xl font-bold py-2 focus:outline-none" style={{ background: "var(--t-input-bg)", border: `2px solid ${accentColor}40`, color: "var(--t-text)" }} min={1} />
                                        <button type="button" onClick={() => setQty(actionType === "OUT" ? Math.min(qty + 1, selectedPart.quantity) : qty + 1)} disabled={actionType === "OUT" && qty >= selectedPart.quantity} className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}><Plus className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--t-text)" }}>เหตุผล <span className="font-normal text-xs" style={{ color: "var(--t-text-dim)" }}>(ถ้ามี)</span></label>
                                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder={isIn ? "เช่น ประกันจัดส่งให้" : "เช่น ใช้ในงานเคลม"} />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={closeModal} className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={handleSubmit} disabled={submitting || (actionType === "OUT" && qty > selectedPart.quantity)} className="flex-1 flex items-center justify-center gap-2 text-white font-bold rounded-xl py-3 text-sm transition-all cursor-pointer disabled:opacity-40 shadow-lg" style={{ background: accentColor, boxShadow: `0 8px 16px ${accentColor}30` }}>
                                        {isIn ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                                        {submitting ? "กำลัง..." : isIn ? "เพิ่มสต็อก" : "เบิกอะไหล่"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Part Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowCreate(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}><PackagePlus className="w-5 h-5" style={{ color: "#3b82f6" }} /></div>
                                <div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>สร้างอะไหล่ใหม่</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedCompany.name} — {selectedBrand.name}</p></div>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        {createError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{createError}</div>}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัส *</label><input value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="IN-TYT-003" /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ยี่ห้ออะไหล่</label><input value={createForm.brand} onChange={(e) => setCreateForm({ ...createForm, brand: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="OEM, Stanley" /></div>
                            </div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ *</label><input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} rows={2} /></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>จำนวน</label><input type="number" value={createForm.quantity} onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} min={0} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ขั้นต่ำ</label><input type="number" value={createForm.minStock} onChange={(e) => setCreateForm({ ...createForm, minStock: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} min={0} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หน่วย</label><input value={createForm.unit} onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!createForm.code || !createForm.name) { setCreateError("กรุณากรอกรหัสและชื่อ"); return; } setCreateSaving(true); setCreateError(""); try { await createPart({ ...createForm, quantity: Number(createForm.quantity), minStock: Number(createForm.minStock), categoryId: selectedModel.id }); setShowCreate(false); fetchParts(); } catch (err: any) { setCreateError(err.message || "เกิดข้อผิดพลาด"); } finally { setCreateSaving(false); } }} disabled={createSaving} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50">{createSaving ? "กำลังบันทึก..." : "สร้างอะไหล่"}</button>
                        </div>
                    </div>
                </div>
            )}

            {sharedModals}
        </div>
    );
}

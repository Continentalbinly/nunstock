"use client";
import { toast } from "sonner";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getParts, getCategories, createPart, updatePart, deletePart, deletePartForce, createCategory, deleteCategory, updateCategory, getCarTypes, createCarType, updateCarType, deleteCarType } from "@/lib/api";
import { getCarLogoUrl } from "@/lib/carLogos";
import { Package, Search, Plus, X, AlertCircle, ChevronLeft, Car, Building2, PackagePlus, Trash2, Pencil, ChevronRight, Barcode, Globe } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import BarcodeModal from "@/components/BarcodeModal";

interface CarTypeItem {
    id?: string;
    key: string;
    label: string;
    brands: string[];
    order?: number;
}

function getCarTypeFromList(brandName: string, types: CarTypeItem[]): string {
    for (const ct of types) {
        if (ct.brands.some(b => b.toLowerCase() === brandName.toLowerCase())) return ct.key;
    }
    return "other";
}

export default function InsurancePage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
                    <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        }>
            <InsurancePageInner />
        </Suspense>
    );
}

function InsurancePageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [selectedCarType, setSelectedCarType] = useState<string | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [parts, setParts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });



    // Create modals--
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

    // === Car type CRUD state ===
    const [carTypes, setCarTypes] = useState<CarTypeItem[]>([]);
    const [showAddCarType, setShowAddCarType] = useState(false);
    const [newCarTypeLabel, setNewCarTypeLabel] = useState("");
    const [newCarTypeBrands, setNewCarTypeBrands] = useState("");
    const [editingCarType, setEditingCarType] = useState<any>(null);
    const [editCarTypeLabel, setEditCarTypeLabel] = useState("");
    const [editCarTypeBrands, setEditCarTypeBrands] = useState("");
    const [confirmDeleteCarType, setConfirmDeleteCarType] = useState<any>(null);

    const getCarType = (brandName: string) => getCarTypeFromList(brandName, carTypes);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5 });
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState("");

    // Edit/Delete Part
    const [editingPart, setEditingPart] = useState<any>(null);
    const [editPartForm, setEditPartForm] = useState({ code: "", name: "", description: "", brand: "" });
    const [editPartSaving, setEditPartSaving] = useState(false);
    const [editPartError, setEditPartError] = useState("");
    const [confirmDeletePart, setConfirmDeletePart] = useState<any>(null);
    const [deletePartMsg, setDeletePartMsg] = useState("");
    const [deletePartCanForce, setDeletePartCanForce] = useState(false);
    const [barcodePart, setBarcodePart] = useState<any>(null);

    // Get the "รถประกัน" root category, its company children, and brand children
    const insuranceRoot = allCategories.find(c => c.name === "รถประกัน" && !c.parentId);
    const companies = allCategories.filter(c => c.parentId === insuranceRoot?.id);
    const brands = selectedCompany ? allCategories.filter(c => c.parentId === selectedCompany.id) : [];
    const models = selectedBrand ? allCategories.filter((c: any) => c.parentId === selectedBrand.id) : [];

    useEffect(() => {
        (async () => {
            try {
                const [c, ct] = await Promise.all([getCategories(), getCarTypes()]);
                // Auto-create "รถประกัน" root if it doesn't exist
                let cats = c;
                const hasRoot = c.some((cat: any) => cat.name === "รถประกัน" && !cat.parentId);
                if (!hasRoot) {
                    await createCategory({ name: "รถประกัน", icon: "shield", color: "#3b82f6" });
                    cats = await getCategories();
                }
                setAllCategories(cats);
                setCarTypes(ct);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Sync state with URL on back/forward navigation
    useEffect(() => {
        if (allCategories.length === 0) return;
        const companyParam = searchParams.get("company");
        const carTypeParam = searchParams.get("carType");
        const brandParam = searchParams.get("brand");
        const modelParam = searchParams.get("model");

        if (companyParam) {
            const comp = companies.find((c: any) => c.id === companyParam);
            if (comp && comp.id !== selectedCompany?.id) {
                setSelectedCompany(comp);
            }
            if (carTypeParam) {
                if (carTypeParam === 'legacy') {
                    if (selectedCarType !== 'legacy') setSelectedCarType('legacy');
                } else {
                    const foundCarType = allCategories.find((c: any) => c.id === carTypeParam && c.parentId === companyParam);
                    if (foundCarType && foundCarType.id !== selectedCarType) {
                        setSelectedCarType(foundCarType.id);
                    }
                }
            } else if (selectedCarType) {
                setSelectedCarType(null);
                setSelectedBrand(null);
                setSelectedModel(null);
                setParts([]);
            }
            if (brandParam && comp) {
                // Brand could be child of CarType (new) or Company (old)
                const br = allCategories.find((b: any) => b.id === brandParam && (b.parentId === carTypeParam || (carTypeParam === 'legacy' && b.parentId === comp.id)));
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
                setSelectedCarType(null);
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




    if (loading && !selectedCompany)
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
                    <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );



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
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && editName.trim()) { try { await updateCategory(editingCategory.id, { name: editName.trim() }); setEditingCategory(null); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                        <div className="flex gap-3">
                            <button onClick={() => setEditingCategory(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!editName.trim()) return; try { await updateCategory(editingCategory.id, { name: editName.trim() }); setEditingCategory(null); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // Helpers for identifying types vs brands
    // A direct child of a company is a "car type" unless it looks like a car brand
    // (has a car logo) AND has no sub-categories of its own (meaning it's a leaf-level brand)
    const isCarType = (cat: any) => {
        const children = allCategories.filter((child: any) => child.parentId === cat.id);
        // If it has children, it's definitely a car type (it contains brands or models underneath)
        if (children.length > 0) return true;
        // If it's a known car brand (has a logo) and has no children, it's a legacy brand
        if (getCarLogoUrl(cat.name)) return false;
        // Otherwise it's an empty car type group (e.g. "ญี่ปุ่น" with no brands yet)
        return true;
    };

    // ─── Step 1: Select Insurance Company ───────────────────
    if (!selectedCompany) {
        return (
            <>{sharedModals}
                <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
                    <div className="mb-8">
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>อะไหล่ประกัน</h1>
                        <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกบริษัทประกันเพื่อดูอะไหล่</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {companies.map((company) => {
                            const brandCount = allCategories.filter(c => c.parentId === company.id).length;
                            return (
                                <div key={company.id} className="group relative rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(249,115,22,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }} onClick={() => { setSelectedCompany(company); router.push(`/insurance?company=${company.id}`); }}>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingCategory(company); setEditName(company.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไขชื่อ"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(company); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                    </div>
                                    <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                                        <Building2 className="w-7 h-7" style={{ color: "#F97316" }} />
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
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.background = "rgba(249,115,22,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.08)" }}>
                                <Plus className="w-7 h-7" style={{ color: "#F97316" }} />
                            </div>
                            <p className="font-bold text-sm" style={{ color: "#F97316" }}>เพิ่มบริษัทประกัน</p>
                        </button>
                    </div>



                    {/* Add Company Modal */}
                    {showAddCompany && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddCompany(false)}>
                            <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มบริษัทประกันใหม่</h3>
                                <input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newCompanyName.trim()) { try { await createCategory({ name: newCompanyName.trim(), parentId: insuranceRoot?.id }); setShowAddCompany(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} placeholder="ชื่อบริษัทประกัน" className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddCompany(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={async () => { if (!newCompanyName.trim()) return; try { await createCategory({ name: newCompanyName.trim(), parentId: insuranceRoot?.id }); setShowAddCompany(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">เพิ่ม</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ─── Step 2: Car Type Selection (after company) ─────────────
    if (selectedCompany && !selectedCarType) {
        const rawChildren = allCategories.filter(c => c.parentId === selectedCompany.id);
        const companyCarTypes = rawChildren.filter(c => isCarType(c));
        const legacyBrands = rawChildren.filter(c => !isCarType(c));

        return (
            <>{sharedModals}
                <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
                    <div className="mb-8">
                        <button
                            onClick={() => { setSelectedCompany(null); setSelectedCarType(null); setSelectedBrand(null); setSelectedModel(null); router.push("/insurance"); }}
                            className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2"
                            style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731660"; e.currentTarget.style.color = "#F97316"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(249,115,22,0.1)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.color = "var(--t-text-secondary)"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                        >
                            <ChevronLeft className="w-4 h-4" /> กลับไปเลือกบริษัทประกัน
                        </button>
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
                            {selectedCompany.name}
                        </h1>
                        <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกประเภทรถ</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {companyCarTypes.map((ct) => (
                            <div key={ct.id} className="group relative rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer"
                                style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(249,115,22,0.12)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                                onClick={() => { setSelectedCarType(ct.id); router.push(`/insurance?company=${selectedCompany.id}&carType=${ct.id}`); }}
                            >
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingCategory(ct); setEditName(ct.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไขชื่อ"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(ct); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                </div>
                                <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                                    <Globe className="w-7 h-7" style={{ color: "#F97316" }} />
                                </div>
                                <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{ct.name}</p>
                                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{allCategories.filter(c => c.parentId === ct.id).length} ยี่ห้อ</p>
                            </div>
                        ))}

                        {legacyBrands.length > 0 && (
                            <div className="group relative rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer"
                                style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(249,115,22,0.12)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                                onClick={() => { setSelectedCarType('legacy'); router.push(`/insurance?company=${selectedCompany.id}&carType=legacy`); }}
                            >
                                <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                                    <Car className="w-7 h-7" style={{ color: "#F97316" }} />
                                </div>
                                <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>ยี่ห้ออื่นๆ (ข้อมูลเดิม)</p>
                                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{legacyBrands.length} ยี่ห้อ</p>
                            </div>
                        )}

                        {/* Add Car Type Card */}
                        <button
                            onClick={() => { setNewCarTypeLabel(""); setShowAddCarType(true); }}
                            className="rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center border-2 border-dashed"
                            style={{ borderColor: "var(--t-border-subtle)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.background = "rgba(249,115,22,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.08)" }}>
                                <Plus className="w-7 h-7" style={{ color: "#F97316" }} />
                            </div>
                            <p className="font-bold text-sm" style={{ color: "#F97316" }}>เพิ่มประเภทรถ</p>
                        </button>
                    </div>

                    {/* Add Car Type Modal */}
                    {showAddCarType && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddCarType(false)}>
                            <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มประเภทรถใหม่</h3>
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>ชื่อประเภท</label>
                                        <input value={newCarTypeLabel} onChange={(e) => setNewCarTypeLabel(e.target.value)} placeholder="เช่น รถญี่ปุ่น" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} onKeyDown={async (e) => { if (e.key === "Enter" && newCarTypeLabel.trim()) { try { await createCategory({ name: newCarTypeLabel.trim(), parentId: selectedCompany.id }); setShowAddCarType(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} autoFocus />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddCarType(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={async () => { if (!newCarTypeLabel.trim()) return; try { await createCategory({ name: newCarTypeLabel.trim(), parentId: selectedCompany.id }); setShowAddCarType(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">เพิ่ม</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ─── Step 3: Brand Selection (after car type) ─────────────
    const currentCarType = selectedCarType === 'legacy' ? { id: 'legacy', name: "ยี่ห้อรถอื่นๆ (ข้อมูลเดิม)" } : allCategories.find(c => c.id === selectedCarType);
    const filteredBrands = selectedCarType === 'legacy'
        ? allCategories.filter(b => b.parentId === selectedCompany.id && !isCarType(b))
        : allCategories.filter(b => b.parentId === selectedCarType);

    if (selectedCompany && selectedCarType && !selectedBrand) {
        return (
            <>
                {sharedModals}
                <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
                    <div className="mb-8">
                        <button
                            onClick={() => { setSelectedCarType(null); setSelectedBrand(null); setSelectedModel(null); router.push(`/insurance?company=${selectedCompany.id}`); }}
                            className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2"
                            style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731660"; e.currentTarget.style.color = "#F97316"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(249,115,22,0.1)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.color = "var(--t-text-secondary)"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                        >
                            <ChevronLeft className="w-4 h-4" /> กลับไปเลือกประเภทรถ
                        </button>
                        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                            {selectedCompany.name} — <Globe className="w-5 h-5" style={{ color: "#F97316" }} /> {currentCarType?.name}
                        </h1>
                        <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกยี่ห้อรถเพื่อดูอะไหล่</p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                        <input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="ค้นหายี่ห้อรถ..." className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {filteredBrands.filter((b: any) => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())).map((brand: any) => {
                            const modelCount = allCategories.filter((c: any) => c.parentId === brand.id).length;
                            return (
                                <div key={brand.id} className="group relative rounded-2xl p-6 transition-all duration-200 text-center cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(249,115,22,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }} onClick={() => { setSelectedBrand(brand); setSelectedModel(null); setParts([]); setSearch(""); setLowStockOnly(false); setModelSearch(""); router.push(`/insurance?company=${selectedCompany.id}&carType=${selectedCarType}&brand=${brand.id}`); }}>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingCategory(brand); setEditName(brand.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไขชื่อ"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(brand); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                    </div>
                                    <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                                        {getCarLogoUrl(brand.name) ? (
                                            <img src={getCarLogoUrl(brand.name)!} alt={brand.name} className="w-10 h-10 object-contain" loading="lazy" />
                                        ) : (
                                            <Car className="w-7 h-7" style={{ color: "#F97316" }} />
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
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.background = "rgba(249,115,22,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.08)" }}>
                                <Plus className="w-7 h-7" style={{ color: "#F97316" }} />
                            </div>
                            <p className="font-bold text-sm" style={{ color: "#F97316" }}>เพิ่มยี่ห้อรถ</p>
                        </button>
                    </div>

                    {/* Add Brand Modal */}
                    {showAddBrand && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddBrand(false)}>
                            <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มยี่ห้อรถใน {currentCarType?.name}</h3>
                                <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newBrandName.trim()) { try { await createCategory({ name: newBrandName.trim(), parentId: selectedCarType === 'legacy' ? selectedCompany.id : selectedCarType }); setShowAddBrand(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} placeholder="ชื่อยี่ห้อรถ (เช่น Nissan)" className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddBrand(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={async () => { if (!newBrandName.trim()) return; try { await createCategory({ name: newBrandName.trim(), parentId: selectedCarType === 'legacy' ? selectedCompany.id : selectedCarType }); setShowAddBrand(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">เพิ่ม</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ─── Step 4: Model Selection (after brand) ───────────────
    if (selectedCompany && selectedCarType && selectedBrand && !selectedModel) {
        return (
            <>{sharedModals}
                <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
                    <div className="mb-8">
                        <button
                            onClick={() => { setSelectedBrand(null); setSelectedModel(null); setParts([]); router.push(`/insurance?company=${selectedCompany.id}&carType=${selectedCarType}`); }}
                            className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2"
                            style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731660"; e.currentTarget.style.color = "#F97316"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(249,115,22,0.1)"; }}
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
                        <input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="ค้นหารุ่นรถ..." className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {models.filter((m: any) => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase())).map((model: any) => (
                            <div key={model.id} className="group relative rounded-2xl p-5 transition-all duration-200 text-center cursor-pointer" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(249,115,22,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }} onClick={() => { setSelectedModel(model); setPage(1); setSearch(""); setLowStockOnly(false); router.push(`/insurance?company=${selectedCompany.id}&carType=${selectedCarType}&brand=${selectedBrand.id}&model=${model.id}`); }}>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingCategory(model); setEditName(model.name); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="แก้ไขชื่อ"><Pencil className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(model); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "var(--t-input-bg)" }} title="ลบ"><Trash2 className="w-3 h-3 text-red-400" /></button>
                                </div>
                                <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.06)" }}>
                                    {getCarLogoUrl(selectedBrand.name) ? (
                                        <img src={getCarLogoUrl(selectedBrand.name)!} alt={selectedBrand.name} className="w-7 h-7 object-contain opacity-60" loading="lazy" />
                                    ) : (
                                        <Car className="w-5 h-5" style={{ color: "#F97316" }} />
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
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731680"; e.currentTarget.style.background = "rgba(249,115,22,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(249,115,22,0.08)" }}>
                                <Plus className="w-5 h-5" style={{ color: "#F97316" }} />
                            </div>
                            <p className="font-bold text-xs" style={{ color: "#F97316" }}>เพิ่มรุ่น</p>
                        </button>
                    </div>



                    {/* Add Model Modal */}
                    {showAddModel && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddModel(false)}>
                            <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มรุ่นรถใหม่ — {selectedBrand.name}</h3>
                                <input value={newModelName} onChange={(e) => setNewModelName(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newModelName.trim()) { try { await createCategory({ name: newModelName.trim(), parentId: selectedBrand.id }); setShowAddModel(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } } }} placeholder="ชื่อรุ่นรถ (เช่น Hilux Revo, Civic)" className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} autoFocus />
                                <div className="flex gap-3">
                                    <button onClick={() => setShowAddModel(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                    <button onClick={async () => { if (!newModelName.trim()) return; try { await createCategory({ name: newModelName.trim(), parentId: selectedBrand.id }); setShowAddModel(false); const c = await getCategories(); setAllCategories(c); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">เพิ่ม</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ─── Step 5: Parts + Claims (after model) ─────────────────
    const inputStyle = { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" };
    const inputCls = "w-full rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500/30";

    return (
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="mb-6">
                <button
                    onClick={() => { setSelectedModel(null); setParts([]); router.push(`/insurance?company=${selectedCompany.id}&carType=${selectedCarType}&brand=${selectedBrand.id}`); }}
                    className="inline-flex items-center gap-2 text-sm font-medium mb-4 transition-all duration-200 cursor-pointer rounded-xl px-4 py-2"
                    style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F9731660"; e.currentTarget.style.color = "#F97316"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.color = "var(--t-text-secondary)"; }}
                >
                    <ChevronLeft className="w-4 h-4" /> กลับไปเลือกรุ่น {selectedBrand.name}
                </button>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>{selectedCompany.name} — {selectedBrand.name} {selectedModel?.name}</h1>
                        <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>รายการอะไหล่ประกัน</p>
                    </div>
                    <button onClick={() => { setCreateForm({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5 }); setCreateError(""); setShowCreate(true); }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"><Plus className="w-4 h-4" /> สร้างอะไหล่</button>
                </div>
            </div>

            {/* Parts List */}
            <div className="rounded-xl p-4 mb-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                    <input type="text" placeholder="ค้นหาอะไหล่..." value={search} onChange={(e) => handleFilterChange(setSearch, e.target.value)} className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={inputStyle} />
                </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {parts.length === 0 ? (
                    <div className="text-center py-16"><Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }}>ไม่พบอะไหล่</p></div>
                ) : (
                    <div className="overflow-x-auto"><table className="w-full">
                        <thead><tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>รหัส</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>ชื่ออะไหล่</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left hidden sm:table-cell" style={{ color: "var(--t-text-muted)" }}>คุณภาพ</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left hidden sm:table-cell" style={{ color: "var(--t-text-muted)" }}>รายละเอียด</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>จัดการ</th>
                        </tr></thead>
                        <tbody>{parts.map((p) => {
                            return (<tr key={p.id} className="transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--t-hover-overlay)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} onClick={() => setBarcodePart(p)}>
                                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--t-text-secondary)" }}>{p.code}</td>
                                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--t-text)" }}>
                                    {p.name}
                                    <div className="sm:hidden mt-0.5 space-y-0.5">
                                        {p.brand && <p className="text-[10px]" style={{ color: "var(--t-text-secondary)" }}>({p.brand})</p>}
                                        {p.description && <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{p.description}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: "var(--t-text-secondary)" }}>{p.brand || "-"}</td>
                                <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: "var(--t-text-muted)" }}>{p.description || "-"}</td>
                                <td className="px-4 py-2"><div className="flex items-center gap-1.5">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingPart(p); setEditPartForm({ code: p.code, name: p.name, description: p.description || "", brand: p.brand || "" }); setEditPartError(""); }} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(249,115,22,0.1)", color: "#F97316" }} title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeletePartMsg(""); setDeletePartCanForce(false); setConfirmDeletePart(p); }} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }} title="ลบ"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div></td>
                            </tr>);
                        })}</tbody>
                    </table></div>
                )}
                <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPageChange={setPage} />
            </div>

            {/* Create Part Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowCreate(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}><PackagePlus className="w-5 h-5" style={{ color: "#F97316" }} /></div><div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>สร้างอะไหล่ใหม่</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedCompany.name} — {selectedBrand.name}</p></div></div>
                            <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        {createError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{createError}</div>}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3"><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัส *</label><input value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} className={inputCls} style={inputStyle} placeholder="IN-TYT-003" /></div><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>คุณภาพ</label><input value={createForm.brand} onChange={(e) => setCreateForm({ ...createForm, brand: e.target.value })} className={inputCls} style={inputStyle} /></div></div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ *</label><input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className={inputCls} style={inputStyle} rows={2} /></div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!createForm.code || !createForm.name) { setCreateError("กรุณากรอกรหัสและชื่อ"); return; } setCreateSaving(true); setCreateError(""); try { await createPart({ ...createForm, quantity: 0, minStock: 0, type: "INSURANCE", categoryId: selectedModel.id }); setShowCreate(false); fetchParts(); } catch (err: any) { setCreateError(err.message || "เกิดข้อผิดพลาด"); } finally { setCreateSaving(false); } }} disabled={createSaving} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50">{createSaving ? "กำลังบันทึก..." : "สร้างอะไหล่"}</button>
                        </div>
                    </div>
                </div>
            )}

            {sharedModals}

            {/* Edit Part Modal */}
            {editingPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setEditingPart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}><Pencil className="w-5 h-5" style={{ color: "#F97316" }} /></div><div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>แก้ไขอะไหล่</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{editingPart.name}</p></div></div><button onClick={() => setEditingPart(null)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button></div>
                        {editPartError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{editPartError}</div>}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3"><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัส *</label><input value={editPartForm.code} onChange={(e) => setEditPartForm({ ...editPartForm, code: e.target.value })} className={inputCls} style={inputStyle} /></div><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>คุณภาพ</label><input value={editPartForm.brand} onChange={(e) => setEditPartForm({ ...editPartForm, brand: e.target.value })} className={inputCls} style={inputStyle} /></div></div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ *</label><input value={editPartForm.name} onChange={(e) => setEditPartForm({ ...editPartForm, name: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={editPartForm.description} onChange={(e) => setEditPartForm({ ...editPartForm, description: e.target.value })} className={inputCls} style={inputStyle} rows={2} /></div>
                        </div>
                        <div className="flex gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setEditingPart(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!editPartForm.code || !editPartForm.name) { setEditPartError("กรุณากรอกรหัสและชื่อ"); return; } setEditPartSaving(true); setEditPartError(""); try { await updatePart(editingPart.id, editPartForm); setEditingPart(null); toast.success("แก้ไขเรียบร้อย"); fetchParts(); } catch (err: any) { setEditPartError(err.message || "เกิดข้อผิดพลาด"); } finally { setEditPartSaving(false); } }} disabled={editPartSaving} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50">{editPartSaving ? "กำลังบันทึก..." : "บันทึก"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Part Modal */}
            {confirmDeletePart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setConfirmDeletePart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>ลบอะไหล่</h3></div>
                        <p className="text-sm mb-1" style={{ color: "var(--t-text-secondary)" }}>คุณต้องการลบ <strong>{confirmDeletePart.name}</strong> ใช่ไหม?</p>
                        {deletePartMsg && <div className={`text-xs mt-2 mb-3 p-2 rounded-lg ${deletePartCanForce ? "bg-amber-500/10 border border-amber-500/20 text-amber-600" : "bg-red-500/10 border border-red-500/20 text-red-500"}`}>{deletePartMsg}</div>}
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setConfirmDeletePart(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            {deletePartCanForce && <button onClick={async () => { try { await deletePartForce(confirmDeletePart.id); setConfirmDeletePart(null); toast.success("ลบเรียบร้อย"); fetchParts(); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบพร้อมประวัติ</button>}
                            <button onClick={async () => { const r = await deletePart(confirmDeletePart.id); if (r.success) { setConfirmDeletePart(null); toast.success("ลบเรียบร้อย"); fetchParts(); } else { setDeletePartMsg(r.error || "ลบไม่ได้"); setDeletePartCanForce(r.canForce || false); } }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
            <BarcodeModal part={barcodePart} onClose={() => setBarcodePart(null)} />
        </div>
    );
}


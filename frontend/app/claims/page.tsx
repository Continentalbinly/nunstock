"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getCategories, getPartsAll, getClaims, createClaim, updateClaimStatus, deleteClaim } from "@/lib/api";
import { getCarLogoUrl } from "@/lib/carLogos";
import { ShieldCheck, Search, Plus, X, ChevronLeft, ChevronRight, Car, Building2, Trash2, Package } from "lucide-react";
import { Pagination } from "@/components/Pagination";

const statusList = ["PENDING", "ORDERED", "ARRIVED", "NOTIFIED", "COMPLETED"] as const;
const statusLabel: Record<string, string> = { PENDING: "รอดำเนินการ", ORDERED: "สั่งแล้ว", ARRIVED: "มาถึง", NOTIFIED: "แจ้งแล้ว", COMPLETED: "เสร็จสิ้น" };
const statusColor: Record<string, string> = { PENDING: "#f59e0b", ORDERED: "#F97316", ARRIVED: "#22c55e", NOTIFIED: "#a855f7", COMPLETED: "#10b981" };

const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30";
const inputStyle: React.CSSProperties = { background: "var(--t-input-bg)", color: "var(--t-input-text)", border: "1px solid var(--t-input-border)" };

type Step = "list" | "company" | "brand" | "model" | "form";

export default function ClaimsPage() {
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Claims list
    const [claims, setClaims] = useState<any[]>([]);
    const [claimsLoading, setClaimsLoading] = useState(true);
    const [claimSearch, setClaimSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [claimPage, setClaimPage] = useState(1);
    const [claimPagination, setClaimPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

    // Step-by-step flow
    const [step, setStep] = useState<Step>("list");
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [partsList, setPartsList] = useState<any[]>([]);
    const [brandSearch, setBrandSearch] = useState("");
    const [modelSearch, setModelSearch] = useState("");

    // Claim form
    const [claimForm, setClaimForm] = useState({
        claimNo: "", customerName: "", customerPhone: "",
        carBrand: "", carModel: "", plateNo: "",
        insuranceComp: "", jobNo: "", notes: "",
        items: [] as { partId: string; partName: string; quantity: number; checked: boolean }[]
    });
    const [claimSaving, setClaimSaving] = useState(false);
    const [claimError, setClaimError] = useState("");

    const insuranceRoot = allCategories.find(c => c.name === "รถประกัน" && !c.parentId);
    const companies = allCategories.filter(c => c.parentId === insuranceRoot?.id);
    const brands = selectedCompany ? allCategories.filter(c => c.parentId === selectedCompany.id) : [];
    const models = selectedBrand ? allCategories.filter(c => c.parentId === selectedBrand.id) : [];

    // Fetch categories
    useEffect(() => {
        getCategories().then(c => setAllCategories(c)).catch(console.error).finally(() => setLoading(false));
    }, []);

    // Fetch claims
    const fetchClaims = async () => {
        setClaimsLoading(true);
        try {
            const params: Record<string, string> = { page: String(claimPage), pageSize: "20" };
            if (claimSearch) params.search = claimSearch;
            if (statusFilter !== "ALL") params.status = statusFilter;
            const result = await getClaims(params);
            setClaims(result.data);
            setClaimPagination(result.pagination);
        } catch { }
        finally { setClaimsLoading(false); }
    };

    useEffect(() => { fetchClaims(); }, [claimPage, claimSearch, statusFilter]);

    // Fetch parts when model is selected
    useEffect(() => {
        if (selectedModel) {
            getPartsAll({ categoryId: selectedModel.id }).then(p => {
                setPartsList(p);
                setClaimForm(f => ({
                    ...f,
                    carBrand: selectedBrand?.name || "",
                    carModel: selectedModel?.name || "",
                    insuranceComp: selectedCompany?.name || "",
                    items: p.map((part: any) => ({ partId: part.id, partName: part.name, quantity: 1, checked: false }))
                }));
            });
        }
    }, [selectedModel]);

    const handleCreateClaim = async () => {
        setClaimSaving(true); setClaimError("");
        try {
            const items = claimForm.items.filter(i => i.checked).map(i => ({
                partName: i.partName,
                quantity: Number(i.quantity),
                ...(i.partId ? { partId: i.partId } : {})
            }));
            if (items.length === 0) { setClaimError("กรุณาเลือกอะไหล่อย่างน้อย 1 รายการ"); setClaimSaving(false); return; }
            if (!claimForm.claimNo || !claimForm.customerName || !claimForm.customerPhone || !claimForm.plateNo) { setClaimError("กรุณากรอกข้อมูลที่จำเป็น"); setClaimSaving(false); return; }
            await createClaim({ ...claimForm, items });
            toast.success("สร้างเคลมสำเร็จ!");
            setStep("list"); setSelectedCompany(null); setSelectedBrand(null); setSelectedModel(null);
            setClaimForm({ claimNo: "", customerName: "", customerPhone: "", carBrand: "", carModel: "", plateNo: "", insuranceComp: "", jobNo: "", notes: "", items: [] });
            fetchClaims();
        } catch (err: any) { setClaimError(err.message || "ไม่สามารถสร้างเคลมได้"); }
        finally { setClaimSaving(false); }
    };

    const handleStatusChange = async (id: string, s: string) => { try { await updateClaimStatus(id, s); toast.success("อัพเดตสถานะสำเร็จ"); fetchClaims(); } catch (err: any) { toast.error(err.message); } };
    const handleDeleteClaim = async (id: string) => { if (!confirm("ยืนยันลบเคลม?")) return; try { await deleteClaim(id); fetchClaims(); } catch (err: any) { toast.error(err.message); } };
    const getNextStatus = (c: string) => { const idx = statusList.indexOf(c as any); return idx < statusList.length - 1 ? statusList[idx + 1] : null; };

    const filteredBrands = brands.filter((b: any) => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase()));
    const filteredModels = models.filter((m: any) => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()));

    // Loading
    if (loading) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22c55e" }} />
                <p style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p>
            </div>
        </div>
    );

    // Step indicator
    const steps = [
        { key: "company", label: "ประกัน", value: selectedCompany?.name },
        { key: "brand", label: "ยี่ห้อ", value: selectedBrand?.name },
        { key: "model", label: "รุ่น", value: selectedModel?.name },
        { key: "form", label: "กรอกข้อมูล" },
    ];
    const currentStepIdx = step === "company" ? 0 : step === "brand" ? 1 : step === "model" ? 2 : step === "form" ? 3 : -1;

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                        <ShieldCheck className="w-5 h-5" style={{ color: "#22c55e" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>เคลมประกัน</h1>
                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>จัดการเคลมอะไหล่ประกัน</p>
                    </div>
                </div>
                {step === "list" && (
                    <button onClick={() => setStep("company")} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer">
                        <Plus className="w-4 h-4" /> สร้างเคลมใหม่
                    </button>
                )}
            </div>

            {/* === CLAIMS LIST === */}
            {step === "list" && (
                <div>
                    {/* Search + Filter */}
                    <div className="rounded-xl p-4 mb-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                                <input type="text" placeholder="ค้นหาเคลม..." value={claimSearch} onChange={(e) => { setClaimSearch(e.target.value); setClaimPage(1); }} className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30" style={inputStyle} />
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                {["ALL", ...statusList].map(s => (
                                    <button key={s} onClick={() => { setStatusFilter(s); setClaimPage(1); }} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors" style={statusFilter === s ? { background: s === "ALL" ? "rgba(249,115,22,0.12)" : `${statusColor[s]}15`, color: s === "ALL" ? "#F97316" : statusColor[s], border: `1px solid ${s === "ALL" ? "rgba(249,115,22,0.2)" : `${statusColor[s]}25`}` } : { background: "var(--t-badge-bg)", color: "var(--t-text-muted)", border: "1px solid transparent" }}>
                                        {s === "ALL" ? "ทั้งหมด" : statusLabel[s]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Claims list */}
                    {claimsLoading ? (
                        <div className="text-center py-16"><div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#22c55e" }} /><p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p></div>
                    ) : claims.length === 0 ? (
                        <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                            <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีเคลม</p>
                            <button onClick={() => setStep("company")} className="mt-4 text-sm text-emerald-500 hover:text-emerald-400 cursor-pointer font-medium">+ สร้างเคลมใหม่</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {claims.map((c) => {
                                const next = getNextStatus(c.status);
                                return (
                                    <div key={c.id} className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-sm" style={{ color: "var(--t-text-secondary)" }}>{c.claimNo}</span>
                                                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${statusColor[c.status]}15`, color: statusColor[c.status] }}>{statusLabel[c.status]}</span>
                                                </div>
                                                <p className="font-medium" style={{ color: "var(--t-text)" }}>{c.customerName}</p>
                                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>{c.customerPhone} • {c.carBrand} {c.carModel} • {c.plateNo}</p>
                                                <p className="text-xs mt-1" style={{ color: "var(--t-text-dim)" }}>ประกัน: {c.insuranceComp} {c.jobNo ? `• งาน: ${c.jobNo}` : ""}</p>
                                                {c.items?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{c.items.map((item: any) => <span key={item.id} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--t-badge-bg)", color: "var(--t-badge-text)" }}>{item.partName} ×{item.quantity}</span>)}</div>}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {next && <button onClick={() => handleStatusChange(c.id, next)} className="flex items-center gap-1 rounded-lg text-xs py-1.5 px-3 cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>{statusLabel[next]} <ChevronRight className="w-3 h-3" /></button>}
                                                <button onClick={() => handleDeleteClaim(c.id)} className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <Pagination page={claimPagination.page} totalPages={claimPagination.totalPages} total={claimPagination.total} pageSize={claimPagination.pageSize} onPageChange={setClaimPage} />
                        </div>
                    )}
                </div>
            )}

            {/* === STEP-BY-STEP CREATE === */}
            {step !== "list" && (
                <div>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                        <button onClick={() => { setStep("list"); setSelectedCompany(null); setSelectedBrand(null); setSelectedModel(null); }} className="text-sm font-medium cursor-pointer shrink-0 px-3 py-1.5 rounded-lg transition-colors" style={{ color: "var(--t-text-muted)", background: "var(--t-badge-bg)" }}>
                            ← กลับ
                        </button>
                        {steps.map((s, i) => (
                            <div key={s.key} className="flex items-center gap-2 shrink-0">
                                <div className="w-1 h-1 rounded-full" style={{ background: "var(--t-border)" }} />
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={i === currentStepIdx ? { background: "rgba(34,197,94,0.12)", color: "#22c55e" } : i < currentStepIdx ? { background: "rgba(34,197,94,0.06)", color: "#22c55e99" } : { color: "var(--t-text-dim)" }}>
                                    {s.value || s.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Step 1: เลือกบริษัทประกัน */}
                    {step === "company" && (
                        <div>
                            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--t-text)" }}>เลือกบริษัทประกัน</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {companies.map((c: any) => (
                                    <button key={c.id} onClick={() => { setSelectedCompany(c); setStep("brand"); setBrandSearch(""); }} className="flex flex-col items-center gap-3 p-5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02]" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.08)" }}>
                                            <Building2 className="w-6 h-6" style={{ color: "#F97316" }} />
                                        </div>
                                        <span className="text-sm font-semibold text-center" style={{ color: "var(--t-text)" }}>{c.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: เลือกยี่ห้อรถ */}
                    {step === "brand" && (
                        <div>
                            <button onClick={() => { setStep("company"); setSelectedCompany(null); }} className="inline-flex items-center gap-2 text-sm font-medium mb-4 cursor-pointer rounded-xl px-4 py-2" style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)" }}>
                                <ChevronLeft className="w-4 h-4" /> กลับเลือกประกัน
                            </button>
                            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--t-text)" }}>เลือกยี่ห้อรถ — {selectedCompany.name}</h2>
                            <div className="rounded-xl p-3 mb-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                                    <input type="text" placeholder="ค้นหายี่ห้อ..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} className="w-full rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none" style={inputStyle} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {filteredBrands.map((b: any) => (
                                    <button key={b.id} onClick={() => { setSelectedBrand(b); setStep("model"); setModelSearch(""); }} className="flex flex-col items-center gap-3 p-5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02]" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                        {getCarLogoUrl(b.name) ? (
                                            <img src={getCarLogoUrl(b.name)!} alt={b.name} className="w-12 h-12 object-contain" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.08)" }}>
                                                <Car className="w-6 h-6" style={{ color: "#22c55e" }} />
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold text-center" style={{ color: "var(--t-text)" }}>{b.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: เลือกรุ่นรถ */}
                    {step === "model" && (
                        <div>
                            <button onClick={() => { setStep("brand"); setSelectedBrand(null); }} className="inline-flex items-center gap-2 text-sm font-medium mb-4 cursor-pointer rounded-xl px-4 py-2" style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)" }}>
                                <ChevronLeft className="w-4 h-4" /> กลับเลือกยี่ห้อ
                            </button>
                            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--t-text)" }}>เลือกรุ่นรถ — {selectedBrand.name}</h2>
                            <div className="rounded-xl p-3 mb-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                                    <input type="text" placeholder="ค้นหารุ่น..." value={modelSearch} onChange={e => setModelSearch(e.target.value)} className="w-full rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none" style={inputStyle} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {filteredModels.map((m: any) => (
                                    <button key={m.id} onClick={() => { setSelectedModel(m); setStep("form"); setClaimError(""); }} className="flex flex-col items-center gap-3 p-5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02]" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.08)" }}>
                                            <Car className="w-6 h-6" style={{ color: "#F97316" }} />
                                        </div>
                                        <span className="text-sm font-semibold text-center" style={{ color: "var(--t-text)" }}>{m.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: กรอกข้อมูล + ผูกอะไหล่ */}
                    {step === "form" && (
                        <div>
                            <button onClick={() => { setStep("model"); setSelectedModel(null); }} className="inline-flex items-center gap-2 text-sm font-medium mb-4 cursor-pointer rounded-xl px-4 py-2" style={{ background: "var(--t-card)", color: "var(--t-text-secondary)", border: "1px solid var(--t-border-subtle)" }}>
                                <ChevronLeft className="w-4 h-4" /> กลับเลือกรุ่น
                            </button>
                            <div className="rounded-xl p-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                                        <ShieldCheck className="w-5 h-5" style={{ color: "#22c55e" }} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold" style={{ color: "var(--t-text)" }}>กรอกข้อมูลเคลม</h3>
                                        <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedCompany?.name} • {selectedBrand?.name} {selectedModel?.name}</p>
                                    </div>
                                </div>

                                {claimError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{claimError}</div>}

                                <div className="space-y-4">
                                    <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เลขเคลม *</label><input value={claimForm.claimNo} onChange={e => setClaimForm({ ...claimForm, claimNo: e.target.value })} className={inputCls} style={inputStyle} placeholder="CLM-001" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่อลูกค้า *</label><input value={claimForm.customerName} onChange={e => setClaimForm({ ...claimForm, customerName: e.target.value })} className={inputCls} style={inputStyle} /></div>
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เบอร์โทร *</label><input value={claimForm.customerPhone} onChange={e => setClaimForm({ ...claimForm, customerPhone: e.target.value })} className={inputCls} style={inputStyle} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ยี่ห้อรถ</label><input value={claimForm.carBrand} readOnly className={`${inputCls} opacity-60`} style={inputStyle} /></div>
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รุ่นรถ</label><input value={claimForm.carModel} readOnly className={`${inputCls} opacity-60`} style={inputStyle} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ทะเบียน *</label><input value={claimForm.plateNo} onChange={e => setClaimForm({ ...claimForm, plateNo: e.target.value })} className={inputCls} style={inputStyle} /></div>
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>บริษัทประกัน</label><input value={claimForm.insuranceComp} readOnly className={`${inputCls} opacity-60`} style={inputStyle} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เลขงาน</label><input value={claimForm.jobNo} onChange={e => setClaimForm({ ...claimForm, jobNo: e.target.value })} className={inputCls} style={inputStyle} /></div>
                                        <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หมายเหตุ</label><input value={claimForm.notes} onChange={e => setClaimForm({ ...claimForm, notes: e.target.value })} className={inputCls} style={inputStyle} /></div>
                                    </div>

                                    {/* Parts selection */}
                                    <div>
                                        <label className="text-sm font-medium mb-2 block" style={{ color: "var(--t-text-secondary)" }}>เลือกอะไหล่ที่ต้องการเคลม *</label>
                                        <div className="space-y-2 rounded-xl p-3" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                            {claimForm.items.length === 0 ? (
                                                <div className="text-center py-6">
                                                    <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} />
                                                    <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ไม่มีอะไหล่ในรุ่นนี้</p>
                                                </div>
                                            ) : claimForm.items.map((item, i) => (
                                                <label key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors" style={{ background: item.checked ? "rgba(34,197,94,0.08)" : "transparent" }}>
                                                    <input type="checkbox" checked={item.checked} onChange={e => { const items = [...claimForm.items]; items[i] = { ...items[i], checked: e.target.checked }; setClaimForm({ ...claimForm, items }); }} className="w-4 h-4 rounded accent-emerald-500" />
                                                    <span className="flex-1 text-sm" style={{ color: "var(--t-text)" }}>{item.partName}</span>
                                                    {item.checked && <input type="number" value={item.quantity} onChange={e => { const items = [...claimForm.items]; items[i] = { ...items[i], quantity: Math.max(1, Number(e.target.value)) }; setClaimForm({ ...claimForm, items }); }} className="w-16 rounded-lg px-2 py-1 text-sm text-center focus:outline-none" style={inputStyle} min={1} />}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                                    <button onClick={() => { setStep("model"); setSelectedModel(null); }} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ย้อนกลับ</button>
                                    <button onClick={handleCreateClaim} disabled={claimSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-50">{claimSaving ? "กำลังบันทึก..." : "สร้างเคลม"}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

"use client";
import { toast } from "sonner";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    createJob, getCategories, getShopStock, getParts, getJobSuggestions,
} from "@/lib/api";
import {
    ShieldCheck, Banknote, Car, ArrowLeft, Plus, X, Search, Package, Wrench, CheckCircle2, Trash2, Minus,
} from "lucide-react";

const inputStyle: React.CSSProperties = { background: "var(--t-input-bg)", color: "var(--t-input-text)", border: "1px solid var(--t-input-border)" };

function AutocompleteInput({ value, onChange, field, placeholder, className, style, required }: {
    value: string; onChange: (v: string) => void; field: string;
    placeholder?: string; className?: string; style?: React.CSSProperties; required?: boolean;
}) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [show, setShow] = useState(false);
    const timer = useRef<any>(null);
    const ref = useRef<HTMLDivElement>(null);

    const fetchSuggestions = useCallback((q: string) => {
        if (timer.current) clearTimeout(timer.current);
        if (q.length < 1) { setSuggestions([]); return; }
        timer.current = setTimeout(async () => {
            try {
                const r = await getJobSuggestions(field, q);
                setSuggestions(r.suggestions || []);
                setShow(true);
            } catch { setSuggestions([]); }
        }, 250);
    }, [field]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <input value={value} onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value); }}
                onFocus={() => { if (suggestions.length > 0) setShow(true); else if (value.length >= 1) fetchSuggestions(value); }}
                className={className} style={style} placeholder={placeholder} required={required} />
            {show && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg max-h-36 overflow-y-auto shadow-xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }}>
                    {suggestions.filter(s => s !== value).map(s => (
                        <button key={s} type="button" onClick={() => { onChange(s); setShow(false); }}
                            className="w-full px-3 py-2 text-sm text-left cursor-pointer transition-colors"
                            style={{ color: "var(--t-text)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >{s}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function NewJobPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Form data
    const [jobType, setJobType] = useState<"INSURANCE" | "CASH" | "">("");
    const [form, setForm] = useState({
        customerName: "", customerPhone: "", carBrand: "", carModel: "", plateNo: "", notes: "",
        claimNo: "", insuranceComp: "",
    });

    // Parts list
    const [parts, setParts] = useState<any[]>([]);
    const [showAddPart, setShowAddPart] = useState(false);
    const [partSource, setPartSource] = useState("SHOP_STOCK");
    const [partSearch, setPartSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [newPart, setNewPart] = useState({ partName: "", quantity: 1, unit: "ชิ้น", note: "", sourceId: "" });

    // Categories for insurance catalog
    const [categories, setCategories] = useState<any[]>([]);
    useEffect(() => { getCategories().then(r => setCategories(r || [])).catch(() => { }); }, []);

    // Insurance cascade selects
    const insuranceRoot = categories.find(c => c.name === "รถประกัน" && !c.parentId);
    const insuranceCompanies = categories.filter(c => c.parentId === insuranceRoot?.id);
    const [selCompanyId, setSelCompanyId] = useState("");
    const [selBrandId, setSelBrandId] = useState("");
    const [selModelId, setSelModelId] = useState("");

    const selCompany = categories.find(c => c.id === selCompanyId);
    const insuranceBrands = categories.filter(c => c.parentId === selCompanyId);
    const insuranceModels = categories.filter(c => c.parentId === selBrandId);

    const handleSelectCompany = (id: string) => {
        setSelCompanyId(id); setSelBrandId(""); setSelModelId("");
        const comp = categories.find(c => c.id === id);
        if (comp) setForm(prev => ({ ...prev, insuranceComp: comp.name, carBrand: "", carModel: "" }));
    };
    const handleSelectBrand = (id: string) => {
        setSelBrandId(id); setSelModelId("");
        const br = categories.find(c => c.id === id);
        if (br) setForm(prev => ({ ...prev, carBrand: br.name, carModel: "" }));
    };
    // Insurance parts (loaded when model selected)
    const [insuranceParts, setInsuranceParts] = useState<any[]>([]);
    const [selectedInsParts, setSelectedInsParts] = useState<Record<string, { qty: number; name: string; unit: string }>>({}); // partId -> qty + info
    const [loadingInsParts, setLoadingInsParts] = useState(false);

    const handleSelectModel = (id: string) => {
        setSelModelId(id);
        const md = categories.find(c => c.id === id);
        if (md) setForm(prev => ({ ...prev, carModel: md.name }));
        // Fetch insurance parts for this model
        if (id) {
            setLoadingInsParts(true);
            getParts({ categoryId: id, pageSize: "100" })
                .then(r => setInsuranceParts(r.data || []))
                .catch(() => setInsuranceParts([]))
                .finally(() => setLoadingInsParts(false));
        } else {
            setInsuranceParts([]);
        }
    };

    const toggleInsPart = (part: any) => {
        setSelectedInsParts(prev => {
            const next = { ...prev };
            if (next[part.id]) { delete next[part.id]; }
            else { next[part.id] = { qty: 1, name: part.name, unit: part.unit || "ชิ้น" }; }
            return next;
        });
    };
    const updateInsPartQty = (partId: string, delta: number) => {
        setSelectedInsParts(prev => {
            const cur = prev[partId];
            if (!cur) return prev;
            const newQty = Math.max(1, cur.qty + delta);
            return { ...prev, [partId]: { ...cur, qty: newQty } };
        });
    };

    // Insurance parts search
    const [insSearch, setInsSearch] = useState("");
    const filteredInsParts = insuranceParts.filter(p => !insSearch || p.name.toLowerCase().includes(insSearch.toLowerCase()));


    const updateForm = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

    const searchForParts = async (q: string) => {
        setPartSearch(q);
        if (q.length < 1) { setSearchResults([]); return; }
        try {
            if (partSource === "SHOP_STOCK") {
                const params: Record<string, string> = { search: q, pageSize: "10" };
                if (form.carBrand) params.carBrand = form.carBrand;
                if (form.carModel) params.carModel = form.carModel;
                const r = await getShopStock(params);
                setSearchResults((r.data || []).map((s: any) => ({ id: s.id, name: s.name, quantity: s.quantity, unit: s.unit, extra: [s.carBrand, s.carModel].filter(Boolean).join(" ") })));
            } else if (partSource === "INSURANCE_PART") {
                const params: Record<string, string> = { search: q, pageSize: "10" };
                // Use the selected category from the cascade select
                if (selModelId) params.categoryId = selModelId;
                else if (selBrandId) params.categoryId = selBrandId;
                const r = await getParts(params);
                setSearchResults((r.data || []).map((p: any) => ({ id: p.id, name: p.name, quantity: p.quantity, unit: p.unit, extra: [p.brand, p.category?.name].filter(Boolean).join(" · ") })));
            } else if (partSource === "CONSUMABLE") {
                const r = await getParts({ search: q, pageSize: "10" });
                setSearchResults((r.data || []).map((p: any) => ({ id: p.id, name: p.name, quantity: p.quantity, unit: p.unit, extra: p.brand || "" })));
            } else {
                setSearchResults([]);
            }
        } catch { setSearchResults([]); }
    };

    const addPart = () => {
        if (!newPart.partName) return;
        setParts(prev => [...prev, { ...newPart, source: partSource, id: Date.now() }]);
        setNewPart({ partName: "", quantity: 1, unit: "ชิ้น", note: "", sourceId: "" });
        setPartSearch("");
        setSearchResults([]);
        setShowAddPart(false);
    };

    const removePart = (idx: number) => setParts(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!jobType) { setError("กรุณาเลือกประเภทงาน"); return; }
        if (!form.customerName || !form.carBrand || !form.carModel || !form.plateNo) {
            setError("กรุณากรอก ชื่อลูกค้า, ยี่ห้อ, รุ่น, ทะเบียน"); return;
        }
        if (jobType === "INSURANCE" && !form.claimNo) { setError("กรุณากรอกเลขเคลม"); return; }

        setSaving(true); setError("");
        try {
            const jobData: any = {
                jobNo: "AUTO", type: jobType, ...form,
                claimNo: form.claimNo || undefined,
                insuranceComp: form.insuranceComp || undefined,
            };
            const result = await createJob(jobData);
            const jobId = result?.id;

            // Add insurance parts
            if (jobId && jobType === "INSURANCE") {
                const { addJobPart } = await import("@/lib/api");
                for (const [sourceId, info] of Object.entries(selectedInsParts)) {
                    await addJobPart(jobId, {
                        source: "INSURANCE_PART", sourceId,
                        partName: info.name, quantity: info.qty, unit: info.unit,
                    });
                }
            }


            // Add other parts (shop stock, external) — for cash jobs
            if (jobId && parts.length > 0) {
                const { addJobPart } = await import("@/lib/api");
                for (const p of parts) {
                    await addJobPart(jobId, {
                        source: p.source, sourceId: p.sourceId || undefined,
                        partName: p.partName, quantity: p.quantity, unit: p.unit, note: p.note || undefined,
                    });
                }
            }

            toast.success("เปิด Job เรียบร้อย!");
            router.push(jobId ? `/jobs/${jobId}` : "/jobs");
        } catch (err: any) { setError(err.message || "ไม่สามารถสร้าง Job ได้"); }
        finally { setSaving(false); }
    };

    const SOURCE_LABELS: Record<string, string> = {
        SHOP_STOCK: "สต็อกอู่", INSURANCE_PART: "อะไหล่ประกัน",
        CONSUMABLE: "วัสดุสิ้นเปลือง", EXTERNAL: "สั่งใหม่ / ภายนอก",
    };

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
                <button onClick={() => router.push("/jobs")} className="flex items-center gap-1 text-sm mb-3 cursor-pointer transition-colors" style={{ color: "var(--t-text-muted)" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#F97316"} onMouseLeave={e => e.currentTarget.style.color = "var(--t-text-muted)"}>
                    <ArrowLeft className="w-4 h-4" /> กลับไปรายการงาน
                </button>
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>เปิด Job ใหม่</h1>
                <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>สร้างงานซ่อม — กรอกข้อมูลให้ครบแล้วกดสร้าง</p>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"><span className="text-sm text-red-500">{error}</span></div>}

            <div className="space-y-6">
                {/* ──── Step 1: ประเภทงาน ──── */}
                <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <h2 className="text-sm font-bold mb-3" style={{ color: "var(--t-text)" }}>1. ประเภทงาน</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { key: "INSURANCE", label: "ประกัน", desc: "งานจากบริษัทประกัน", icon: ShieldCheck, color: "#F97316" },
                            { key: "CASH", label: "หน้าร้าน", desc: "ลูกค้ามาเอง", icon: Banknote, color: "#22C55E" },
                        ] as const).map(t => (
                            <button key={t.key} type="button" onClick={() => setJobType(t.key)}
                                className="rounded-xl p-4 text-left cursor-pointer transition-all"
                                style={{
                                    background: jobType === t.key ? `${t.color}08` : "var(--t-input-bg)",
                                    border: `2px solid ${jobType === t.key ? t.color : "var(--t-input-border)"}`,
                                }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <t.icon className="w-5 h-5" style={{ color: t.color }} />
                                    <span className="font-bold" style={{ color: jobType === t.key ? t.color : "var(--t-text)" }}>{t.label}</span>
                                </div>
                                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{t.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ──── Step 2: ข้อมูลเคลม + เลือกรถจากประกัน (เฉพาะประกัน) ──── */}
                {jobType === "INSURANCE" && (
                    <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: "2px solid #F97316" }}>
                        <h2 className="text-sm font-bold mb-3" style={{ color: "#F97316" }}>2. เลือกข้อมูลประกัน</h2>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>เลขเคลม *</label>
                                <input value={form.claimNo} onChange={e => updateForm("claimNo", e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={inputStyle} placeholder="CLM-001" /></div>
                            <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>บริษัทประกัน *</label>
                                <select value={selCompanyId} onChange={e => handleSelectCompany(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={inputStyle}>
                                    <option value="">-- เลือกบริษัทประกัน --</option>
                                    {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select></div>
                        </div>
                        {selCompanyId && (
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ยี่ห้อรถ *</label>
                                    <select value={selBrandId} onChange={e => handleSelectBrand(e.target.value)}
                                        className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={inputStyle}>
                                        <option value="">-- เลือกยี่ห้อ --</option>
                                        {insuranceBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select></div>
                                {selBrandId && (
                                    <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>รุ่นรถ *</label>
                                        <select value={selModelId} onChange={e => handleSelectModel(e.target.value)}
                                            className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={inputStyle}>
                                            <option value="">-- เลือกรุ่น --</option>
                                            {insuranceModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select></div>
                                )}
                            </div>
                        )}

                        {/* Insurance parts checklist */}
                        {selModelId && (
                            <div className="mt-4">
                                <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
                                    <Package className="w-3.5 h-3.5" style={{ color: "#F97316" }} />
                                    อะไหล่ประกัน — เลือกรายการที่ต้องการเคลม
                                </h3>
                                {/* Search */}
                                <div className="relative mb-2">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--t-text-dim)" }} />
                                    <input value={insSearch} onChange={e => setInsSearch(e.target.value)}
                                        className="w-full rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none" style={inputStyle}
                                        placeholder="ค้นหาอะไหล่..." />
                                </div>
                                {loadingInsParts ? (
                                    <p className="text-xs py-4 text-center" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p>
                                ) : filteredInsParts.length === 0 ? (
                                    <p className="text-xs py-4 text-center rounded-lg" style={{ background: "var(--t-badge-bg)", color: "var(--t-text-muted)" }}>
                                        {insuranceParts.length === 0 ? "ยังไม่มีอะไหล่ในรุ่นนี้" : "ไม่พบอะไหล่ที่ค้นหา"}
                                    </p>
                                ) : (
                                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                        {filteredInsParts.map(p => {
                                            const sel = selectedInsParts[p.id];
                                            return (
                                                <div key={p.id}
                                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all"
                                                    style={{
                                                        background: sel ? "rgba(249,115,22,0.06)" : "var(--t-badge-bg)",
                                                        border: `1.5px solid ${sel ? "#F97316" : "var(--t-border-subtle)"}`,
                                                    }}
                                                    onClick={() => toggleInsPart(p)}
                                                >
                                                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{
                                                        background: sel ? "#F97316" : "transparent",
                                                        border: `2px solid ${sel ? "#F97316" : "var(--t-text-dim)"}`,
                                                    }}>
                                                        {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate" style={{ color: sel ? "#F97316" : "var(--t-text)" }}>{p.name}</p>
                                                    </div>
                                                    {sel && (
                                                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                            <button type="button" onClick={() => updateInsPartQty(p.id, -1)}
                                                                className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                                                <Minus className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                                                            </button>
                                                            <span className="text-sm font-bold w-6 text-center" style={{ color: "#F97316" }}>{sel.qty}</span>
                                                            <button type="button" onClick={() => updateInsPartQty(p.id, 1)}
                                                                className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                                                <Plus className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {Object.keys(selectedInsParts).length > 0 && (
                                    <p className="text-xs font-medium mt-2" style={{ color: "#F97316" }}>
                                        เลือกแล้ว {Object.keys(selectedInsParts).length} รายการ
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ──── Step 3: ข้อมูลลูกค้า + รถ ──── */}
                {jobType && (
                    <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--t-text)" }}>{jobType === "INSURANCE" ? "3" : "2"}. ข้อมูลลูกค้า &amp; รถ</h2>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่อลูกค้า *</label>
                                <AutocompleteInput value={form.customerName} onChange={v => updateForm("customerName", v)} field="customerName" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={inputStyle} /></div>
                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เบอร์โทร</label>
                                <AutocompleteInput value={form.customerPhone} onChange={v => updateForm("customerPhone", v)} field="customerPhone" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} /></div>
                        </div>
                        {jobType !== "INSURANCE" && (
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ยี่ห้อ *</label>
                                    <AutocompleteInput value={form.carBrand} onChange={v => updateForm("carBrand", v)} field="carBrand" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="Toyota" /></div>
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รุ่น *</label>
                                    <AutocompleteInput value={form.carModel} onChange={v => updateForm("carModel", v)} field="carModel" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="Vios" /></div>
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ทะเบียน *</label>
                                    <AutocompleteInput value={form.plateNo} onChange={v => updateForm("plateNo", v)} field="plateNo" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="กข 1234" /></div>
                            </div>
                        )}
                        {jobType === "INSURANCE" && (
                            <div className="grid grid-cols-1 gap-3 mb-3">
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ทะเบียน *</label>
                                    <input value={form.plateNo} onChange={e => updateForm("plateNo", e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="กข 1234" /></div>
                            </div>
                        )}
                        <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หมายเหตุ</label>
                            <textarea value={form.notes} onChange={e => updateForm("notes", e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={inputStyle} rows={2} /></div>
                    </div>
                )}



                {/* ──── Submit ──── */}
                {jobType && (
                    <div className="flex gap-3">
                        <button onClick={() => router.push("/jobs")} className="flex-1 rounded-xl py-3 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                        <button onClick={handleSubmit} disabled={saving} className="flex-1 text-white font-bold rounded-xl py-3 text-sm cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2" style={{ background: "#F97316" }}>
                            <CheckCircle2 className="w-4 h-4" /> {saving ? "กำลังสร้าง..." : "เปิด Job"}
                        </button>
                    </div>
                )}
            </div>

            {/* ──── Add Part Sub-Modal ──── */}
            {showAddPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setShowAddPart(false)}>
                    <div className="rounded-2xl p-5 w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>เพิ่มอะไหล่</h3>
                            <button onClick={() => setShowAddPart(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>แหล่ง</label>
                                <select value={partSource} onChange={e => { setPartSource(e.target.value); setSearchResults([]); setPartSearch(""); setNewPart({ ...newPart, sourceId: "", partName: "" }); }}
                                    className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={inputStyle}>
                                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            {partSource !== "EXTERNAL" ? (
                                <div>
                                    <label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ค้นหาอะไหล่</label>
                                    <input value={partSearch} onChange={e => searchForParts(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="พิมพ์ชื่อ..." />
                                    {searchResults.length > 0 && (
                                        <div className="mt-1 rounded-lg max-h-32 overflow-y-auto" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                            {searchResults.map((r: any) => (
                                                <button key={r.id} onClick={() => { setNewPart({ ...newPart, sourceId: r.id, partName: r.name, unit: r.unit }); setSearchResults([]); setPartSearch(r.name); }}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-xs cursor-pointer text-left" style={{ color: "var(--t-text)" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                    <div>
                                                        <span>{r.name}</span>
                                                        {r.extra && <span className="ml-1.5 text-[10px]" style={{ color: "var(--t-text-dim)" }}>({r.extra})</span>}
                                                    </div>
                                                    <span style={{ color: r.quantity === 0 ? "#EF4444" : "var(--t-text-muted)" }}>{r.quantity} {r.unit}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ (สั่งใหม่)</label>
                                    <input value={newPart.partName} onChange={e => setNewPart({ ...newPart, partName: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="กรอกชื่อ..." /></div>
                            )}
                            {newPart.partName && <div className="text-xs px-2 py-1 rounded" style={{ background: "rgba(249,115,22,0.1)", color: "#F97316" }}>✓ {newPart.partName}</div>}
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>จำนวน</label>
                                    <input type="number" value={newPart.quantity} onChange={e => setNewPart({ ...newPart, quantity: Math.max(1, Number(e.target.value)) })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} min={1} /></div>
                                <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หมายเหตุ</label>
                                    <input value={newPart.note} onChange={e => setNewPart({ ...newPart, note: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} /></div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowAddPart(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={addPart} disabled={!newPart.partName} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-50" style={{ background: "#F97316" }}>เพิ่ม</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

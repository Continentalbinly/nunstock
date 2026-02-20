"use client";
import { useEffect, useState } from "react";
import { getClaims, createClaim, updateClaimStatus, deleteClaim, notifyClaimCustomer, getParts } from "@/lib/api";
import { ShieldCheck, Plus, X, Search, ChevronRight, Bell, Trash2, CheckCircle2 } from "lucide-react";

const statusList = ["PENDING", "ORDERED", "ARRIVED", "NOTIFIED", "COMPLETED"] as const;
const statusLabel: Record<string, string> = { PENDING: "รอดำเนินการ", ORDERED: "สั่งแล้ว", ARRIVED: "มาถึง", NOTIFIED: "แจ้งแล้ว", COMPLETED: "เสร็จสิ้น" };
const statusBadge: Record<string, string> = { PENDING: "bg-amber-500/15 text-amber-500", ORDERED: "bg-blue-500/15 text-blue-500", ARRIVED: "bg-emerald-500/15 text-emerald-500", NOTIFIED: "bg-purple-500/15 text-purple-500", COMPLETED: "bg-emerald-500/10 text-emerald-500" };

const emptyForm = { claimNo: "", customerName: "", customerPhone: "", carBrand: "", carModel: "", plateNo: "", insuranceComp: "", jobNo: "", notes: "", items: [{ partName: "", quantity: 1, partId: "" }] };

export default function ClaimsPage() {
    const [claims, setClaims] = useState<any[]>([]);
    const [parts, setParts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<any>({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");

    const inputStyle = { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" };
    const inputCls = "w-full rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

    const fetchData = async () => { try { const [c, p] = await Promise.all([getClaims(), getParts()]); setClaims(c); setParts(p); } catch (err) { console.error(err); } finally { setLoading(false); } };
    useEffect(() => { fetchData(); }, []);

    const filtered = claims.filter((c) => {
        const matchStatus = !statusFilter || c.status === statusFilter;
        const matchSearch = !search || c.claimNo.toLowerCase().includes(search.toLowerCase()) || c.customerName.toLowerCase().includes(search.toLowerCase()) || c.plateNo.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const handleCreate = async () => { setSaving(true); setError(""); try { const items = form.items.filter((i: any) => i.partName.trim()).map((i: any) => ({ partName: i.partName, quantity: Number(i.quantity), ...(i.partId ? { partId: i.partId } : {}) })); if (items.length === 0) { setError("กรุณาเพิ่มอะไหล่อย่างน้อย 1 รายการ"); setSaving(false); return; } await createClaim({ ...form, items }); setShowModal(false); setForm({ ...emptyForm }); fetchData(); } catch (err: any) { setError(err.message || "ไม่สามารถสร้างเคลมได้"); } finally { setSaving(false); } };
    const handleStatusChange = async (id: string, s: string) => { try { await updateClaimStatus(id, s); fetchData(); } catch (err: any) { alert(err.message); } };
    const handleNotify = async (id: string) => { try { await notifyClaimCustomer(id); setMsg("ส่งแจ้งเตือนสำเร็จ!"); fetchData(); setTimeout(() => setMsg(""), 3000); } catch (err: any) { alert(err.message); } };
    const handleDelete = async (id: string) => { if (!confirm("ยืนยันลบ?")) return; try { await deleteClaim(id); fetchData(); } catch (err: any) { alert(err.message); } };
    const addItem = () => setForm({ ...form, items: [...form.items, { partName: "", quantity: 1, partId: "" }] });
    const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_: any, idx: number) => idx !== i) });
    const updateItem = (i: number, f: string, v: any) => { const items = [...form.items]; items[i] = { ...items[i], [f]: v }; setForm({ ...form, items }); };
    const getNextStatus = (c: string) => { const idx = statusList.indexOf(c as any); return idx < statusList.length - 1 ? statusList[idx + 1] : null; };

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-center"><div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p></div></div>;

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>เคลมประกัน</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>จัดการการเคลมประกันและติดตามสถานะอะไหล่</p>
            </div>

            {msg && <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{msg}</div>}

            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} /><input type="text" placeholder="ค้นหาเคลม..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-10!`} style={inputStyle} /></div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer min-w-[140px]" style={inputStyle}><option value="">ทุกสถานะ</option>{statusList.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
                    <button onClick={() => { setForm({ ...emptyForm }); setError(""); setShowModal(true); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"><Plus className="w-4 h-4" /> สร้างเคลม</button>
                </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{filtered.length}</span> รายการ</p>

            {filtered.length === 0 ? (
                <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}><ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }}>ไม่พบรายการเคลม</p></div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((c) => {
                        const next = getNextStatus(c.status);
                        return (
                            <div key={c.id} className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-sm" style={{ color: "var(--t-text-secondary)" }}>{c.claimNo}</span>
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                                        </div>
                                        <p className="font-medium" style={{ color: "var(--t-text)" }}>{c.customerName}</p>
                                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>{c.customerPhone} • {c.carBrand} {c.carModel} • {c.plateNo}</p>
                                        <p className="text-xs mt-1" style={{ color: "var(--t-text-dim)" }}>ประกัน: {c.insuranceComp} {c.jobNo ? `• งาน: ${c.jobNo}` : ""}</p>
                                        {c.items?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{c.items.map((item: any) => <span key={item.id} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--t-badge-bg)", color: "var(--t-badge-text)" }}>{item.partName} ×{item.quantity}</span>)}</div>}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {(c.status === "ARRIVED" || c.status === "ORDERED") && <button onClick={() => handleNotify(c.id)} className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-secondary)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.1)"; e.currentTarget.style.color = "#A855F7"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-secondary)"; }} title="แจ้งเตือน"><Bell className="w-4 h-4" /></button>}
                                        {next && <button onClick={() => handleStatusChange(c.id, next)} className="flex items-center gap-1 rounded-lg text-xs py-1.5 px-3 transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>{statusLabel[next]} <ChevronRight className="w-3 h-3" /></button>}
                                        <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-muted)"; }}><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowModal(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: `1px solid var(--t-modal-border)`, animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold" style={{ color: "var(--t-text)" }}>สร้างเคลมใหม่</h3><button onClick={() => setShowModal(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button></div>
                        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เลขเคลม *</label><input value={form.claimNo} onChange={(e) => setForm({ ...form, claimNo: e.target.value })} className={inputCls} style={inputStyle} placeholder="CLM-001" /></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่อลูกค้า *</label><input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={inputCls} style={inputStyle} /></div><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เบอร์โทร *</label><input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className={inputCls} style={inputStyle} /></div></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ยี่ห้อรถ *</label><input value={form.carBrand} onChange={(e) => setForm({ ...form, carBrand: e.target.value })} className={inputCls} style={inputStyle} /></div><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รุ่นรถ *</label><input value={form.carModel} onChange={(e) => setForm({ ...form, carModel: e.target.value })} className={inputCls} style={inputStyle} /></div></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ทะเบียน *</label><input value={form.plateNo} onChange={(e) => setForm({ ...form, plateNo: e.target.value })} className={inputCls} style={inputStyle} /></div><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>บริษัทประกัน *</label><input value={form.insuranceComp} onChange={(e) => setForm({ ...form, insuranceComp: e.target.value })} className={inputCls} style={inputStyle} /></div></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>เลขงาน</label><input value={form.jobNo} onChange={(e) => setForm({ ...form, jobNo: e.target.value })} className={inputCls} style={inputStyle} /></div><div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หมายเหตุ</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} style={inputStyle} /></div></div>
                            <div>
                                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium" style={{ color: "var(--t-text-secondary)" }}>อะไหล่ที่เคลม *</label><button onClick={addItem} className="text-xs text-emerald-500 hover:text-emerald-400 cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> เพิ่ม</button></div>
                                <div className="space-y-2">{form.items.map((item: any, i: number) => (<div key={i} className="flex items-center gap-2"><input value={item.partName} onChange={(e) => updateItem(i, "partName", e.target.value)} className={`${inputCls} flex-1`} style={inputStyle} placeholder="ชื่ออะไหล่" /><input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className={`${inputCls} w-20!`} style={inputStyle} min={1} />{form.items.length > 1 && <button onClick={() => removeItem(i)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-4 h-4" /></button>}</div>))}</div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleCreate} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-50">{saving ? "กำลังบันทึก..." : "สร้างเคลม"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

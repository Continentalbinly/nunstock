"use client";
import { useEffect, useState } from "react";
import { getParts, getCategories, createPart, updatePart, deletePart, createCategory, deleteCategory } from "@/lib/api";
import { PackagePlus, Layers, Plus, Pencil, Trash2, X, Search } from "lucide-react";

export default function PartsPage() {
    const [tab, setTab] = useState<"parts" | "categories">("parts");
    const [parts, setParts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingPart, setEditingPart] = useState<any>(null);
    const [newCatName, setNewCatName] = useState("");
    const [form, setForm] = useState({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5, categoryId: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const inputStyle = { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" };
    const inputCls = "w-full rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

    const fetchData = async () => { try { const [p, c] = await Promise.all([getParts(), getCategories()]); setParts(p); setCategories(c); } catch (err) { console.error(err); } finally { setLoading(false); } };
    useEffect(() => { fetchData(); }, []);

    const filtered = parts.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

    const openAddModal = () => { setEditingPart(null); setForm({ code: "", name: "", description: "", brand: "", unit: "ชิ้น", quantity: 0, minStock: 5, categoryId: categories[0]?.id || "" }); setError(""); setShowModal(true); };
    const openEditModal = (part: any) => { setEditingPart(part); setForm({ code: part.code, name: part.name, description: part.description || "", brand: part.brand || "", unit: part.unit, quantity: part.quantity, minStock: part.minStock, categoryId: part.categoryId }); setError(""); setShowModal(true); };
    const handleSavePart = async () => { setSaving(true); setError(""); try { const payload = { ...form, quantity: Number(form.quantity), minStock: Number(form.minStock) }; if (editingPart) await updatePart(editingPart.id, payload); else await createPart(payload); setShowModal(false); fetchData(); } catch (err: any) { setError(err.message || "เกิดข้อผิดพลาด"); } finally { setSaving(false); } };
    const handleDeletePart = async (id: string) => { if (!confirm("ยืนยันลบอะไหล่นี้?")) return; try { await deletePart(id); fetchData(); } catch (err: any) { alert(err.message); } };
    const handleAddCategory = async () => { if (!newCatName.trim()) return; try { await createCategory({ name: newCatName.trim() }); setNewCatName(""); fetchData(); } catch (err: any) { alert(err.message); } };
    const handleDeleteCategory = async (id: string) => { if (!confirm("ยืนยันลบ?")) return; try { await deleteCategory(id); fetchData(); } catch (err: any) { alert(err.message); } };

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-center"><div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p></div></div>;

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>จัดการอะไหล่</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>เพิ่ม แก้ไข และจัดการอะไหล่และประเภท</p>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <button onClick={() => setTab("parts")} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === "parts" ? "bg-emerald-500 text-white" : ""}`} style={tab === "parts" ? {} : { color: "var(--t-text-secondary)" }}><PackagePlus className="w-4 h-4" /> อะไหล่</button>
                    <button onClick={() => setTab("categories")} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === "categories" ? "bg-emerald-500 text-white" : ""}`} style={tab === "categories" ? {} : { color: "var(--t-text-secondary)" }}><Layers className="w-4 h-4" /> ประเภท</button>
                </div>
                {tab === "parts" && <button onClick={openAddModal} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"><Plus className="w-4 h-4" /> สร้างอะไหล่ใหม่</button>}
            </div>

            {tab === "parts" && (
                <>
                    <div className="rounded-xl p-3 mb-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} /><input type="text" placeholder="ค้นหาอะไหล่..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-10!`} style={inputStyle} /></div>
                    </div>
                    <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        {filtered.length === 0 ? <div className="text-center py-16"><PackagePlus className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }}>ไม่พบอะไหล่</p></div> : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>{["รหัส", "ชื่อ", "ยี่ห้อ", "ประเภท", "จำนวน", "หน่วย", "จัดการ"].map((h, i) => <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${i === 6 ? "text-right" : "text-left"}`} style={{ color: "var(--t-text-muted)" }}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {filtered.map((p) => (
                                            <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--t-text-secondary)" }}>{p.code}</td>
                                                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.name}</td>
                                                <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{p.brand || "-"}</td>
                                                <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--t-badge-bg)", color: "var(--t-badge-text)" }}>{p.category?.name}</span></td>
                                                <td className={`px-4 py-3 text-sm font-semibold ${p.quantity <= p.minStock ? "text-red-500" : ""}`} style={p.quantity <= p.minStock ? {} : { color: "var(--t-text)" }}>{p.quantity}</td>
                                                <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-muted)" }}>{p.unit}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openEditModal(p)} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-secondary)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-hover-overlay)"; e.currentTarget.style.color = "#3B82F6"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-secondary)"; }}><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeletePart(p.id)} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-secondary)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-secondary)"; }}><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {tab === "categories" && (
                <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="flex items-center gap-2 mb-4">
                        <input type="text" placeholder="ชื่อประเภทใหม่..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} className={`${inputCls} flex-1`} style={inputStyle} />
                        <button onClick={handleAddCategory} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"><Plus className="w-4 h-4" /> เพิ่ม</button>
                    </div>
                    <div className="space-y-1">
                        {categories.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors" onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                                    <span className="font-medium" style={{ color: "var(--t-text)" }}>{c.name}</span>
                                    <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>({c._count?.parts || 0} รายการ)</span>
                                </div>
                                <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-muted)"; }}><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        {categories.length === 0 && <div className="text-center py-8"><Layers className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">ยังไม่มีประเภท</p></div>}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowModal(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" style={{ background: "var(--t-modal-bg)", border: `1px solid var(--t-modal-border)`, animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold" style={{ color: "var(--t-text)" }}>{editingPart ? "แก้ไขอะไหล่" : "เพิ่มอะไหล่ใหม่"}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รหัส *</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} style={inputStyle} placeholder="BRK-001" /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ยี่ห้อ</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            </div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ชื่อ *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>รายละเอียด</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} style={inputStyle} rows={2} /></div>
                            <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ประเภท *</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={`${inputCls} cursor-pointer`} style={inputStyle}><option value="">เลือก</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>จำนวน</label><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className={inputCls} style={inputStyle} min={0} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>ขั้นต่ำ</label><input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} className={inputCls} style={inputStyle} min={0} /></div>
                                <div><label className="text-sm mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หน่วย</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls} style={inputStyle} /></div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleSavePart} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-50">{saving ? "กำลังบันทึก..." : editingPart ? "บันทึก" : "สร้างอะไหล่"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPaintBrands, createPaintBrand, updatePaintBrand, deletePaintBrand, getPaintColors, createPaintColor, updatePaintColor, deletePaintColor, getLookupOptions } from "@/lib/api";
import { getCarLogoUrl } from "@/lib/carLogos";
import { Palette, Plus, X, Pencil, Trash2, ChevronLeft, Search, Droplets } from "lucide-react";

export default function PaintColorTab() {
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [colors, setColors] = useState<any[]>([]);
    const [colorsLoading, setColorsLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Brand CRUD
    const [showAddBrand, setShowAddBrand] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");
    const [editingBrand, setEditingBrand] = useState<any>(null);
    const [editBrandName, setEditBrandName] = useState("");
    const [deletingBrand, setDeletingBrand] = useState<any>(null);

    // Color CRUD
    const [showAddColor, setShowAddColor] = useState(false);
    const [newColor, setNewColor] = useState({ code: "", quantity: "", unit: "กระป๋อง" });
    const [editingColor, setEditingColor] = useState<any>(null);
    const [editColor, setEditColor] = useState({ code: "", quantity: "", unit: "กระป๋อง" });
    const [deletingColor, setDeletingColor] = useState<any>(null);
    const [customNewUnit, setCustomNewUnit] = useState(false);
    const [customEditUnit, setCustomEditUnit] = useState(false);

    const fetchBrands = async () => {
        try { const b = await getPaintBrands(); setBrands(b); } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchBrands(); }, []);

    // Dynamic unit options from DB
    const [unitOptions, setUnitOptions] = useState<string[]>([]);
    useEffect(() => {
        getLookupOptions("UNIT_PAINT").then(r => setUnitOptions(r.map((o: any) => o.value))).catch(() => { });
    }, []);

    const fetchColors = async (brandId: string) => {
        setColorsLoading(true);
        try { const c = await getPaintColors(brandId); setColors(c); } catch (e) { console.error(e); }
        finally { setColorsLoading(false); }
    };

    useEffect(() => { if (selectedBrand) fetchColors(selectedBrand.id); }, [selectedBrand]);

    const filteredColors = colors
        .filter(c => !search || c.code.toLowerCase().includes(search.toLowerCase()));

    const inputStyle = { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" };

    // ─── Brand Grid View ───
    if (!selectedBrand) {
        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>เลือกยี่ห้อรถ</h2>
                        <p className="text-sm mt-0.5" style={{ color: "var(--t-text-muted)" }}>เลือกยี่ห้อเพื่อดูเลขสี</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {brands.map(b => (
                            <div key={b.id} className="group relative rounded-xl p-5 text-center cursor-pointer transition-all hover:shadow-md" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                                onClick={() => { setSelectedBrand(b); setSearch(""); }}>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditBrandName(b.name); setEditingBrand(b); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}><Pencil className="w-3	h-3" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeletingBrand(b); }} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}><Trash2 className="w-3 h-3" /></button>
                                </div>
                                <img src={getCarLogoUrl(b.name) || undefined} alt={b.name} className="w-12 h-12 mx-auto mb-3 object-contain opacity-70" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>{b.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{b._count?.colors || 0} เลขสี</p>
                            </div>
                        ))}
                        {/* Add Brand Card */}
                        <div onClick={() => { setNewBrandName(""); setShowAddBrand(true); }} className="rounded-xl p-5 text-center cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center" style={{ background: "transparent", border: "2px dashed var(--t-border-subtle)" }}>
                            <Plus className="w-8 h-8 mb-1" style={{ color: "#8B5CF6" }} />
                            <p className="text-sm font-medium" style={{ color: "#8B5CF6" }}>เพิ่มยี่ห้อ</p>
                        </div>
                    </div>
                )}

                {/* Add Brand Modal */}
                {showAddBrand && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddBrand(false)}>
                        <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={e => e.stopPropagation()}>
                            <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>เพิ่มยี่ห้อรถ</h3>
                            <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="เช่น Toyota" className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={inputStyle} autoFocus />
                            <div className="flex gap-3">
                                <button onClick={() => setShowAddBrand(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={async () => { if (!newBrandName.trim()) return; try { await createPaintBrand({ name: newBrandName.trim() }); await fetchBrands(); setShowAddBrand(false); } catch (err: any) { toast.error(err.message); } }} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer" style={{ background: "#8B5CF6" }}>เพิ่ม</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Brand Modal */}
                {editingBrand && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setEditingBrand(null)}>
                        <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={e => e.stopPropagation()}>
                            <h3 className="font-bold mb-4" style={{ color: "var(--t-text)" }}>แก้ไขยี่ห้อ</h3>
                            <input value={editBrandName} onChange={e => setEditBrandName(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={inputStyle} autoFocus />
                            <div className="flex gap-3">
                                <button onClick={() => setEditingBrand(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={async () => { if (!editBrandName.trim()) return; try { await updatePaintBrand(editingBrand.id, { name: editBrandName.trim() }); await fetchBrands(); setEditingBrand(null); } catch (err: any) { toast.error(err.message); } }} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer" style={{ background: "#8B5CF6" }}>บันทึก</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Brand Modal */}
                {deletingBrand && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setDeletingBrand(null)}>
                        <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>ลบยี่ห้อ</h3></div>
                            <p className="text-sm mb-1" style={{ color: "var(--t-text-secondary)" }}>ลบ <strong>{deletingBrand.name}</strong> และเลขสีทั้งหมดในยี่ห้อนี้?</p>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setDeletingBrand(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={async () => { try { await deletePaintBrand(deletingBrand.id); await fetchBrands(); setDeletingBrand(null); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── Color Code List View ───
    return (
        <div>
            <button onClick={() => { setSelectedBrand(null); setColors([]); }} className="flex items-center gap-1 text-sm mb-4 cursor-pointer rounded-lg px-3 py-2 transition-colors" style={{ color: "var(--t-text-secondary)", background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <ChevronLeft className="w-4 h-4" /> กลับไปเลือกยี่ห้อ
            </button>

            <div className="flex items-center gap-3 mb-2">
                <img src={getCarLogoUrl(selectedBrand.name) || undefined} alt="" className="w-8 h-8 object-contain opacity-70" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{selectedBrand.name}</h2>
                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>เลขสีทั้งหมด</p>
                </div>
            </div>

            {/* Add button + search */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="flex-1" />
                <button onClick={() => { setNewColor({ code: "", quantity: "", unit: "กระป๋อง" }); setShowAddColor(true); }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer text-white" style={{ background: "#8B5CF6" }}>
                    <Plus className="w-3.5 h-3.5" /> เพิ่มเลขสี
                </button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเลขสี..." className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={inputStyle} />
            </div>

            {colorsLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} /></div>
            ) : filteredColors.length === 0 ? (
                <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <Palette className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                    <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีเลขสี</p>
                    <button onClick={() => { setNewColor({ code: "", quantity: "", unit: "กระป๋อง" }); setShowAddColor(true); }} className="mt-3 text-sm font-medium cursor-pointer" style={{ color: "#8B5CF6" }}>+ เพิ่มเลขสีแรก</button>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredColors.map(c => (
                        <div key={c.id} className="group rounded-xl p-4 transition-all" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.1)" }}>
                                        <Palette className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm truncate" style={{ color: "var(--t-text)" }}>{c.code}</p>
                                    </div>
                                </div>
                                <div className="text-center px-3">
                                    <p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{c.quantity}</p>
                                    <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{c.unit}</p>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditColor({ code: c.code, quantity: String(c.quantity), unit: c.unit }); setEditingColor(c); }} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }} title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setDeletingColor(c)} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }} title="ลบ"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Color Modal */}
            {showAddColor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setShowAddColor(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}><Palette className="w-5 h-5" style={{ color: "#8B5CF6" }} /></div><div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>เพิ่มเลขสี</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedBrand.name}</p></div></div>
                            <button onClick={() => setShowAddColor(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>เลขสี *</label><input value={newColor.code} onChange={e => setNewColor({ ...newColor, code: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={inputStyle} placeholder="3P0" autoFocus /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>จำนวน</label><input type="number" value={newColor.quantity} onChange={e => setNewColor({ ...newColor, quantity: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} min={0} /></div>
                                <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>หน่วย</label>
                                    {customNewUnit ? (<div className="flex gap-1.5"><input value={newColor.unit} onChange={e => setNewColor({ ...newColor, unit: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="กรอกหน่วย..." autoFocus /><button type="button" onClick={() => { setCustomNewUnit(false); setNewColor({ ...newColor, unit: "กระป๋อง" }); }} className="px-2 rounded-lg text-xs shrink-0 cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-muted)" }}>เลือก</button></div>) : (<select value={newColor.unit} onChange={e => { if (e.target.value === "__custom__") { setCustomNewUnit(true); setNewColor({ ...newColor, unit: "" }); } else { setNewColor({ ...newColor, unit: e.target.value }); } }} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none cursor-pointer" style={inputStyle}>{unitOptions.map(u => <option key={u} value={u}>{u}</option>)}<option value="__custom__">+ กรอกเอง...</option></select>)}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowAddColor(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { if (!newColor.code) { toast.error("กรุณากรอกเลขสี"); return; } try { await createPaintColor(selectedBrand.id, { ...newColor, name: newColor.code, quantity: Number(newColor.quantity) || 0 }); await fetchColors(selectedBrand.id); setShowAddColor(false); toast.success("เพิ่มเลขสีเรียบร้อย"); } catch (err: any) { toast.error(err.message); } }} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer" style={{ background: "#8B5CF6" }}>เพิ่ม</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Color Modal */}
            {editingColor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setEditingColor(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}><Pencil className="w-5 h-5" style={{ color: "#8B5CF6" }} /></div><div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>แก้ไขเลขสี</h3><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{editingColor.code}</p></div></div>
                            <button onClick={() => setEditingColor(null)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>เลขสี</label><input value={editColor.code} onChange={e => setEditColor({ ...editColor, code: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30" style={inputStyle} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>จำนวน</label><input type="number" value={editColor.quantity} onChange={e => setEditColor({ ...editColor, quantity: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} min={0} /></div>
                                <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>หน่วย</label>
                                    {customEditUnit ? (<div className="flex gap-1.5"><input value={editColor.unit} onChange={e => setEditColor({ ...editColor, unit: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="กรอกหน่วย..." autoFocus /><button type="button" onClick={() => { setCustomEditUnit(false); setEditColor({ ...editColor, unit: "กระป๋อง" }); }} className="px-2 rounded-lg text-xs shrink-0 cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-muted)" }}>เลือก</button></div>) : (<select value={editColor.unit} onChange={e => { if (e.target.value === "__custom__") { setCustomEditUnit(true); setEditColor({ ...editColor, unit: "" }); } else { setEditColor({ ...editColor, unit: e.target.value }); } }} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none cursor-pointer" style={inputStyle}>{unitOptions.map(u => <option key={u} value={u}>{u}</option>)}<option value="__custom__">+ กรอกเอง...</option></select>)}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setEditingColor(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { try { await updatePaintColor(editingColor.id, { ...editColor, name: editColor.code, quantity: Number(editColor.quantity) || 0 }); await fetchColors(selectedBrand.id); setEditingColor(null); toast.success("บันทึกเรียบร้อย"); } catch (err: any) { toast.error(err.message); } }} className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer" style={{ background: "#8B5CF6" }}>บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Color Modal */}
            {deletingColor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setDeletingColor(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 className="w-5 h-5 text-red-500" /></div><h3 className="font-bold" style={{ color: "var(--t-text)" }}>ลบเลขสี</h3></div>
                        <p className="text-sm mb-1" style={{ color: "var(--t-text-secondary)" }}>ลบ <strong>{deletingColor.code}</strong>?</p>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setDeletingColor(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={async () => { try { await deletePaintColor(deletingColor.id); await fetchColors(selectedBrand.id); setDeletingColor(null); toast.success("ลบเรียบร้อย"); } catch (err: any) { toast.error(err.message); } }} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

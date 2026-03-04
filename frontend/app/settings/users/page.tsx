"use client";
import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api";
import { useAuth } from "@/components/AuthContext";
import { Users, Plus, Pencil, Trash2, X, ShieldCheck, Wrench, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    ADMIN: { label: "ผู้ดูแลระบบ", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
    TECH: { label: "ช่าง", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
};

export default function UserManagementPage() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ username: "", password: "", name: "", role: "TECH" });
    const [saving, setSaving] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: "", role: "", password: "" });
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        if (!form.username || !form.password || !form.name) { toast.error("กรุณากรอกข้อมูลให้ครบ"); return; }
        setSaving(true);
        try {
            await createUser(form);
            toast.success("สร้างผู้ใช้สำเร็จ");
            setShowCreate(false);
            setForm({ username: "", password: "", name: "", role: "TECH" });
            fetchUsers();
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const handleUpdate = async () => {
        if (!editUser) return;
        setSaving(true);
        try {
            const data: any = {};
            if (editForm.name && editForm.name !== editUser.name) data.name = editForm.name;
            if (editForm.role && editForm.role !== editUser.role) data.role = editForm.role;
            if (editForm.password) data.password = editForm.password;
            await updateUser(editUser.id, data);
            toast.success("แก้ไขผู้ใช้สำเร็จ");
            setEditUser(null);
            fetchUsers();
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteUser(confirmDelete.id);
            toast.success("ลบผู้ใช้สำเร็จ");
            setConfirmDelete(null);
            fetchUsers();
        } catch (err: any) { toast.error(err.message); }
    };

    if (loading) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
                <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลด...</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
                        <Users className="w-5 h-5" style={{ color: "#F97316" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>จัดการผู้ใช้</h1>
                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>{users.length} ผู้ใช้ในระบบ</p>
                    </div>
                </div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white cursor-pointer transition-all hover:shadow-lg" style={{ background: "#F97316", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
                    <Plus className="w-4 h-4" /> เพิ่มผู้ใช้
                </button>
            </div>

            {/* User list */}
            <div className="space-y-3">
                {users.map(u => {
                    const r = ROLE_LABEL[u.role] || ROLE_LABEL.TECH;
                    const isMe = me?.id === u.id;
                    return (
                        <div key={u.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: r.bg }}>
                                    {u.role === "ADMIN" ? <ShieldCheck className="w-5 h-5" style={{ color: r.color }} /> : <Wrench className="w-5 h-5" style={{ color: r.color }} />}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>
                                        {u.name} {isMe && <span className="text-xs text-emerald-500">(คุณ)</span>}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{u.username}</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: r.bg, color: r.color }}>{r.label}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => { setEditUser(u); setEditForm({ name: u.name, role: u.role, password: "" }); }} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(249,115,22,0.1)", color: "#F97316" }} title="แก้ไข">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {!isMe && (
                                    <button onClick={() => setConfirmDelete(u)} className="p-2 rounded-lg cursor-pointer" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }} title="ลบ">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => !saving && setShowCreate(false)}>
                    <div className="rounded-2xl w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="p-5 flex items-center justify-between" style={{ borderBottom: "2px solid rgba(249,115,22,0.2)" }}>
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>เพิ่มผู้ใช้ใหม่</h3>
                            <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--t-text)" }}>ชื่อผู้ใช้ (username)</label>
                                <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="เช่น tech01" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--t-text)" }}>รหัสผ่าน</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none pr-10" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="อย่างน้อย 4 ตัวอักษร" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "var(--t-text-muted)" }}>
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--t-text)" }}>ชื่อ-นามสกุล</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="เช่น ช่างสมชาย" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--t-text)" }}>บทบาท</label>
                                <div className="flex gap-2">
                                    {(["TECH", "ADMIN"] as const).map(role => (
                                        <button key={role} onClick={() => setForm({ ...form, role })} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer" style={{ background: form.role === role ? ROLE_LABEL[role].bg : "var(--t-input-bg)", border: `2px solid ${form.role === role ? ROLE_LABEL[role].color : "var(--t-input-border)"}`, color: form.role === role ? ROLE_LABEL[role].color : "var(--t-text-muted)" }}>
                                            {role === "ADMIN" ? <ShieldCheck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                                            {ROLE_LABEL[role].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl py-3 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={handleCreate} disabled={saving} className="flex-1 text-white font-bold rounded-xl py-3 text-sm cursor-pointer disabled:opacity-50" style={{ background: "#F97316" }}>{saving ? "กำลังสร้าง..." : "สร้างผู้ใช้"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => !saving && setEditUser(null)}>
                    <div className="rounded-2xl w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="p-5 flex items-center justify-between" style={{ borderBottom: "2px solid rgba(249,115,22,0.2)" }}>
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>แก้ไขผู้ใช้: {editUser.name}</h3>
                            <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--t-text)" }}>ชื่อ-นามสกุล</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--t-text)" }}>รหัสผ่านใหม่ <span className="font-normal text-xs" style={{ color: "var(--t-text-dim)" }}>(เว้นว่างถ้าไม่เปลี่ยน)</span></label>
                                <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="รหัสผ่านใหม่" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--t-text)" }}>บทบาท</label>
                                <div className="flex gap-2">
                                    {(["TECH", "ADMIN"] as const).map(role => (
                                        <button key={role} onClick={() => setEditForm({ ...editForm, role })} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer" style={{ background: editForm.role === role ? ROLE_LABEL[role].bg : "var(--t-input-bg)", border: `2px solid ${editForm.role === role ? ROLE_LABEL[role].color : "var(--t-input-border)"}`, color: editForm.role === role ? ROLE_LABEL[role].color : "var(--t-text-muted)" }}>
                                            {role === "ADMIN" ? <ShieldCheck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                                            {ROLE_LABEL[role].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setEditUser(null)} className="flex-1 rounded-xl py-3 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={handleUpdate} disabled={saving} className="flex-1 text-white font-bold rounded-xl py-3 text-sm cursor-pointer disabled:opacity-50" style={{ background: "#F97316" }}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setConfirmDelete(null)}>
                    <div className="rounded-2xl w-[90%] max-w-sm shadow-2xl p-6" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <p className="font-bold text-center mb-2" style={{ color: "var(--t-text)" }}>ลบผู้ใช้ "{confirmDelete.name}"?</p>
                        <p className="text-sm text-center mb-4" style={{ color: "var(--t-text-muted)" }}>การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl py-2.5 text-sm cursor-pointer">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

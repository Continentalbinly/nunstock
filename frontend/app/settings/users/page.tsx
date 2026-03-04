"use client";
import { useState, useEffect, useMemo } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
    Users, Plus, Pencil, Trash2, X, ShieldCheck, Wrench,
    Eye, EyeOff, Search, UserPlus, Crown, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, { label: string; color: string; bg: string; icon: typeof ShieldCheck }> = {
    ADMIN: { label: "ผู้ดูแลระบบ", color: "#F97316", bg: "rgba(249,115,22,0.12)", icon: ShieldCheck },
    TECH: { label: "ช่าง", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: Wrench },
};

function formatDate(dateStr: string) {
    try {
        return new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
    } catch { return "-"; }
}

export default function UserManagementPage() {
    const { user: me } = useAuthStore();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ username: "", password: "", name: "", role: "TECH" });
    const [saving, setSaving] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: "", role: "", password: "" });
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [search, setSearch] = useState("");

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;
        const q = search.toLowerCase();
        return users.filter(u =>
            u.name.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            ROLE_LABEL[u.role]?.label.includes(q)
        );
    }, [users, search]);

    const stats = useMemo(() => ({
        total: users.length,
        admins: users.filter(u => u.role === "ADMIN").length,
        techs: users.filter(u => u.role === "TECH").length,
    }), [users]);

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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
                        <Users className="w-5 h-5" style={{ color: "#F97316" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>จัดการผู้ใช้</h1>
                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>{stats.total} ผู้ใช้ในระบบ</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all hover:shadow-lg active:scale-[0.97]"
                    style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}
                >
                    <UserPlus className="w-4 h-4" /> เพิ่มผู้ใช้
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "ผู้ใช้ทั้งหมด", value: stats.total, icon: Users, color: "#10B981", bg: "rgba(16,185,129,0.1)" },
                    { label: "ผู้ดูแลระบบ", value: stats.admins, icon: Crown, color: "#F97316", bg: "rgba(249,115,22,0.1)" },
                    { label: "ช่าง", value: stats.techs, icon: Wrench, color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="rounded-xl p-4 flex items-center gap-4 transition-all duration-200"
                        style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                    >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                            <s.icon className="w-5 h-5" style={{ color: s.color }} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold leading-none" style={{ color: "var(--t-text)" }}>{s.value}</p>
                            <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search + User Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {/* Search bar */}
                <div className="px-4 sm:px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-dim)" }} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาผู้ใช้..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                        />
                    </div>
                    <p className="text-xs shrink-0 hidden sm:block" style={{ color: "var(--t-text-dim)" }}>
                        {filteredUsers.length === users.length ? `${users.length} รายการ` : `${filteredUsers.length} / ${users.length} รายการ`}
                    </p>
                </div>

                {/* Table Header (desktop) */}
                <div className="hidden sm:grid grid-cols-[1fr_120px_140px_100px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--t-text-dim)", borderBottom: "1px solid var(--t-border-subtle)" }}>
                    <span>ผู้ใช้</span>
                    <span>บทบาท</span>
                    <span>วันที่สร้าง</span>
                    <span className="text-right">จัดการ</span>
                </div>

                {/* User rows */}
                <div className="divide-y" style={{ borderColor: "var(--t-border-subtle)" }}>
                    {filteredUsers.length === 0 ? (
                        <div className="py-16 text-center">
                            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                            <p className="text-sm font-medium" style={{ color: "var(--t-text-muted)" }}>
                                {search ? "ไม่พบผู้ใช้ที่ค้นหา" : "ยังไม่มีผู้ใช้ในระบบ"}
                            </p>
                        </div>
                    ) : (
                        filteredUsers.map(u => {
                            const r = ROLE_LABEL[u.role] || ROLE_LABEL.TECH;
                            const isMe = me?.id === u.id;
                            const RoleIcon = r.icon;
                            return (
                                <div
                                    key={u.id}
                                    className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_100px] gap-2 sm:gap-4 items-center px-4 sm:px-5 py-4 transition-colors duration-150"
                                    style={{ background: "transparent" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-hover-overlay)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    {/* User info */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: r.bg }}>
                                            <RoleIcon className="w-5 h-5" style={{ color: r.color }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate" style={{ color: "var(--t-text)" }}>
                                                {u.name}
                                                {isMe && <span className="ml-1.5 text-xs text-emerald-500 font-medium">(คุณ)</span>}
                                            </p>
                                            <p className="font-mono text-xs truncate" style={{ color: "var(--t-text-muted)" }}>@{u.username}</p>
                                        </div>
                                    </div>

                                    {/* Role badge */}
                                    <div>
                                        <span
                                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                                            style={{ background: r.bg, color: r.color }}
                                        >
                                            <RoleIcon className="w-3 h-3" />
                                            {r.label}
                                        </span>
                                    </div>

                                    {/* Created date */}
                                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--t-text-muted)" }}>
                                        <CalendarDays className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                                        {formatDate(u.createdAt)}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5 sm:justify-end">
                                        <button
                                            onClick={() => { setEditUser(u); setEditForm({ name: u.name, role: u.role, password: "" }); }}
                                            className="p-2 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105"
                                            style={{ background: "rgba(249,115,22,0.1)", color: "#F97316" }}
                                            title="แก้ไข"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        {!isMe && (
                                            <button
                                                onClick={() => setConfirmDelete(u)}
                                                className="p-2 rounded-lg cursor-pointer transition-all duration-150 hover:scale-105"
                                                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => !saving && setShowCreate(false)}>
                    <div className="rounded-2xl w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="p-5 flex items-center justify-between" style={{ borderBottom: "2px solid rgba(249,115,22,0.2)" }}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
                                    <UserPlus className="w-4 h-4" style={{ color: "#F97316" }} />
                                </div>
                                <h3 className="font-bold" style={{ color: "var(--t-text)" }}>เพิ่มผู้ใช้ใหม่</h3>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>ชื่อผู้ใช้ (username)</label>
                                <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="เช่น tech01" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>รหัสผ่าน</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30 pr-10" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="อย่างน้อย 4 ตัวอักษร" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "var(--t-text-muted)" }}>
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>ชื่อ-นามสกุล</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="เช่น ช่างสมชาย" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>บทบาท</label>
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
                                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl py-3 text-sm font-medium cursor-pointer transition-colors" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={handleCreate} disabled={saving} className="flex-1 text-white font-bold rounded-xl py-3 text-sm cursor-pointer disabled:opacity-50 transition-all hover:shadow-lg" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>{saving ? "กำลังสร้าง..." : "สร้างผู้ใช้"}</button>
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
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
                                    <Pencil className="w-4 h-4" style={{ color: "#F97316" }} />
                                </div>
                                <h3 className="font-bold" style={{ color: "var(--t-text)" }}>แก้ไข: {editUser.name}</h3>
                            </div>
                            <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: "var(--t-text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>ชื่อ-นามสกุล</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>รหัสผ่านใหม่ <span className="font-normal text-xs" style={{ color: "var(--t-text-dim)" }}>(เว้นว่างถ้าไม่เปลี่ยน)</span></label>
                                <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} placeholder="รหัสผ่านใหม่" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--t-text)" }}>บทบาท</label>
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
                                <button onClick={() => setEditUser(null)} className="flex-1 rounded-xl py-3 text-sm font-medium cursor-pointer transition-colors" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={handleUpdate} disabled={saving} className="flex-1 text-white font-bold rounded-xl py-3 text-sm cursor-pointer disabled:opacity-50 transition-all hover:shadow-lg" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setConfirmDelete(null)}>
                    <div className="rounded-2xl w-[90%] max-w-sm shadow-2xl p-6" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="font-bold text-center mb-2" style={{ color: "var(--t-text)" }}>ลบผู้ใช้ &ldquo;{confirmDelete.name}&rdquo;?</p>
                        <p className="text-sm text-center mb-5" style={{ color: "var(--t-text-muted)" }}>การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl py-2.5 text-sm font-medium cursor-pointer transition-colors" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl py-2.5 text-sm cursor-pointer transition-all">ลบผู้ใช้</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";
import { useEffect, useState } from "react";
import { getMovements } from "@/lib/api";
import { History, ArrowDownToLine, ArrowUpFromLine, Package, Filter, Search, User } from "lucide-react";

export default function WithdrawHistoryPage() {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<"" | "IN" | "OUT">("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        getMovements(typeFilter ? { type: typeFilter } : undefined)
            .then(setMovements)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [typeFilter]);

    const filtered = movements.filter((m) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return m.part?.name?.toLowerCase().includes(q) || m.part?.code?.toLowerCase().includes(q) || m.user?.name?.toLowerCase().includes(q) || m.techName?.toLowerCase().includes(q);
    });

    const totalIn = movements.filter((m) => m.type === "IN").length;
    const totalOut = movements.filter((m) => m.type === "OUT").length;

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-center"><div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p></div></div>;

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>ประวัติสต็อก</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ประวัติการเบิกและเพิ่มอะไหล่ทั้งหมด</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                        <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                        <span style={{ color: "var(--t-text-muted)" }}>เข้า:</span>
                        <span className="font-bold text-emerald-500">{totalIn}</span>
                    </div>
                    <div className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                        <ArrowUpFromLine className="w-4 h-4 text-orange-500" />
                        <span style={{ color: "var(--t-text-muted)" }}>ออก:</span>
                        <span className="font-bold text-orange-500">{totalOut}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                        <input type="text" placeholder="ค้นหาชื่ออะไหล่, รหัส, ชื่อผู้ใช้..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>
                    <div className="flex items-center gap-1">
                        {[
                            { value: "", label: "ทั้งหมด", icon: Filter },
                            { value: "IN", label: "เข้า", icon: ArrowDownToLine },
                            { value: "OUT", label: "ออก", icon: ArrowUpFromLine },
                        ].map(({ value, label, icon: Icon }) => (
                            <button key={value} onClick={() => { setTypeFilter(value as any); setLoading(true); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${typeFilter === value ? value === "IN" ? "bg-emerald-500/15 text-emerald-500" : value === "OUT" ? "bg-orange-500/15 text-orange-500" : "bg-blue-500/15 text-blue-500" : ""}`} style={typeFilter === value ? { border: `1px solid ${value === "IN" ? "rgba(34,197,94,0.3)" : value === "OUT" ? "rgba(249,115,22,0.3)" : "rgba(59,130,246,0.3)"}` } : { color: "var(--t-text-secondary)" }}>
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{filtered.length}</span> รายการ</p>

            {/* History table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <History className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                        <p className="font-medium" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีประวัติ</p>
                        <p className="text-xs mt-1" style={{ color: "var(--t-text-dim)" }}>เบิกหรือเพิ่มสต็อกจากหน้าคลังอะไหล่</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    {["ประเภท", "อะไหล่", "จำนวน", "เลขงาน", "ช่าง", "ผู้ดำเนินการ", "เหตุผล", "เวลา"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-dim)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((m: any) => {
                                    const isIn = m.type === "IN";
                                    const isToday = new Date(m.createdAt).toDateString() === new Date().toDateString();
                                    return (
                                        <tr key={m.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${isIn ? "bg-emerald-500/15 text-emerald-500" : "bg-orange-500/15 text-orange-500"}`}>
                                                    {isIn ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                                                    {isIn ? "เข้า" : "ออก"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{m.part?.name}</p>
                                                <p className="font-mono text-[11px]" style={{ color: "var(--t-text-muted)" }}>{m.part?.code}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm font-bold ${isIn ? "text-emerald-500" : "text-orange-500"}`}>{isIn ? "+" : "-"}{m.quantity}</span>
                                                <span className="text-xs ml-1" style={{ color: "var(--t-text-dim)" }}>{m.part?.unit}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{m.jobNo || <span style={{ color: "var(--t-text-dim)" }}>-</span>}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{m.techName || <span style={{ color: "var(--t-text-dim)" }}>-</span>}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center"><User className="w-3 h-3 text-blue-500" /></div>
                                                    <span className="text-sm" style={{ color: "var(--t-text)" }}>{m.user?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs max-w-[120px] truncate" style={{ color: "var(--t-text-muted)" }}>{m.reason || "-"}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs whitespace-nowrap ${isToday ? "text-emerald-500 font-medium" : ""}`} style={isToday ? {} : { color: "var(--t-text-muted)" }}>
                                                    {new Date(m.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                                {isToday && <span className="block text-[10px] text-emerald-500/70">วันนี้</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJobs, getJobsSummary, cancelJob } from "@/lib/api";
import {
    Wrench, Search, Plus, Car, Clock, PlayCircle, PackageCheck, Truck,
    ShieldCheck, Banknote, Ban, ArrowRight, Bell,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    WAITING_PARTS: { label: "รออะไหล่", icon: Clock, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
    RECEIVED: { label: "รับรถ", icon: Car, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
    IN_PROGRESS: { label: "กำลังซ่อม", icon: PlayCircle, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
    COMPLETED: { label: "ซ่อมเสร็จ", icon: PackageCheck, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
    DELIVERED: { label: "ส่งมอบ", icon: Truck, color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
    CANCELLED: { label: "ยกเลิก", icon: Ban, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};
const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    INSURANCE: { label: "ประกัน", icon: ShieldCheck, color: "#F97316" },
    CASH: { label: "หน้าร้าน", icon: Banknote, color: "#22C55E" },
};

export default function JobsPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
    const [confirmCancel, setConfirmCancel] = useState<any>(null);
    const [cancelReason, setCancelReason] = useState("");

    useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(t); }, [search]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), pageSize: "20" };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterStatus) params.status = filterStatus;
            if (filterType) params.type = filterType;
            const [result, sum] = await Promise.all([getJobs(params), getJobsSummary()]);
            setItems(result.data);
            setPagination(result.pagination);
            setSummary(sum);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [page, debouncedSearch, filterStatus, filterType]);
    const resetPage = (setter: (v: any) => void, val: any) => { setPage(1); setter(val); };

    const handleCancel = async (id: string) => {
        if (!cancelReason.trim()) { toast.error("กรุณาระบุเหตุผล"); return; }
        try { await cancelJob(id, cancelReason.trim()); setConfirmCancel(null); setCancelReason(""); toast.success("ยกเลิก Job เรียบร้อย"); fetchAll(); }
        catch (err: any) { toast.error(err.message); }
    };

    if (loading && items.length === 0) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
                <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดงานซ่อม...</p>
            </div>
        </div>
    );

    const summaryCards = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ key, ...cfg }));

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>งานซ่อม</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>จัดการ Job ซ่อมรถ — ประกัน &amp; หน้าร้าน</p>
                </div>
                <button onClick={() => router.push("/jobs/new")} className="flex items-center gap-2 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer" style={{ background: "#F97316" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#EA580C"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#F97316"}>
                    <Plus className="w-4 h-4" /> เปิด Job ใหม่
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {summaryCards.map((s) => (
                    <button key={s.key} onClick={() => resetPage(setFilterStatus, filterStatus === s.key ? "" : s.key)}
                        className="rounded-xl p-3 transition-all text-left cursor-pointer"
                        style={{ background: "var(--t-card)", borderTop: `2px solid ${s.color}`, borderLeft: filterStatus === s.key ? `2px solid ${s.color}` : "1px solid var(--t-border-subtle)", borderRight: filterStatus === s.key ? `2px solid ${s.color}` : "1px solid var(--t-border-subtle)", borderBottom: filterStatus === s.key ? `2px solid ${s.color}` : "1px solid var(--t-border-subtle)" }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                            </div>
                            <div>
                                <div className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{summary?.byStatus?.[s.key] || 0}</div>
                                <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{s.label}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                        <input value={search} onChange={(e) => resetPage(setSearch, e.target.value)} placeholder="ค้นหา... (เลข Job, ชื่อ, ทะเบียน)" className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                    </div>
                    <select value={filterType} onChange={(e) => resetPage(setFilterType, e.target.value)} className="rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                        <option value="">ทุกประเภท</option>
                        <option value="INSURANCE">ประกัน</option>
                        <option value="CASH">หน้าร้าน</option>
                    </select>
                </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{pagination.total}</span> งาน</p>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {items.length === 0 ? (
                    <div className="text-center py-16">
                        <Wrench className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                        <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีงานซ่อม</p>
                        <button onClick={() => router.push("/jobs/new")} className="mt-3 text-sm font-medium cursor-pointer" style={{ color: "#F97316" }}>+ เปิด Job แรก</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    {["เลข Job", "ประเภท", "ลูกค้า / รถ", "สถานะ", "อะไหล่", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((job) => {
                                    const st = STATUS_CONFIG[job.status] || STATUS_CONFIG.WAITING_PARTS;
                                    const tp = TYPE_CONFIG[job.type] || TYPE_CONFIG.CASH;
                                    const StIcon = st.icon;
                                    return (
                                        <tr key={job.id} className="transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            onClick={() => router.push(`/jobs/${job.id}`)}>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm font-bold" style={{ color: "#F97316" }}>{job.jobNo}</span>
                                                {job.claimNo && <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-dim)" }}>เคลม: {job.claimNo}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${tp.color}15`, color: tp.color }}>
                                                    <tp.icon className="w-3 h-3" /> {tp.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{job.customerName}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Car className="w-3 h-3" style={{ color: "var(--t-text-dim)" }} />
                                                    <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{job.carBrand} {job.carModel} • {job.plateNo}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>
                                                    <StIcon className="w-3 h-3" /> {st.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{job._count?.parts || 0}</span>
                                                <span className="text-xs ml-1" style={{ color: "var(--t-text-dim)" }}>รายการ</span>
                                            </td>
                                            <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                                {job.status !== "CANCELLED" && job.status !== "DELIVERED" && (
                                                    <button onClick={() => setConfirmCancel(job)} className="text-xs font-medium px-2 py-1 rounded-lg cursor-pointer transition-colors" style={{ color: "#ef4444" }} title="ยกเลิก Job">
                                                        ยกเลิก
                                                    </button>
                                                )}
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

            {/* Cancel Modal */}
            {confirmCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => { setConfirmCancel(null); setCancelReason(""); }}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Ban className="w-5 h-5 text-red-500" /></div>
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>ยกเลิก {confirmCancel.jobNo}?</h3>
                        </div>
                        <p className="text-xs mb-3" style={{ color: "var(--t-text-dim)" }}>อะไหล่ที่มาถึงแล้วจะถูกโอนเข้าสต็อกร้าน</p>
                        <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} placeholder="เหตุผลในการยกเลิก (จำเป็น)" className="w-full text-sm px-3 py-2 rounded-lg resize-none mb-4" style={{ background: "var(--t-input-bg)", color: "var(--t-text)", border: "1px solid var(--t-input-border)" }} />
                        <div className="flex gap-3">
                            <button onClick={() => { setConfirmCancel(null); setCancelReason(""); }} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ปิด</button>
                            <button onClick={() => handleCancel(confirmCancel.id)} disabled={!cancelReason.trim()} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-40">ยกเลิก Job</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

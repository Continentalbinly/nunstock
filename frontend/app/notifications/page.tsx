"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getNotifications, retryNotification, sendNotification, getJobs } from "@/lib/api";
import {
    Bell, RefreshCw, Send, CheckCircle, XCircle, Clock,
    Car, AlertTriangle, MessageSquare, Package, Zap,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    SENT: { label: "สำเร็จ", color: "#22C55E", bg: "rgba(34,197,94,0.12)", Icon: CheckCircle },
    FAILED: { label: "ล้มเหลว", color: "#EF4444", bg: "rgba(239,68,68,0.12)", Icon: XCircle },
    PENDING: { label: "รอส่ง", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", Icon: Clock },
};

const TYPE_CFG: Record<string, { label: string; Icon: any; color: string }> = {
    PARTS_ARRIVED: { label: "อะไหล่มาครบ", Icon: Package, color: "#22C55E" },
    STATUS_CHANGE: { label: "เปลี่ยนสถานะ", Icon: Zap, color: "#F97316" },
    MANUAL: { label: "ส่งเอง", Icon: MessageSquare, color: "#8B5CF6" },
};

export default function NotificationsPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

    // Manual send modal
    const [showSend, setShowSend] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const [sendJobId, setSendJobId] = useState("");
    const [sendMessage, setSendMessage] = useState("");
    const [sending, setSending] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await getNotifications(page, 20, filterStatus || undefined);
            setItems(res.data || []);
            setPagination(res.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
        } catch { toast.error("โหลดรายการแจ้งเตือนไม่ได้"); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [page, filterStatus]);
    const resetPage = (setter: (v: any) => void, val: any) => { setPage(1); setter(val); };

    const handleRetry = async (id: string) => {
        try {
            const res = await retryNotification(id);
            if (res.data?.status === "SENT") toast.success("ส่งซ้ำสำเร็จ");
            else toast.error("ส่งซ้ำไม่สำเร็จ: " + (res.data?.error || ""));
            fetchAll();
        } catch (err: any) { toast.error(err.message || "เกิดข้อผิดพลาด"); }
    };

    const openSendModal = async () => {
        setShowSend(true);
        try {
            const res = await getJobs();
            setJobs(res.data || []);
        } catch { }
    };

    const handleManualSend = async () => {
        if (!sendJobId || !sendMessage.trim()) { toast.error("กรุณาเลือก Job และใส่ข้อความ"); return; }
        setSending(true);
        try {
            const res = await sendNotification(sendJobId, sendMessage);
            if (res.data?.status === "SENT") toast.success("ส่งสำเร็จ");
            else toast.error("ส่งไม่สำเร็จ: " + (res.data?.error || "ลูกค้ายังไม่ลงทะเบียน LINE"));
            setShowSend(false); setSendJobId(""); setSendMessage("");
            fetchAll();
        } catch (err: any) { toast.error(err.message || "เกิดข้อผิดพลาด"); }
        setSending(false);
    };

    const fmt = (d: string) => {
        const dt = new Date(d);
        return dt.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }) + " " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    };

    if (loading && items.length === 0) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} />
                <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดแจ้งเตือน...</p>
            </div>
        </div>
    );

    const summaryCards = Object.entries(STATUS_CFG).map(([key, cfg]) => ({ key, ...cfg }));

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>แจ้งเตือน LINE</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ประวัติการแจ้งเตือนลูกค้าผ่าน LINE OA</p>
                </div>
                <button onClick={openSendModal} className="flex items-center gap-2 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer" style={{ background: "#8B5CF6" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#7C3AED"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#8B5CF6"}>
                    <Send className="w-4 h-4" /> ส่งแจ้งเตือน
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {summaryCards.map((s) => (
                    <button key={s.key} onClick={() => resetPage(setFilterStatus, filterStatus === s.key ? "" : s.key)}
                        className="rounded-xl p-3 transition-all text-left cursor-pointer"
                        style={{ background: "var(--t-card)", borderTop: `2px solid ${s.color}`, borderLeft: filterStatus === s.key ? `2px solid ${s.color}` : "1px solid var(--t-border-subtle)", borderRight: filterStatus === s.key ? `2px solid ${s.color}` : "1px solid var(--t-border-subtle)", borderBottom: filterStatus === s.key ? `2px solid ${s.color}` : "1px solid var(--t-border-subtle)" }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                                <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                            </div>
                            <div>
                                <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{s.label}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{pagination.total}</span> รายการ</p>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {items.length === 0 ? (
                    <div className="text-center py-16">
                        <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                        <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีรายการแจ้งเตือน</p>
                        <p className="text-xs mt-1" style={{ color: "var(--t-text-dim)" }}>เมื่ออะไหล่มาครบ ระบบจะส่งแจ้งเตือนอัตโนมัติ</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    {["สถานะ", "ประเภท", "Job / รถ", "ข้อความ", "เวลา", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((n: any) => {
                                    const sCfg = STATUS_CFG[n.status] || STATUS_CFG.PENDING;
                                    const tCfg = TYPE_CFG[n.type] || TYPE_CFG.MANUAL;
                                    const StatusIcon = sCfg.Icon;
                                    return (
                                        <tr key={n.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium" style={{ background: sCfg.bg, color: sCfg.color }}>
                                                    <StatusIcon className="w-3 h-3" /> {sCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${tCfg.color}15`, color: tCfg.color }}>
                                                    <tCfg.Icon className="w-3 h-3" /> {tCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-bold" style={{ color: "#8B5CF6" }}>{n.job?.jobNo || "-"}</span>
                                                {n.job && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Car className="w-3 h-3" style={{ color: "var(--t-text-dim)" }} />
                                                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{n.job.carBrand} {n.job.carModel} • {n.job.plateNo}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 max-w-[250px]">
                                                <p className="text-xs whitespace-pre-line line-clamp-2" style={{ color: "var(--t-text-secondary)" }}>{n.message}</p>
                                                {n.error && (
                                                    <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: "#EF4444" }}>
                                                        <AlertTriangle className="w-3 h-3 shrink-0" /> {n.error}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{fmt(n.createdAt)}</span>
                                                {n.status === "SENT" && n.sentAt && (
                                                    <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-dim)" }}>ส่งเมื่อ {fmt(n.sentAt)}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {n.status === "FAILED" && (
                                                    <button onClick={() => handleRetry(n.id)} className="p-1.5 rounded-lg cursor-pointer transition-colors" style={{ background: "rgba(249,115,22,0.1)", color: "#F97316" }} title="ลองใหม่">
                                                        <RefreshCw className="w-3.5 h-3.5" />
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

            {/* Manual Send Modal */}
            {showSend && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => setShowSend(false)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}><Send className="w-5 h-5" style={{ color: "#8B5CF6" }} /></div>
                            <h3 className="font-bold" style={{ color: "var(--t-text)" }}>ส่งแจ้งเตือน LINE</h3>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium block mb-1" style={{ color: "var(--t-text-secondary)" }}>เลือก Job</label>
                                <select value={sendJobId} onChange={e => setSendJobId(e.target.value)} className="w-full text-sm px-3 py-2.5 rounded-lg" style={{ background: "var(--t-input-bg)", color: "var(--t-text)", border: "1px solid var(--t-input-border)" }}>
                                    <option value="">เลือก Job...</option>
                                    {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.jobNo} — {j.customerName} ({j.plateNo})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1" style={{ color: "var(--t-text-secondary)" }}>ข้อความ</label>
                                <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={4} placeholder="พิมพ์ข้อความที่จะส่ง..." className="w-full text-sm px-3 py-2.5 rounded-lg resize-none" style={{ background: "var(--t-input-bg)", color: "var(--t-text)", border: "1px solid var(--t-input-border)" }} />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowSend(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                            <button onClick={handleManualSend} disabled={sending} className="flex-1 font-semibold rounded-lg py-2.5 text-sm cursor-pointer text-white" style={{ background: "#8B5CF6" }}>
                                {sending ? "กำลังส่ง..." : "ส่ง LINE"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";
import { useEffect, useState } from "react";
import { getClaimsAll, notifyClaimCustomer } from "@/lib/api";
import { Bell, BellRing, Send, CheckCircle2, Clock, Phone, Car } from "lucide-react";

const statusLabel: Record<string, string> = { PENDING: "รอดำเนินการ", ORDERED: "สั่งแล้ว", ARRIVED: "มาถึง", NOTIFIED: "แจ้งแล้ว", COMPLETED: "เสร็จสิ้น" };
const statusBadge: Record<string, string> = { PENDING: "bg-amber-500/15 text-amber-500", ORDERED: "bg-blue-500/15 text-blue-500", ARRIVED: "bg-emerald-500/15 text-emerald-500", NOTIFIED: "bg-purple-500/15 text-purple-500", COMPLETED: "bg-emerald-500/10 text-emerald-500" };

export default function NotificationsPage() {
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState<string | null>(null);
    const [success, setSuccess] = useState("");

    const fetchData = async () => { try { setClaims(await getClaimsAll()); } catch (err) { console.error(err); } finally { setLoading(false); } };
    useEffect(() => { fetchData(); }, []);

    const readyToNotify = claims.filter((c) => c.status === "ARRIVED");
    const notifiedClaims = claims.filter((c) => c.status === "NOTIFIED");
    const pendingClaims = claims.filter((c) => c.status === "PENDING" || c.status === "ORDERED");

    const handleNotify = async (id: string) => { setSending(id); try { await notifyClaimCustomer(id); setSuccess("ส่งแจ้งเตือนสำเร็จ!"); fetchData(); setTimeout(() => setSuccess(""), 3000); } catch (err: any) { alert(err.message); } finally { setSending(null); } };

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-center"><div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p></div></div>;

    const statCards = [
        { label: "พร้อมแจ้งเตือน", value: readyToNotify.length, icon: BellRing, accent: "#22C55E" },
        { label: "แจ้งแล้ว", value: notifiedClaims.length, icon: CheckCircle2, accent: "#A855F7" },
        { label: "รออะไหล่", value: pendingClaims.length, icon: Clock, accent: "#F59E0B" },
    ];

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>แจ้งเตือนลูกค้า</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ส่งการแจ้งเตือนเมื่ออะไหล่มาถึงและติดตามสถานะ</p>
            </div>

            {success && <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{success}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {statCards.map((s) => (
                    <div key={s.label} className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${s.accent}20` }}><s.icon className="w-5 h-5" style={{ color: s.accent }} /></div>
                            <div><p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{s.value}</p><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{s.label}</p></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ready to Notify */}
            <div className="mb-8">
                <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}><BellRing className="w-5 h-5 text-emerald-500" /> พร้อมแจ้งเตือน {readyToNotify.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">{readyToNotify.length}</span>}</h2>
                {readyToNotify.length === 0 ? (
                    <div className="rounded-xl text-center py-12" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}><Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }}>ไม่มีรายการที่ต้องแจ้งเตือน</p><p className="text-xs mt-1" style={{ color: "var(--t-text-dim)" }}>อะไหล่ต้องอยู่ในสถานะ "มาถึง" จึงจะแจ้งเตือนได้</p></div>
                ) : (
                    <div className="space-y-3">
                        {readyToNotify.map((c) => (
                            <div key={c.id} className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1"><span className="font-mono text-sm" style={{ color: "var(--t-text-secondary)" }}>{c.claimNo}</span><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span></div>
                                        <p className="font-medium" style={{ color: "var(--t-text)" }}>{c.customerName}</p>
                                        <div className="flex items-center gap-4 text-sm mt-1" style={{ color: "var(--t-text-muted)" }}><span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.customerPhone}</span><span className="flex items-center gap-1"><Car className="w-3 h-3" />{c.carBrand} {c.carModel} • {c.plateNo}</span></div>
                                        {c.items?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{c.items.map((item: any) => <span key={item.id} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--t-badge-bg)", color: "var(--t-badge-text)" }}>{item.partName} ×{item.quantity}</span>)}</div>}
                                    </div>
                                    <button onClick={() => handleNotify(c.id)} disabled={sending === c.id} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"><Send className="w-4 h-4" />{sending === c.id ? "กำลังส่ง..." : "แจ้งเตือน"}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {notifiedClaims.length > 0 && (
                <div className="mb-8">
                    <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}><CheckCircle2 className="w-5 h-5 text-purple-500" /> แจ้งเตือนแล้ว</h2>
                    <div className="space-y-2">{notifiedClaims.map((c) => (
                        <div key={c.id} className="rounded-xl py-3 px-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0"><span className="font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{c.claimNo}</span><span className="font-medium" style={{ color: "var(--t-text-secondary)" }}>{c.customerName}</span><span className="text-sm" style={{ color: "var(--t-text-dim)" }}>{c.customerPhone}</span></div>
                                <div className="flex items-center gap-2 shrink-0"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>{c.notifiedAt && <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>{new Date(c.notifiedAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}</div>
                            </div>
                        </div>
                    ))}</div>
                </div>
            )}

            {pendingClaims.length > 0 && (
                <div>
                    <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}><Clock className="w-5 h-5 text-amber-500" /> รออะไหล่</h2>
                    <div className="space-y-2">{pendingClaims.map((c) => (
                        <div key={c.id} className="rounded-xl py-3 px-5 opacity-70" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0"><span className="font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{c.claimNo}</span><span style={{ color: "var(--t-text-secondary)" }}>{c.customerName}</span><span className="text-sm" style={{ color: "var(--t-text-dim)" }}>{c.plateNo}</span></div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                            </div>
                        </div>
                    ))}</div>
                </div>
            )}
        </div>
    );
}

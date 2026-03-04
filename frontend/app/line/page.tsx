"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, MessageSquare, RefreshCw, Send, Copy, Users, Link2, Link2Off } from "lucide-react";

const API_BASE = "";

const statusLabel: Record<string, string> = { WAITING_PARTS: "รออะไหล่", RECEIVED: "รับรถแล้ว", IN_PROGRESS: "กำลังซ่อม", COMPLETED: "ซ่อมเสร็จ", DELIVERED: "ส่งมอบแล้ว", CANCELLED: "ยกเลิก" };
const statusBadge: Record<string, string> = { WAITING_PARTS: "bg-amber-500/15 text-amber-500", RECEIVED: "bg-blue-500/15 text-blue-500", IN_PROGRESS: "bg-orange-500/15 text-orange-500", COMPLETED: "bg-emerald-500/15 text-emerald-500", DELIVERED: "bg-emerald-500/10 text-emerald-500", CANCELLED: "bg-red-500/15 text-red-500" };

export default function LineOperationsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [testUserId, setTestUserId] = useState("");
    const [testMsg, setTestMsg] = useState("");
    const [sending, setSending] = useState(false);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/line/status`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (e) {
            toast.error("โหลดข้อมูลไม่ได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    const handleTestPush = async () => {
        if (!testUserId.trim()) { toast.error("กรุณาใส่ LINE User ID"); return; }
        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/line/test-push`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ lineUserId: testUserId.trim(), message: testMsg || undefined }),
            });
            const json = await res.json();
            if (json.success) toast.success("ส่งสำเร็จ!");
            else toast.error(json.error || "ส่งไม่ได้");
        } catch {
            toast.error("เชื่อมต่อไม่ได้");
        } finally {
            setSending(false);
        }
    };

    const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("คัดลอกแล้ว!"); };

    if (loading) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#00B370" }} />
                <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลด...</p>
            </div>
        </div>
    );

    const cfg = data?.config;
    const stats = data?.stats;

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black" style={{ background: "#00B370" }}>L</span>
                        LINE Operations
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ศูนย์ควบคุม LINE OA — สถานะ, สถิติ, และทดสอบส่งข้อความ</p>
                </div>
                <button onClick={fetchStatus} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-secondary)" }}>
                    <RefreshCw className="w-4 h-4" /> รีเฟรช
                </button>
            </div>

            {/* ── Connection Status ── */}
            <div className="rounded-xl p-5 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                    <MessageSquare className="w-4 h-4" style={{ color: "#00B370" }} />
                    สถานะการเชื่อมต่อ LINE OA
                </h2>

                {/* สถานะรวม */}
                <div className={`rounded-xl p-4 mb-4 flex items-center gap-3`} style={{
                    background: cfg?.tokenValid ? "rgba(0,179,112,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${cfg?.tokenValid ? "rgba(0,179,112,0.25)" : "rgba(239,68,68,0.25)"}`,
                }}>
                    {cfg?.tokenValid
                        ? <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: "#00B370" }} />
                        : <XCircle className="w-6 h-6 shrink-0" style={{ color: "#EF4444" }} />}
                    <div>
                        <p className="font-semibold" style={{ color: cfg?.tokenValid ? "#00B370" : "#EF4444" }}>
                            {cfg?.tokenValid ? "เชื่อมต่อ LINE OA สำเร็จ ✓" : "ยังไม่ได้เชื่อมต่อ LINE OA"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                            {cfg?.tokenValid
                                ? `Bot: ${cfg?.botProfile?.displayName || "LINE Bot"}`
                                : "ตรวจสอบ LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET ใน .env บน server"}
                        </p>
                    </div>
                    {cfg?.botProfile?.pictureUrl && (
                        <img src={cfg.botProfile.pictureUrl} alt="bot" className="w-10 h-10 rounded-full shrink-0 ml-auto" />
                    )}
                </div>

                {/* Webhook URL */}
                <div className="rounded-lg p-3 flex items-center justify-between gap-3" style={{ background: "var(--t-hover-overlay)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="min-w-0">
                        <p className="text-xs font-medium mb-0.5" style={{ color: "var(--t-text-muted)" }}>Webhook URL</p>
                        <p className="text-sm font-mono truncate" style={{ color: "var(--t-text)" }}>{cfg?.webhookUrl}</p>
                    </div>
                    <button onClick={() => copy(cfg?.webhookUrl)} className="shrink-0 p-2 rounded-lg transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
            </div>


            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "งานทั้งหมด", value: stats?.totalClaims ?? 0, icon: Users, color: "#F97316" },
                    { label: "ลิงก์ LINE แล้ว", value: stats?.linkedClaims ?? 0, icon: Link2, color: "#00B370" },
                    { label: "งานเปิดอยู่", value: stats?.activeClaims ?? 0, icon: AlertCircle, color: "#F59E0B" },
                    { label: "อัตราลิงก์ (active)", value: `${stats?.linkRate ?? 0}%`, icon: CheckCircle2, color: "#A855F7" },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: `2px solid ${s.color}` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.color}20` }}>
                            <s.icon className="w-4 h-4" style={{ color: s.color }} />
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{s.value}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* ── ลิงก์แล้ว ── */}
                <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                        <Link2 className="w-4 h-4" style={{ color: "#00B370" }} />
                        เชื่อมต่อ LINE แล้ว
                        <span className="text-xs px-1.5 py-0.5 rounded-md ml-auto" style={{ background: "rgba(0,179,112,0.1)", color: "#00B370" }}>{data?.recentLinked?.length ?? 0}</span>
                    </h2>
                    {!data?.recentLinked?.length ? (
                        <p className="text-sm text-center py-8" style={{ color: "var(--t-text-muted)" }}>{(stats?.totalClaims ?? 0) > 0 ? "ยังไม่มีลูกค้าลิงก์ LINE" : "ยังไม่มีข้อมูลงาน"}</p>
                    ) : (
                        <div className="space-y-2">
                            {data.recentLinked.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{c.customerName}</p>
                                        <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{c.jobNo} • {c.plateNo} • {c.carBrand} {c.carModel}{c.insuranceComp ? ` • ${c.insuranceComp}` : ""}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                                        <button onClick={() => { setTestUserId(c.lineUserId); toast.success("คัดลอก Line User ID แล้ว"); }} className="p-1.5 rounded cursor-pointer" style={{ background: "var(--t-badge-bg)", color: "var(--t-text-dim)" }} title="ใช้ LINE User ID นี้ทดสอบ">
                                            <Send className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── ยังไม่ลิงก์ ── */}
                <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                        <Link2Off className="w-4 h-4 text-amber-500" />
                        รอลิงก์ LINE (active)
                        <span className="text-xs px-1.5 py-0.5 rounded-md ml-auto" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>{data?.unlinked?.length ?? 0}</span>
                    </h2>
                    {!data?.unlinked?.length ? (
                        <p className="text-sm text-center py-8" style={{ color: "var(--t-text-muted)" }}>{(stats?.totalClaims ?? 0) > 0 ? "ลูกค้าทุกคนลิงก์ LINE แล้ว 🎉" : "ไม่มีลูกค้ารอลิงก์"}</p>
                    ) : (
                        <div className="space-y-2">
                            {data.unlinked.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{c.customerName}</p>
                                        <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{c.jobNo} • {c.plateNo} • {c.carBrand} {c.carModel}{c.insuranceComp ? ` • ${c.insuranceComp}` : ""}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── คำแนะนำสำหรับลูกค้า ── */}
            <div className="rounded-xl p-5 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    ข้อความแนะนำสำหรับลูกค้า
                    <span className="text-xs px-2 py-0.5 rounded-full text-orange-500 ml-1" style={{ background: "rgba(249,115,22,0.1)" }}>copy ให้ลูกค้า</span>
                </h2>
                {[
                    {
                        label: "ภาษาไทย",
                        text: `📱 รับการแจ้งเตือนสถานะอะไหล่ผ่าน LINE!\n\n1. Add LINE OA: @นันการช่าง\n2. ส่งข้อความ: "ชื่อ / ทะเบียนรถ" (เช่น สมชาย / กข1234)\n3. ระบบจะแจ้งเตือนเมื่ออะไหล่มาถึงและซ่อมเสร็จ 🎉`,
                    },
                ].map((item) => (
                    <div key={item.label} className="relative rounded-lg p-4" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                        <button onClick={() => copy(item.text)} className="absolute top-3 right-3 p-1.5 rounded cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-dim)", border: "1px solid var(--t-input-border)" }}>
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        <pre className="text-sm whitespace-pre-wrap pr-10" style={{ color: "var(--t-text)", fontFamily: "inherit" }}>{item.text}</pre>
                    </div>
                ))}
            </div>

            {/* ── Test Push ── */}
            <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                    <Send className="w-4 h-4 text-purple-500" />
                    ทดสอบส่งข้อความ LINE
                </h2>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--t-text-muted)" }}>LINE User ID (กด <Send className="w-3 h-3 inline" /> จากตารางด้านบนเพื่อเลือก)</label>
                        <input
                            value={testUserId}
                            onChange={(e) => setTestUserId(e.target.value)}
                            placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                        />
                    </div>
                    <div>
                        <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--t-text-muted)" }}>ข้อความ (ว่างไว้ = ส่งข้อความ default)</label>
                        <textarea
                            value={testMsg}
                            onChange={(e) => setTestMsg(e.target.value)}
                            placeholder="ทดสอบระบบแจ้งเตือน LINE OA..."
                            rows={2}
                            className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                        />
                    </div>
                    <button
                        onClick={handleTestPush}
                        disabled={sending || !testUserId.trim()}
                        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
                        style={{ background: sending ? "#6B7280" : "#A855F7" }}
                    >
                        <Send className="w-4 h-4" />
                        {sending ? "กำลังส่ง..." : "ส่ง Test Push"}
                    </button>
                </div>
            </div>
        </div>
    );
}

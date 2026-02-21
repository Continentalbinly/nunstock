"use client";
import { useEffect, useState } from "react";
import { getStockSummary } from "@/lib/api";
import { Package, Layers, AlertTriangle, ShieldCheck, ArrowUpFromLine, ArrowDownToLine, TrendingDown, History } from "lucide-react";
import Link from "next/link";

const statusLabel: Record<string, string> = {
  PENDING: "รอดำเนินการ", ORDERED: "สั่งแล้ว", ARRIVED: "มาถึง", NOTIFIED: "แจ้งแล้ว", COMPLETED: "เสร็จสิ้น",
};
const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-500", ORDERED: "bg-blue-500/15 text-blue-500", ARRIVED: "bg-emerald-500/15 text-emerald-500", NOTIFIED: "bg-purple-500/15 text-purple-500", COMPLETED: "bg-emerald-500/10 text-emerald-500",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockSummary().then(setSummary).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} />
          <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "อะไหล่ทั้งหมด", value: summary?.totalParts ?? 0, icon: Package, accent: "#3B82F6", href: "/stock" },
    { label: "ประเภทอะไหล่", value: summary?.totalCategories ?? 0, icon: Layers, accent: "#A855F7", href: "/shop" },
    { label: "ของใกล้หมด", value: summary?.lowStockCount ?? 0, icon: TrendingDown, accent: "#F59E0B", href: "/stock?lowStock=true" },
    { label: "เคลมค้าง", value: summary?.pendingClaimsCount ?? 0, icon: ShieldCheck, accent: "#22C55E", href: "/claims" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>แดชบอร์ด</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ภาพรวมคลังอะไหล่ร้านซ่อมรถยนต์</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link href={s.href} key={s.label} className="block rounded-xl p-5 transition-all cursor-pointer hover:shadow-lg" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: `2px solid ${s.accent}` }}>
            <div className="mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${s.accent}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.accent }} />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: "var(--t-text)" }}>{s.value}</div>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold" style={{ color: "var(--t-text)" }}>อะไหล่ใกล้หมด</h2>
          </div>
          {!summary?.lowStockParts?.length ? (
            <div className="text-center py-8"><ShieldCheck className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">สต็อกปกติทั้งหมด</p></div>
          ) : (
            <div className="space-y-1">
              {summary.lowStockParts.slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors" style={{ ["--hover-bg" as any]: "var(--t-hover-overlay)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.name}</p>
                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{p.code} • {p.category?.name}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-500 font-medium">เหลือ {p.quantity} {p.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Claims */}
        <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold" style={{ color: "var(--t-text)" }}>เคลมค้างดำเนินการ</h2>
          </div>
          {!summary?.pendingClaims?.length ? (
            <div className="text-center py-8"><ShieldCheck className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">ไม่มีเคลมค้าง</p></div>
          ) : (
            <div className="space-y-1">
              {summary.pendingClaims.slice(0, 5).map((c: any) => (
                <Link key={c.id} href="/claims" className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors cursor-pointer" onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{c.customerName}</p>
                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{c.claimNo} • {c.carBrand} {c.carModel} • {c.plateNo}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Withdrawals */}
        <div className="rounded-xl p-5 lg:col-span-2" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpFromLine className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold" style={{ color: "var(--t-text)" }}>การเบิกล่าสุด</h2>
          </div>
          {!summary?.recentWithdrawals?.length ? (
            <div className="text-center py-8"><ArrowUpFromLine className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">ยังไม่มีประวัติการเบิก</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                    {["อะไหล่", "จำนวน", "เลขงาน", "ช่าง", "วันที่"].map((h) => <th key={h} className="pb-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {summary.recentWithdrawals.map((w: any) => (
                    <tr key={w.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td className="py-3 text-sm font-medium" style={{ color: "var(--t-text)" }}>{w.part?.name}</td>
                      <td className="py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{w.quantity} {w.part?.unit}</td>
                      <td className="py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{w.jobNo || "-"}</td>
                      <td className="py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{w.techName || "-"}</td>
                      <td className="py-3 text-xs" style={{ color: "var(--t-text-muted)" }}>{new Date(w.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="rounded-xl p-5 lg:col-span-2" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-500" />
              <h2 className="font-semibold" style={{ color: "var(--t-text)" }}>ประวัติสต็อกล่าสุด</h2>
            </div>
            <Link href="/withdraw" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">ดูทั้งหมด →</Link>
          </div>
          {!summary?.recentMovements?.length ? (
            <div className="text-center py-8"><History className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">ยังไม่มีประวัติสต็อก</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                    {["ประเภท", "อะไหล่", "จำนวน", "ผู้ดำเนินการ", "วันที่"].map((h) => <th key={h} className="pb-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {summary.recentMovements.map((m: any) => {
                    const isIn = m.type === "IN";
                    return (
                      <tr key={m.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${isIn ? "bg-emerald-500/15 text-emerald-500" : "bg-orange-500/15 text-orange-500"}`}>
                            {isIn ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                            {isIn ? "เข้า" : "ออก"}
                          </span>
                        </td>
                        <td className="py-3"><p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{m.part?.name}</p><p className="font-mono text-[11px]" style={{ color: "var(--t-text-muted)" }}>{m.part?.code}</p></td>
                        <td className="py-3"><span className={`text-sm font-bold ${isIn ? "text-emerald-500" : "text-orange-500"}`}>{isIn ? "+" : "-"}{m.quantity}</span><span className="text-xs ml-1" style={{ color: "var(--t-text-dim)" }}>{m.part?.unit}</span></td>
                        <td className="py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{m.user?.name || "-"}</td>
                        <td className="py-3 text-xs" style={{ color: "var(--t-text-muted)" }}>{new Date(m.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

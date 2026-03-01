"use client";
import { useEffect, useState } from "react";
import { getStockSummary } from "@/lib/api";
import { Package, Layers, AlertTriangle, ShieldCheck, ArrowUpFromLine, ArrowDownToLine, TrendingDown, History, BarChart3, Trophy } from "lucide-react";
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
    { label: "อะไหล่ทั้งหมด", value: summary?.totalParts ?? 0, icon: Package, accent: "#3B82F6", href: "/shop" },
    { label: "จำนวนสต็อกรวม", value: summary?.totalStock ?? 0, icon: Layers, accent: "#A855F7", href: "/shop" },
    { label: "ของใกล้หมด", value: summary?.lowStockCount ?? 0, icon: TrendingDown, accent: "#F59E0B", href: "/reports?tab=lowstock" },
    { label: "เคลมค้าง", value: summary?.pendingClaimsCount ?? 0, icon: ShieldCheck, accent: "#22C55E", href: "/claims" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>แดชบอร์ด</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ภาพรวมระบบจัดการอะไหล่ นันการช่าง</p>
        </div>
        <Link href="/reports" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md cursor-pointer"
          style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", color: "var(--t-text)" }}>
          <BarChart3 className="w-4 h-4" style={{ color: "#3B82F6" }} />
          รายงานสต็อก
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Today summary mini-cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/15">
            <ArrowUpFromLine className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{summary?.todayOutCount ?? 0}</p>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>เบิกออกวันนี้</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15">
            <ArrowDownToLine className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{summary?.todayInCount ?? 0}</p>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>เพิ่มเข้าวันนี้</p>
          </div>
        </div>
      </div>

      {/* 7-Day Activity Chart */}
      {summary?.dailyChart?.length > 0 && (() => {
        const maxVal = Math.max(...summary.dailyChart.map((d: any) => Math.max(d.inQty, d.outQty)), 1);
        return (
          <div className="rounded-xl p-5 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: "#3B82F6" }} />
                <h2 className="font-semibold" style={{ color: "var(--t-text)" }}>กิจกรรม 7 วัน</h2>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />เพิ่มเข้า</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />เบิกออก</span>
              </div>
            </div>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {summary.dailyChart.map((d: any) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: 90 }}>
                    <div className="flex-1 rounded-t-sm transition-all" style={{ height: `${Math.max(2, (d.inQty / maxVal) * 100)}%`, background: "#22C55E" }} title={`เพิ่ม: ${d.inQty}`} />
                    <div className="flex-1 rounded-t-sm transition-all" style={{ height: `${Math.max(2, (d.outQty / maxVal) * 100)}%`, background: "#F97316" }} title={`เบิก: ${d.outQty}`} />
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
                <div key={p.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors" onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
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

        {/* Top Withdrawn this month */}
        <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold" style={{ color: "var(--t-text)" }}>เบิกบ่อยสุดเดือนนี้</h2>
          </div>
          {!summary?.topWithdrawn?.length ? (
            <div className="text-center py-8"><Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">ยังไม่มีรายการเบิกเดือนนี้</p></div>
          ) : (
            <div className="space-y-1">
              {summary.topWithdrawn.map((t: any, idx: number) => (
                <div key={t.partId} className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors" onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: idx < 3 ? "rgba(249,115,22,0.15)" : "var(--t-hover-overlay)", color: idx < 3 ? "#F97316" : "var(--t-text-muted)" }}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{t.part?.name}</p>
                      <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{t.part?.code}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-500 font-medium">
                    {t.totalQty} {t.part?.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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

        {/* Recent Stock Movements */}
        <div className="rounded-xl p-5" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-500" />
              <h2 className="font-semibold" style={{ color: "var(--t-text)" }}>การเบิกล่าสุด</h2>
            </div>
            <Link href="/reports" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">ดูทั้งหมด →</Link>
          </div>
          {!summary?.recentMovements?.length ? (
            <div className="text-center py-8"><History className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">ยังไม่มีประวัติสต็อก</p></div>
          ) : (
            <div className="space-y-1">
              {summary.recentMovements.slice(0, 6).map((m: any) => {
                const isIn = m.type === "IN";
                return (
                  <div key={m.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors" onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold ${isIn ? "bg-emerald-500/15 text-emerald-500" : "bg-orange-500/15 text-orange-500"}`}>
                        {isIn ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                        {isIn ? "เข้า" : "ออก"}
                      </span>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{m.part?.name}</p>
                        <p className="font-mono text-[10px]" style={{ color: "var(--t-text-muted)" }}>{m.part?.code} • {m.user?.name || "-"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${isIn ? "text-emerald-500" : "text-orange-500"}`}>{isIn ? "+" : "-"}{m.quantity}</span>
                      <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{new Date(m.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

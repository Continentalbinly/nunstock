"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, Download, Search, ArrowDownToLine, ArrowUpFromLine, Filter, CalendarDays, AlertTriangle, Package, Shield } from "lucide-react";

function formatDate(date: Date) { return date.toISOString().split("T")[0]; }

const TABS = [
    { key: "movements", label: "ประวัติสต็อก", icon: BarChart3 },
    { key: "lowstock", label: "สินค้าใกล้หมด", icon: AlertTriangle },
    { key: "audit", label: "Audit Log", icon: Shield },
];

export default function ReportsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tab = searchParams.get("tab") || "movements";

    const setTab = (t: string) => router.replace(`/reports?tab=${t}`);

    // === Movements state ===
    const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return formatDate(d); });
    const [toDate, setToDate] = useState(() => formatDate(new Date()));
    const [typeFilter, setTypeFilter] = useState<"" | "IN" | "OUT">("");
    const [searchQuery, setSearchQuery] = useState("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // === Low stock state ===
    const [lowStockParts, setLowStockParts] = useState<any[]>([]);
    const [lowStockLoading, setLowStockLoading] = useState(false);
    const [lowStockSearch, setLowStockSearch] = useState("");

    // === Audit state ===
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotalPages, setAuditTotalPages] = useState(1);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.set("from", fromDate);
            if (toDate) params.set("to", toDate);
            if (typeFilter) params.set("type", typeFilter);
            if (searchQuery) params.set("search", searchQuery);
            const res = await fetch(`/api/stock/report?${params}`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [fromDate, toDate, typeFilter, searchQuery]);

    const fetchLowStock = useCallback(async () => {
        setLowStockLoading(true);
        try {
            const res = await fetch(`/api/stock/low-stock`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setLowStockParts(json.data);
        } catch (err) { console.error(err); }
        finally { setLowStockLoading(false); }
    }, []);

    const fetchAudit = useCallback(async (page = 1) => {
        setAuditLoading(true);
        try {
            const res = await fetch(`/api/stock/audit?page=${page}&limit=30`, { credentials: "include" });
            const json = await res.json();
            if (json.success) {
                setAuditLogs(json.data.logs);
                setAuditTotalPages(json.data.totalPages);
                setAuditPage(json.data.page);
            }
        } catch (err) { console.error(err); }
        finally { setAuditLoading(false); }
    }, []);

    useEffect(() => { if (tab === "movements") fetchReport(); }, [tab, fetchReport]);
    useEffect(() => { if (tab === "lowstock") fetchLowStock(); }, [tab, fetchLowStock]);
    useEffect(() => { if (tab === "audit") fetchAudit(1); }, [tab, fetchAudit]);

    const exportMovementsCSV = () => {
        if (!data?.movements?.length) return;
        const BOM = "\uFEFF";
        const headers = ["วันที่", "เวลา", "ประเภท", "รหัส", "ชื่ออะไหล่", "คุณภาพ", "หมวดหมู่", "จำนวน", "หน่วย", "เหตุผล", "ผู้ดำเนินการ"];
        const rows = data.movements.map((m: any) => {
            const d = new Date(m.createdAt);
            return [
                d.toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" }),
                d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
                m.type === "IN" ? "เพิ่มเข้า" : "เบิกออก",
                m.part?.code || "", m.part?.name || "", m.part?.brand || "",
                m.part?.category?.name || "", m.quantity, m.part?.unit || "",
                m.reason || "", m.user?.name || "",
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
        });
        downloadCSV([headers.join(","), ...rows].join("\n"), `stock_movements_${fromDate}_${toDate}.csv`);
    };

    const exportLowStockCSV = () => {
        if (!lowStockParts.length) return;
        const headers = ["รหัส", "ชื่ออะไหล่", "คุณภาพ", "หมวดหมู่", "สต็อกเหลือ", "สต็อกขั้นต่ำ", "หน่วย", "ต้องเติม"];
        const rows = lowStockParts.map((p: any) => [
            p.code, p.name, p.brand || "", p.category?.name || "",
            p.quantity, p.minStock, p.unit, Math.max(0, p.minStock - p.quantity),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
        downloadCSV([headers.join(","), ...rows].join("\n"), `low_stock_${formatDate(new Date())}.csv`);
    };

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const summary = data?.summary || { inTotal: 0, inCount: 0, outTotal: 0, outCount: 0, netChange: 0 };
    const movements = data?.movements || [];
    const filteredLowStock = lowStockSearch
        ? lowStockParts.filter(p => p.name.toLowerCase().includes(lowStockSearch.toLowerCase()) || p.code.toLowerCase().includes(lowStockSearch.toLowerCase()))
        : lowStockParts;

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                    <BarChart3 className="w-6 h-6" style={{ color: "#3B82F6" }} />
                    รายงานสต็อก
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ดูประวัติ เบิก/เพิ่ม อะไหล่ และรายการสินค้าใกล้หมด</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                        style={{
                            background: tab === t.key ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "transparent",
                            color: tab === t.key ? "#fff" : "var(--t-text-muted)",
                            boxShadow: tab === t.key ? "0 2px 8px rgba(59,130,246,0.3)" : "none",
                        }}>
                        <t.icon className="w-4 h-4" />
                        {t.label}
                        {t.key === "lowstock" && lowStockParts.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{
                                background: tab === t.key ? "rgba(255,255,255,0.25)" : "rgba(239,68,68,0.15)",
                                color: tab === t.key ? "#fff" : "#EF4444",
                            }}>{lowStockParts.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* === Movements Tab === */}
            {tab === "movements" && (
                <>
                    {/* Filters */}
                    <div className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="flex-1 min-w-[140px]">
                            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>
                                <CalendarDays className="w-3 h-3 inline mr-1" />จากวันที่
                            </label>
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>
                                <CalendarDays className="w-3 h-3 inline mr-1" />ถึงวันที่
                            </label>
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>
                                <Filter className="w-3 h-3 inline mr-1" />ประเภท
                            </label>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                <option value="">ทั้งหมด</option>
                                <option value="OUT">เบิกออก</option>
                                <option value="IN">เพิ่มเข้า</option>
                            </select>
                        </div>
                        <div className="flex-2 min-w-[180px]">
                            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>
                                <Search className="w-3 h-3 inline mr-1" />ค้นหา
                            </label>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ชื่อหรือรหัสอะไหล่..."
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                        </div>
                        <button onClick={exportMovementsCSV} disabled={movements.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-md hover:-translate-y-0.5"
                            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}>
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-xl p-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: "2px solid #22C55E" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>เพิ่มเข้า</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-500">{summary.inTotal}</p>
                            <p className="text-[11px]" style={{ color: "var(--t-text-dim)" }}>{summary.inCount} รายการ</p>
                        </div>
                        <div className="rounded-xl p-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: "2px solid #F97316" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowUpFromLine className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>เบิกออก</span>
                            </div>
                            <p className="text-2xl font-bold text-orange-500">{summary.outTotal}</p>
                            <p className="text-[11px]" style={{ color: "var(--t-text-dim)" }}>{summary.outCount} รายการ</p>
                        </div>
                        <div className="rounded-xl p-4 col-span-2 sm:col-span-1" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: `2px solid ${summary.netChange >= 0 ? "#3B82F6" : "#EF4444"}` }}>
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="w-4 h-4" style={{ color: summary.netChange >= 0 ? "#3B82F6" : "#EF4444" }} />
                                <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>สุทธิ</span>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: summary.netChange >= 0 ? "#3B82F6" : "#EF4444" }}>
                                {summary.netChange >= 0 ? "+" : ""}{summary.netChange}
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--t-text-dim)" }}>เข้า - ออก</p>
                        </div>
                    </div>

                    {/* Movement Table */}
                    <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="p-4" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                            <h2 className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>รายการทั้งหมด ({movements.length})</h2>
                        </div>
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#3B82F6" }} />
                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p>
                            </div>
                        ) : movements.length === 0 ? (
                            <div className="p-8 text-center">
                                <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ไม่พบรายการในช่วงเวลาที่เลือก</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                            {["ประเภท", "วันที่/เวลา", "รหัส", "ชื่ออะไหล่", "จำนวน", "เหตุผล", "ผู้ดำเนินการ"].map(h => (
                                                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map((m: any) => {
                                            const isIn = m.type === "IN";
                                            const d = new Date(m.createdAt);
                                            return (
                                                <tr key={m.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold ${isIn ? "bg-emerald-500/15 text-emerald-500" : "bg-orange-500/15 text-orange-500"}`}>
                                                            {isIn ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                                                            {isIn ? "เข้า" : "ออก"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm" style={{ color: "var(--t-text)" }}>{d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" })}</p>
                                                        <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{m.part?.code}</td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{m.part?.name}</p>
                                                        {m.part?.brand && <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>{m.part.brand}</p>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-sm font-bold ${isIn ? "text-emerald-500" : "text-orange-500"}`}>{isIn ? "+" : "-"}{m.quantity}</span>
                                                        <span className="text-[10px] ml-1" style={{ color: "var(--t-text-dim)" }}>{m.part?.unit}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs" style={{ color: "var(--t-text-secondary)" }}>{m.reason || "-"}</td>
                                                    <td className="px-4 py-3 text-xs" style={{ color: "var(--t-text-secondary)" }}>{m.user?.name || "-"}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* === Low Stock Tab === */}
            {tab === "lowstock" && (
                <>
                    {/* Filters */}
                    <div className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}>
                                <Search className="w-3 h-3 inline mr-1" />ค้นหา
                            </label>
                            <input type="text" value={lowStockSearch} onChange={(e) => setLowStockSearch(e.target.value)} placeholder="ชื่อหรือรหัสอะไหล่..."
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                        </div>
                        <button onClick={exportLowStockCSV} disabled={filteredLowStock.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-md hover:-translate-y-0.5"
                            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}>
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>

                    {/* Summary banner */}
                    <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-red-500">สินค้าใกล้หมด {filteredLowStock.length} รายการ</p>
                            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>รายการที่มีจำนวนสต็อกเท่ากับหรือต่ำกว่าสต็อกขั้นต่ำที่กำหนด</p>
                        </div>
                    </div>

                    {/* Low Stock Table */}
                    <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        {lowStockLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#EF4444" }} />
                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p>
                            </div>
                        ) : filteredLowStock.length === 0 ? (
                            <div className="p-8 text-center">
                                <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                                <p className="text-sm font-medium" style={{ color: "var(--t-text-muted)" }}>
                                    {lowStockParts.length === 0 ? "สต็อกปกติทั้งหมด ไม่มีสินค้าใกล้หมด 🎉" : "ไม่พบรายการที่ค้นหา"}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                            {["รหัส", "ชื่ออะไหล่", "หมวดหมู่", "สต็อกเหลือ", "สต็อกต่ำสุด", "ต้องเติม"].map(h => (
                                                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLowStock.map((p: any) => {
                                            const deficit = Math.max(0, p.minStock - p.quantity);
                                            const pct = p.minStock > 0 ? (p.quantity / p.minStock) * 100 : 100;
                                            const severity = pct <= 25 ? "text-red-500 bg-red-500/15" : pct <= 75 ? "text-amber-500 bg-amber-500/15" : "text-orange-500 bg-orange-500/15";
                                            return (
                                                <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{p.code}</td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.name}</p>
                                                        {p.brand && <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>{p.brand}</p>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs" style={{ color: "var(--t-text-muted)" }}>{p.category?.name || "-"}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${severity}`}>
                                                            {p.quantity} {p.unit}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{p.minStock} {p.unit}</td>
                                                    <td className="px-4 py-3">
                                                        {deficit > 0 ? (
                                                            <span className="text-sm font-bold text-red-500">+{deficit} {p.unit}</span>
                                                        ) : (
                                                            <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* === Audit Tab === */}
            {tab === "audit" && (
                <>
                    <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                                <Shield className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                                บันทึกการดำเนินการ
                            </h2>
                        </div>
                        {auditLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} />
                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p>
                            </div>
                        ) : auditLogs.length === 0 ? (
                            <div className="p-8 text-center">
                                <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีบันทึกการดำเนินการ</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                            {["วันที่/เวลา", "ผู้ดำเนินการ", "การดำเนินการ", "รายละเอียด"].map(h => (
                                                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map((log: any) => {
                                            const d = new Date(log.createdAt);
                                            const actionColors: Record<string, string> = {
                                                BATCH_OUT: "bg-orange-500/15 text-orange-500",
                                                BATCH_IN: "bg-emerald-500/15 text-emerald-500",
                                                CREATE_PART: "bg-blue-500/15 text-blue-500",
                                                DELETE_PART: "bg-red-500/15 text-red-500",
                                                UPDATE_PART: "bg-purple-500/15 text-purple-500",
                                            };
                                            const actionLabels: Record<string, string> = {
                                                BATCH_OUT: "เบิกอะไหล่",
                                                BATCH_IN: "เพิ่มสต็อก",
                                                CREATE_PART: "สร้างอะไหล่",
                                                DELETE_PART: "ลบอะไหล่",
                                                UPDATE_PART: "แก้ไขอะไหล่",
                                            };
                                            let details = "";
                                            try {
                                                const parsed = JSON.parse(log.details || "{}");
                                                if (parsed.items) details = parsed.items.map((i: any) => `${i.name || i.partId} x${i.qty}`).join(", ");
                                                if (parsed.reason) details += ` (${parsed.reason})`;
                                            } catch { details = log.details || "-"; }
                                            return (
                                                <tr key={log.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm" style={{ color: "var(--t-text)" }}>{d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" })}</p>
                                                        <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>{log.user?.name || "-"}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center text-[10px] px-2 py-1 rounded-full font-semibold ${actionColors[log.action] || "bg-gray-500/15 text-gray-500"}`}>
                                                            {actionLabels[log.action] || log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--t-text-muted)" }}>{details}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* Pagination */}
                        {auditTotalPages > 1 && (
                            <div className="p-3 flex items-center justify-center gap-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                                <button onClick={() => fetchAudit(auditPage - 1)} disabled={auditPage <= 1}
                                    className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>← ก่อนหน้า</button>
                                <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{auditPage} / {auditTotalPages}</span>
                                <button onClick={() => fetchAudit(auditPage + 1)} disabled={auditPage >= auditTotalPages}
                                    className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text)" }}>ถัดไป →</button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

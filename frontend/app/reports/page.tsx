"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, Download, Search, ArrowDownToLine, ArrowUpFromLine, Filter, CalendarDays, AlertTriangle, Package, Shield, Wrench, Car, Briefcase, ExternalLink, Droplets, User, Palette, Printer, Truck, Lock, FileText, StickyNote, CalendarRange } from "lucide-react";

function formatDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function formatMonth(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }

const TABS = [
    { key: "jobs", label: "Jobs", icon: Briefcase },
    { key: "movements", label: "ประวัติสต็อก", icon: BarChart3 },
    { key: "lowstock", label: "วัสดุใกล้หมด", icon: AlertTriangle },
    { key: "consumables", label: "ประวัติเบิกวัสดุ", icon: Droplets },
    { key: "paints", label: "ประวัติเบิกสี", icon: Palette },
    { key: "audit", label: "Audit Log", icon: Shield },
];

const JOB_STATUS_MAP: Record<string, { label: string; color: string }> = {
    WAITING_PARTS: { label: "รออะไหล่", color: "#F59E0B" },
    RECEIVED: { label: "รับรถ", color: "#F97316" },
    IN_PROGRESS: { label: "กำลังซ่อม", color: "#8B5CF6" },
    COMPLETED: { label: "ซ่อมเสร็จ", color: "#22C55E" },
    DELIVERED: { label: "ส่งมอบ", color: "#3B82F6" },
    CLOSED: { label: "ปิดงาน", color: "#6B7280" },
    CANCELLED: { label: "ยกเลิก", color: "#EF4444" },
};

export default function ReportsPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
                    <p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        }>
            <ReportsPageInner />
        </Suspense>
    );
}

function ReportsPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tab = searchParams.get("tab") || "jobs";

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

    // === Jobs report state ===
    const [jobsData, setJobsData] = useState<any>(null);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [jobsStatusFilter, setJobsStatusFilter] = useState("");
    const [jobsTypeFilter, setJobsTypeFilter] = useState("");
    const [jobsSearch, setJobsSearch] = useState("");
    const [jobsDate, setJobsDate] = useState(() => formatDate(new Date()));

    // === Consumable history state ===
    const [consumData, setConsumData] = useState<any>(null);
    const [consumLoading, setConsumLoading] = useState(false);
    const [consumSearch, setConsumSearch] = useState("");
    const [consumFrom, setConsumFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return formatDate(d); });
    const [consumTo, setConsumTo] = useState(() => formatDate(new Date()));

    // === Audit state ===
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotalPages, setAuditTotalPages] = useState(1);

    // === Paint history state ===
    const [paintData, setPaintData] = useState<any>(null);
    const [paintLoading, setPaintLoading] = useState(false);
    const [paintSearch, setPaintSearch] = useState("");
    const [paintFrom, setPaintFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return formatDate(d); });
    const [paintTo, setPaintTo] = useState(() => formatDate(new Date()));

    // === Daily summary state ===
    const [dailySummary, setDailySummary] = useState<any>(null);
    const [dailyLoading, setDailyLoading] = useState(false);

    // === Report type & Weekly/Monthly state ===
    const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily");
    const [weeklySummary, setWeeklySummary] = useState<any>(null);
    const [weeklyLoading, setWeeklyLoading] = useState(false);
    const [monthlySummary, setMonthlySummary] = useState<any>(null);
    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [monthlyMonth, setMonthlyMonth] = useState(() => formatMonth(new Date()));

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

    const fetchJobsReport = useCallback(async () => {
        setJobsLoading(true);
        try {
            const params = new URLSearchParams();
            if (jobsDate) { params.set("from", jobsDate); params.set("to", jobsDate); }
            if (jobsStatusFilter) params.set("status", jobsStatusFilter);
            if (jobsTypeFilter) params.set("type", jobsTypeFilter);
            if (jobsSearch) params.set("search", jobsSearch);
            const res = await fetch(`/api/stock/jobs-report?${params}`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setJobsData(json.data);
        } catch (err) { console.error(err); }
        finally { setJobsLoading(false); }
    }, [jobsDate, jobsStatusFilter, jobsTypeFilter, jobsSearch]);

    const fetchConsumHistory = useCallback(async () => {
        setConsumLoading(true);
        try {
            const params = new URLSearchParams();
            if (consumFrom) params.set("from", consumFrom);
            if (consumTo) params.set("to", consumTo);
            if (consumSearch) params.set("search", consumSearch);
            const res = await fetch(`/api/stock/consumable-history?${params}`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setConsumData(json.data);
        } catch (err) { console.error(err); }
        finally { setConsumLoading(false); }
    }, [consumFrom, consumTo, consumSearch]);

    useEffect(() => { if (tab === "movements") fetchReport(); }, [tab, fetchReport]);
    useEffect(() => { if (tab === "lowstock") fetchLowStock(); }, [tab, fetchLowStock]);
    useEffect(() => { if (tab === "audit") fetchAudit(1); }, [tab, fetchAudit]);
    useEffect(() => { if (tab === "jobs") { fetchJobsReport(); fetchLowStock(); } }, [tab, fetchJobsReport, fetchLowStock]);
    useEffect(() => { if (tab === "consumables") fetchConsumHistory(); }, [tab, fetchConsumHistory]);

    const fetchPaintHistory = useCallback(async () => {
        setPaintLoading(true);
        try {
            const params = new URLSearchParams();
            if (paintFrom) params.set("from", paintFrom);
            if (paintTo) params.set("to", paintTo);
            if (paintSearch) params.set("search", paintSearch);
            const res = await fetch(`/api/stock/paint-history?${params}`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setPaintData(json.data);
        } catch (err) { console.error(err); }
        finally { setPaintLoading(false); }
    }, [paintFrom, paintTo, paintSearch]);

    useEffect(() => { if (tab === "paints") fetchPaintHistory(); }, [tab, fetchPaintHistory]);

    const fetchDailySummary = useCallback(async () => {
        setDailyLoading(true);
        try {
            const res = await fetch(`/api/stock/daily-summary?date=${jobsDate}`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setDailySummary(json.data);
        } catch (err) { console.error(err); }
        finally { setDailyLoading(false); }
    }, [jobsDate]);

    useEffect(() => { if (tab === "jobs" && reportType === "daily") fetchDailySummary(); }, [tab, jobsDate, reportType]);

    const fetchWeeklySummary = useCallback(async () => {
        setWeeklyLoading(true);
        try {
            const res = await fetch(`/api/stock/weekly-summary?date=${jobsDate}`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setWeeklySummary(json.data);
        } catch (err) { console.error(err); }
        finally { setWeeklyLoading(false); }
    }, [jobsDate]);

    useEffect(() => { if (tab === "jobs" && reportType === "weekly") fetchWeeklySummary(); }, [tab, jobsDate, reportType]);

    const fetchMonthlySummary = useCallback(async () => {
        setMonthlyLoading(true);
        try {
            const res = await fetch(`/api/stock/monthly-summary?month=${monthlyMonth}`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setMonthlySummary(json.data);
        } catch (err) { console.error(err); }
        finally { setMonthlyLoading(false); }
    }, [monthlyMonth]);

    useEffect(() => { if (tab === "jobs" && reportType === "monthly") fetchMonthlySummary(); }, [tab, monthlyMonth, reportType]);

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
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
            {/* Print-only styles */}
            <style>{`
                @media print {
                    @page { size: A4; margin: 15mm; }
                    body, html { background: white !important; color: black !important; }
                    nav, .no-print, .sidebar { display: none !important; }
                    .print-only { display: block !important; }
                    .screen-only { display: none !important; }
                    .print-section { page-break-inside: avoid; }
                    * { color: black !important; background: white !important; border-color: #ddd !important; box-shadow: none !important; }
                }
                .print-only { display: none; }
            `}</style>

            {/* Header */}
            <div className="mb-6 screen-only">
                <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                    <BarChart3 className="w-6 h-6" style={{ color: "#F97316" }} />
                    สรุปรายงาน
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ภาพรวมงานซ่อม สต็อก วัสดุสิ้นเปลือง และสี</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit max-w-full overflow-x-auto no-print" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer shrink-0 w-fit whitespace-nowrap"
                        style={{
                            background: tab === t.key ? "linear-gradient(135deg, #F97316, #EA580C)" : "transparent",
                            color: tab === t.key ? "#fff" : "var(--t-text-muted)",
                            boxShadow: tab === t.key ? "0 2px 8px rgba(249,115,22,0.3)" : "none",
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

            {/* === Jobs Tab === */}
            {tab === "jobs" && (
                <>
                    {/* ──── Overview + Filter (screen only) ──── */}
                    <div className="screen-only">
                        {jobsLoading ? (
                            <div className="p-8 text-center"><div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} /><p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p></div>
                        ) : jobsData ? (
                            <div>
                                {/* Hero Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #F97316, #EA580C)" }} />
                                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}><Briefcase className="w-5 h-5" style={{ color: "#F97316" }} /></div><div><p className="text-[11px] font-medium" style={{ color: "var(--t-text-muted)" }}>Jobs ทั้งหมด</p><p className="text-2xl font-bold" style={{ color: "#F97316" }}>{Object.values(jobsData.statusCounts || {}).reduce((a: number, b: any) => a + (b as number), 0)}</p></div></div>
                                    </div>
                                    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #3B82F6, #2563EB)" }} />
                                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}><Package className="w-5 h-5" style={{ color: "#3B82F6" }} /></div><div><p className="text-[11px] font-medium" style={{ color: "var(--t-text-muted)" }}>อะไหล่ใช้เดือนนี้</p><p className="text-2xl font-bold" style={{ color: "#3B82F6" }}>{jobsData.partsUsedThisMonth || 0}</p></div></div>
                                    </div>
                                    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #EF4444, #DC2626)" }} />
                                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} /></div><div><p className="text-[11px] font-medium" style={{ color: "var(--t-text-muted)" }}>วัสดุใกล้หมด</p><p className="text-2xl font-bold" style={{ color: "#EF4444" }}>{lowStockParts.length}</p></div></div>
                                    </div>
                                </div>
                                {/* Filter Bar */}
                                <div className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                    <div className="flex-1 min-w-[140px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><CalendarDays className="w-3 h-3 inline mr-1" />วันที่</label><input type="date" value={jobsDate} onChange={e => setJobsDate(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                                    <div className="flex-1 min-w-[110px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><Filter className="w-3 h-3 inline mr-1" />สถานะ</label>
                                        <select value={jobsStatusFilter} onChange={e => setJobsStatusFilter(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                            <option value="">ทั้งหมด</option>{Object.entries(JOB_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[100px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><Car className="w-3 h-3 inline mr-1" />ประเภท</label>
                                        <select value={jobsTypeFilter} onChange={e => setJobsTypeFilter(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                            <option value="">ทั้งหมด</option><option value="INSURANCE">ประกัน</option><option value="CASH">หน้าร้าน</option>
                                        </select>
                                    </div>
                                    <div className="flex-2 min-w-[150px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><Search className="w-3 h-3 inline mr-1" />ค้นหา</label><input type="text" value={jobsSearch} onChange={e => setJobsSearch(e.target.value)} placeholder="Job, ลูกค้า, ทะเบียน..." className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                                    <button onClick={() => {
                                        if (!jobsData?.jobs?.length) return;
                                        const headers = ["เลข Job", "ประเภท", "สถานะ", "ลูกค้า", "เบอร์", "รถ", "ทะเบียน", "อะไหล่", "วันที่สร้าง"];
                                        const rows = jobsData.jobs.map((j: any) => [j.jobNo, j.type === "INSURANCE" ? "ประกัน" : "หน้าร้าน", JOB_STATUS_MAP[j.status]?.label || j.status, j.customerName, j.customerPhone, `${j.carBrand} ${j.carModel}`, j.plateNo, j._count?.parts || 0, new Date(j.createdAt).toLocaleDateString("th-TH")].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
                                        downloadCSV([headers.join(","), ...rows].join("\n"), `jobs_report_${jobsDate}.csv`);
                                    }} disabled={!jobsData?.jobs?.length} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-md hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}><Download className="w-4 h-4" />Export</button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* ──── Report Type Selector (printable) ──── */}
                    <div className="rounded-xl mb-4 p-3 flex flex-wrap items-center gap-2 overflow-x-auto no-print" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <FileText className="w-4 h-4 shrink-0" style={{ color: "#F97316" }} />
                        <span className="text-xs font-bold mr-2" style={{ color: "var(--t-text)" }}>สรุปรายงาน</span>
                        {([["daily", "รายวัน"], ["weekly", "รายสัปดาห์"], ["monthly", "รายเดือน"]] as const).map(([key, label]) => (
                            <button key={key} onClick={() => setReportType(key)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                                style={{
                                    background: reportType === key ? "linear-gradient(135deg, #F97316, #EA580C)" : "var(--t-input-bg)",
                                    color: reportType === key ? "white" : "var(--t-text-muted)",
                                    border: reportType === key ? "none" : "1px solid var(--t-border-subtle)",
                                    boxShadow: reportType === key ? "0 2px 8px rgba(249,115,22,0.3)" : "none",
                                }}>{label}</button>
                        ))}
                        {/* Date picker adapts to mode */}
                        <div className="ml-auto flex items-center gap-2">
                            {reportType === "monthly" ? (
                                <div className="flex items-center gap-1">
                                    <select value={monthlyMonth.split("-")[1]} onChange={e => setMonthlyMonth(`${monthlyMonth.split("-")[0]}-${e.target.value}`)}
                                        className="rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer"
                                        style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                        {["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"].map((m, i) => (
                                            <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                                        ))}
                                    </select>
                                    <select value={monthlyMonth.split("-")[0]} onChange={e => setMonthlyMonth(`${e.target.value}-${monthlyMonth.split("-")[1]}`)}
                                        className="rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer"
                                        style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                            <option key={y} value={y}>{y + 543}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <input type="date" value={jobsDate} onChange={e => setJobsDate(e.target.value)}
                                    className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                                    style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                            )}
                            <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 2px 8px rgba(249,115,22,0.3)" }}>
                                <Printer className="w-3 h-3" /> ปริ้น
                            </button>
                        </div>
                    </div>

                    {/* ──── DAILY Summary ──── */}
                    {reportType === "daily" && (
                        <div className="rounded-xl mb-6 overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="p-4 flex items-center gap-2 no-print" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                                    <FileText className="w-4 h-4" style={{ color: "#F97316" }} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>สรุปรายวัน</h2>
                                    <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>{new Date(jobsDate + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                                </div>
                            </div>
                            <div className="print-only text-center py-4" style={{ borderBottom: "2px solid black" }}>
                                <h1 style={{ fontSize: 18, fontWeight: "bold" }}>สรุปรายงานประจำวัน</h1>
                                <p style={{ fontSize: 13, marginTop: 4 }}>{new Date(jobsDate + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                            </div>
                            {dailyLoading ? (
                                <div className="p-8 text-center"><div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} /></div>
                            ) : dailySummary ? (
                                <div className="p-4 space-y-4">
                                    {[
                                        { key: "received", title: "รถจอด (รับรถ)", icon: Car, color: "#F97316", items: dailySummary.received },
                                        { key: "delivered", title: "รถออก (ส่งมอบ)", icon: Truck, color: "#3B82F6", items: dailySummary.delivered },
                                        { key: "claimCalled", title: "รถแจ้งเคลม", icon: FileText, color: "#8B5CF6", items: dailySummary.claimCalled },
                                        { key: "closed", title: "ปิดงาน", icon: Lock, color: "#6B7280", items: dailySummary.closed },
                                    ].map(({ key, title, icon: Icon, color, items }) => (
                                        <div key={key} className="print-section">
                                            <div className="flex items-center gap-2 mb-1.5 pb-1" style={{ borderBottom: `2px solid ${color}` }}>
                                                <Icon className="w-4 h-4" style={{ color }} />
                                                <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{title}</span>
                                                <span className="text-xs font-bold ml-auto" style={{ color }}>{items.length} คัน</span>
                                            </div>
                                            {items.length === 0 ? (
                                                <p className="text-xs py-1 pl-6" style={{ color: "var(--t-text-dim)" }}>— ไม่มี —</p>
                                            ) : (
                                                <div className="overflow-x-auto"><table className="w-full text-xs">
                                                    <thead><tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                                        <th className="py-1 w-8 text-center font-medium" style={{ color: "var(--t-text-muted)" }}>#</th>
                                                        <th className="py-1 text-left font-medium" style={{ color: "var(--t-text-muted)" }}>รุ่นรถ</th>
                                                        <th className="py-1 text-left font-medium" style={{ color: "var(--t-text-muted)" }}>ทะเบียน</th>
                                                        <th className="py-1 text-left font-medium" style={{ color: "var(--t-text-muted)" }}>ประกัน/ประเภท</th>
                                                    </tr></thead>
                                                    <tbody>{items.map((item: any, i: number) => (
                                                        <tr key={`${key}-${i}`} style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                                            <td className="py-1.5 text-center font-medium" style={{ color: "var(--t-text)" }}>{i + 1}</td>
                                                            <td className="py-1.5 font-medium" style={{ color: "var(--t-text)" }}>{item.carBrand} {item.carModel}</td>
                                                            <td className="py-1.5" style={{ color: "var(--t-text-muted)" }}>{item.plateNo}</td>
                                                            <td className="py-1.5" style={{ color: "var(--t-text-muted)" }}>{item.insuranceComp}</td>
                                                        </tr>
                                                    ))}</tbody>
                                                </table></div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="print-section">
                                        <div className="flex items-center gap-2 mb-1.5 pb-1" style={{ borderBottom: "2px solid #F59E0B" }}>
                                            <StickyNote className="w-4 h-4" style={{ color: "#F59E0B" }} />
                                            <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>หมายเหตุ</span>
                                            <span className="text-xs font-bold ml-auto" style={{ color: "#F59E0B" }}>{dailySummary.notes.length} รายการ</span>
                                        </div>
                                        {dailySummary.notes.length === 0 ? (
                                            <p className="text-xs py-1 pl-6" style={{ color: "var(--t-text-dim)" }}>— ไม่มี —</p>
                                        ) : (
                                            <div className="space-y-1">{dailySummary.notes.map((n: any, i: number) => (
                                                <div key={i} className="flex gap-2 py-1" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                                    <span className="text-xs font-medium w-5 text-center shrink-0" style={{ color: "var(--t-text)" }}>{i + 1}.</span>
                                                    <div>
                                                        <span className="text-xs font-medium" style={{ color: "var(--t-text)" }}>{n.carBrand} {n.carModel}</span>
                                                        <span className="text-xs mx-1" style={{ color: "var(--t-text-dim)" }}>•</span>
                                                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{n.plateNo}</span>
                                                        <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{n.note}</p>
                                                    </div>
                                                </div>
                                            ))}</div>
                                        )}
                                    </div>
                                    <div className="print-only text-center text-xs pt-4" style={{ borderTop: "1px solid #ddd", color: "#999" }}>
                                        ปริ้นจากระบบ NunStock • {new Date().toLocaleString("th-TH")}
                                    </div>
                                </div>
                            ) : <div className="p-4 text-center text-sm" style={{ color: "var(--t-text-dim)" }}>ไม่สามารถโหลดข้อมูลได้</div>}
                        </div>
                    )}

                    {/* ──── WEEKLY Summary ──── */}
                    {reportType === "weekly" && (
                        <div className="rounded-xl mb-6 overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="p-4 flex items-center gap-2 no-print" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                                    <CalendarRange className="w-4 h-4" style={{ color: "#3B82F6" }} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>สรุปรายสัปดาห์</h2>
                                    {weeklySummary && <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>
                                        {new Date(weeklySummary.weekStart + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })} — {new Date(weeklySummary.weekEnd + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>}
                                </div>
                            </div>
                            <div className="print-only text-center py-4" style={{ borderBottom: "2px solid black" }}>
                                <h1 style={{ fontSize: 18, fontWeight: "bold" }}>สรุปรถเข้า-ออกประจำสัปดาห์</h1>
                                {weeklySummary && <p style={{ fontSize: 13, marginTop: 4 }}>
                                    {new Date(weeklySummary.weekStart + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long" })} — {new Date(weeklySummary.weekEnd + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                                </p>}
                            </div>
                            {weeklyLoading ? (
                                <div className="p-8 text-center"><div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--t-border)", borderTopColor: "#3B82F6" }} /></div>
                            ) : weeklySummary ? (
                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr style={{ borderBottom: "2px solid var(--t-border)" }}>
                                                <th rowSpan={2} className="py-2 px-2 text-left font-bold" style={{ color: "var(--t-text)", minWidth: 70 }}>วันที่</th>
                                                <th colSpan={weeklySummary.companies.length + 1} className="py-1 px-1 text-center font-bold" style={{ color: "#F97316", borderBottom: "1px solid var(--t-border-subtle)" }}>รับเข้า</th>
                                                <th colSpan={weeklySummary.companies.length + 1} className="py-1 px-1 text-center font-bold" style={{ color: "#3B82F6", borderBottom: "1px solid var(--t-border-subtle)" }}>ส่งออก</th>
                                            </tr>
                                            <tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                                {weeklySummary.companies.map((co: string) => <th key={`r-${co}`} className="py-1 px-1 text-center font-medium" style={{ color: "var(--t-text-muted)", minWidth: 40 }}>{co.replace("บ.", "").substring(0, 6)}</th>)}
                                                <th className="py-1 px-1 text-center font-bold" style={{ color: "#F97316" }}>รวม</th>
                                                {weeklySummary.companies.map((co: string) => <th key={`d-${co}`} className="py-1 px-1 text-center font-medium" style={{ color: "var(--t-text-muted)", minWidth: 40 }}>{co.replace("บ.", "").substring(0, 6)}</th>)}
                                                <th className="py-1 px-1 text-center font-bold" style={{ color: "#3B82F6" }}>รวม</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {weeklySummary.days.map((day: any) => (
                                                <tr key={day.date} style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                                    <td className="py-1.5 px-2 font-medium" style={{ color: "var(--t-text)" }}>
                                                        {day.dayName} {new Date(day.date + "T00:00:00").getDate()}
                                                    </td>
                                                    {weeklySummary.companies.map((co: string) => <td key={`r-${co}`} className="py-1.5 px-1 text-center" style={{ color: day.received.byCompany[co] ? "var(--t-text)" : "var(--t-text-dim)" }}>{day.received.byCompany[co] || "-"}</td>)}
                                                    <td className="py-1.5 px-1 text-center font-bold" style={{ color: "#F97316" }}>{day.received.total || "-"}</td>
                                                    {weeklySummary.companies.map((co: string) => <td key={`d-${co}`} className="py-1.5 px-1 text-center" style={{ color: day.delivered.byCompany[co] ? "var(--t-text)" : "var(--t-text-dim)" }}>{day.delivered.byCompany[co] || "-"}</td>)}
                                                    <td className="py-1.5 px-1 text-center font-bold" style={{ color: "#3B82F6" }}>{day.delivered.total || "-"}</td>
                                                </tr>
                                            ))}
                                            <tr style={{ borderTop: "2px solid var(--t-border)" }}>
                                                <td className="py-2 px-2 font-bold" style={{ color: "var(--t-text)" }}>รวม</td>
                                                {weeklySummary.companies.map((co: string) => <td key={`tr-${co}`} className="py-2 px-1 text-center font-bold" style={{ color: "var(--t-text)" }}>{weeklySummary.totals.received.byCompany[co] || "-"}</td>)}
                                                <td className="py-2 px-1 text-center font-bold" style={{ color: "#F97316" }}>{weeklySummary.totals.received.total}</td>
                                                {weeklySummary.companies.map((co: string) => <td key={`td-${co}`} className="py-2 px-1 text-center font-bold" style={{ color: "var(--t-text)" }}>{weeklySummary.totals.delivered.byCompany[co] || "-"}</td>)}
                                                <td className="py-2 px-1 text-center font-bold" style={{ color: "#3B82F6" }}>{weeklySummary.totals.delivered.total}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="print-only text-center text-xs pt-4 mt-4" style={{ borderTop: "1px solid #ddd", color: "#999" }}>
                                        ปริ้นจากระบบ NunStock • {new Date().toLocaleString("th-TH")}
                                    </div>
                                </div>
                            ) : <div className="p-4 text-center text-sm" style={{ color: "var(--t-text-dim)" }}>ไม่สามารถโหลดข้อมูลได้</div>}
                        </div>
                    )}

                    {/* ──── MONTHLY Summary ──── */}
                    {reportType === "monthly" && (
                        <div className="rounded-xl mb-6 overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="p-4 flex items-center gap-2 no-print" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                                    <CalendarDays className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>สรุปรายเดือน</h2>
                                    {monthlySummary && <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>เดือน {monthlySummary.monthLabel}</p>}
                                </div>
                            </div>
                            <div className="print-only text-center py-4" style={{ borderBottom: "2px solid black" }}>
                                <h1 style={{ fontSize: 18, fontWeight: "bold" }}>สรุปรถเข้า-ออก ประจำเดือน</h1>
                                {monthlySummary && <p style={{ fontSize: 13, marginTop: 4 }}>เดือน {monthlySummary.monthLabel}</p>}
                            </div>
                            {monthlyLoading ? (
                                <div className="p-8 text-center"><div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} /></div>
                            ) : monthlySummary ? (
                                <div className="p-4 space-y-6">
                                    {[
                                        { key: "received", title: "รถเข้าซ่อม", color: "#F97316", data: monthlySummary.received },
                                        { key: "delivered", title: "รถออก", color: "#3B82F6", data: monthlySummary.delivered },
                                        { key: "claimCalled", title: "รถมาเคลม", color: "#8B5CF6", data: monthlySummary.claimCalled },
                                    ].map(({ key, title, color, data }) => (
                                        <div key={key} className="print-section">
                                            <div className="flex items-center gap-2 mb-3 pb-1" style={{ borderBottom: `2px solid ${color}` }}>
                                                <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{title} ทั้งหมด</span>
                                                <span className="text-lg font-bold ml-1" style={{ color }}>{data.total}</span>
                                                <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>คัน</span>
                                            </div>
                                            {data.total === 0 ? (
                                                <p className="text-xs py-1 pl-4" style={{ color: "var(--t-text-dim)" }}>— ไม่มี —</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-1 pl-2">
                                                    {monthlySummary.companies.map((co: string) => {
                                                        const count = data.byCompany[co] || 0;
                                                        if (count === 0) return null;
                                                        return (
                                                            <div key={co} className="flex items-center gap-2 py-0.5">
                                                                <span className="text-xs" style={{ color: "var(--t-text)" }}>✓ {co}</span>
                                                                <span className="text-xs font-bold ml-auto" style={{ color }}>{count} คัน</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="print-only text-center text-xs pt-4" style={{ borderTop: "1px solid #ddd", color: "#999" }}>
                                        ปริ้นจากระบบ NunStock • {new Date().toLocaleString("th-TH")}
                                    </div>
                                </div>
                            ) : <div className="p-4 text-center text-sm" style={{ color: "var(--t-text-dim)" }}>ไม่สามารถโหลดข้อมูลได้</div>}
                        </div>
                    )}

                    {/* ──── Jobs Table (screen only) ──── */}
                    <div className="screen-only">
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="p-4" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                <h2 className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Jobs ทั้งหมด ({jobsData?.totalJobs || 0})</h2>
                            </div>
                            {jobsLoading ? (
                                <div className="p-8 text-center"><div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} /></div>
                            ) : !jobsData?.jobs?.length ? (
                                <div className="p-8 text-center"><Wrench className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ไม่พบ Jobs ในช่วงเวลาที่เลือก</p></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead><tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                            {["เลข Job", "ประเภท", "ลูกค้า", "รถ", "สถานะ", "อะไหล่", "วันที่"].map(h => <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>)}
                                        </tr></thead>
                                        <tbody>
                                            {jobsData.jobs.map((j: any) => {
                                                const st = JOB_STATUS_MAP[j.status];
                                                return (
                                                    <tr key={j.id} className="transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                                        onClick={() => router.push(`/jobs/${j.id}`)}
                                                        onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                        <td className="px-4 py-3 text-sm font-bold" style={{ color: "#F97316" }}>{j.jobNo}</td>
                                                        <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${j.type === "INSURANCE" ? "bg-orange-500/15 text-orange-500" : "bg-emerald-500/15 text-emerald-500"}`}>{j.type === "INSURANCE" ? "ประกัน" : "หน้าร้าน"}</span></td>
                                                        <td className="px-4 py-3"><p className="text-sm" style={{ color: "var(--t-text)" }}>{j.customerName}</p><p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>{j.customerPhone}</p></td>
                                                        <td className="px-4 py-3 text-xs" style={{ color: "var(--t-text-secondary)" }}>{j.carBrand} {j.carModel}<br /><span style={{ color: "var(--t-text-dim)" }}>{j.plateNo}</span></td>
                                                        <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${st?.color}18`, color: st?.color }}>{st?.label}</span></td>
                                                        <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--t-text)" }}>{j._count?.parts || 0}</td>
                                                        <td className="px-4 py-3 text-xs" style={{ color: "var(--t-text-muted)" }}>{new Date(j.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )
            }

            {/* === Movements Tab === */}
            {
                tab === "movements" && (
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
                            <div className="rounded-xl p-4 col-span-2 sm:col-span-1" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: `2px solid ${summary.netChange >= 0 ? "#F97316" : "#EF4444"}` }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="w-4 h-4" style={{ color: summary.netChange >= 0 ? "#F97316" : "#EF4444" }} />
                                    <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>สุทธิ</span>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: summary.netChange >= 0 ? "#F97316" : "#EF4444" }}>
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
                                    <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
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
                )
            }

            {/* === Low Stock Tab === */}
            {
                tab === "lowstock" && (
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
                )
            }

            {/* === Consumable Withdrawal History Tab === */}
            {
                tab === "consumables" && (
                    <>
                        <div className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="flex-1 min-w-[130px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><CalendarDays className="w-3 h-3 inline mr-1" />จากวันที่</label><input type="date" value={consumFrom} onChange={e => setConsumFrom(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            <div className="flex-1 min-w-[130px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><CalendarDays className="w-3 h-3 inline mr-1" />ถึงวันที่</label><input type="date" value={consumTo} onChange={e => setConsumTo(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            <div className="flex-2 min-w-[180px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><Search className="w-3 h-3 inline mr-1" />ค้นหา</label><input type="text" value={consumSearch} onChange={e => setConsumSearch(e.target.value)} placeholder="ชื่อวัสดุ, ช่างเบิก, Job..." className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            <button onClick={() => {
                                if (!consumData?.items?.length) return;
                                const headers = ["วันที่", "เวลา", "ชื่อวัสดุ", "จำนวน", "หน่วย", "เลข Job", "ลูกค้า", "รถ", "ทะเบียน", "ช่างเบิก"];
                                const rows = consumData.items.map((i: any) => { const d = new Date(i.addedAt); return [d.toLocaleDateString("th-TH"), d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), i.partName, i.quantity, i.unit, i.job?.jobNo, i.job?.customerName, `${i.job?.carBrand} ${i.job?.carModel}`, i.job?.plateNo, i.withdrawnBy || "-"].map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","); });
                                downloadCSV([headers.join(","), ...rows].join("\n"), `consumable_history_${consumFrom}_${consumTo}.csv`);
                            }} disabled={!consumData?.items?.length} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-md hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}><Download className="w-4 h-4" />Export</button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="rounded-xl p-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: "2px solid #8B5CF6" }}>
                                <div className="flex items-center gap-2 mb-2"><Droplets className="w-4 h-4" style={{ color: "#8B5CF6" }} /><span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>รายการเบิกทั้งหมด</span></div>
                                <p className="text-2xl font-bold" style={{ color: "#8B5CF6" }}>{consumData?.summary?.totalItems || 0}</p>
                            </div>
                            <div className="rounded-xl p-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: "2px solid #F97316" }}>
                                <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4" style={{ color: "#F97316" }} /><span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>จำนวนชิ้นรวม</span></div>
                                <p className="text-2xl font-bold" style={{ color: "#F97316" }}>{consumData?.summary?.totalPieces || 0}</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="p-4" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}><h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--t-text)" }}><Droplets className="w-4 h-4" style={{ color: "#8B5CF6" }} />ประวัติเบิกวัสดุสิ้นเปลือง</h2></div>
                            {consumLoading ? (
                                <div className="p-8 text-center"><div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} /><p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p></div>
                            ) : !consumData?.items?.length ? (
                                <div className="p-8 text-center"><Droplets className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ไม่พบรายการเบิกในช่วงเวลาที่เลือก</p></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead><tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                            {["วันที่/เวลา", "ชื่อวัสดุ", "จำนวน", "เลข Job", "รถ", "ช่างเบิก"].map(h => <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>)}
                                        </tr></thead>
                                        <tbody>
                                            {consumData.items.map((item: any) => {
                                                const d = new Date(item.addedAt);
                                                return (
                                                    <tr key={item.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                        <td className="px-4 py-3">
                                                            <p className="text-sm" style={{ color: "var(--t-text)" }}>{d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" })}</p>
                                                            <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p>
                                                        </td>
                                                        <td className="px-4 py-3"><p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{item.partName}</p></td>
                                                        <td className="px-4 py-3"><span className="text-sm font-bold" style={{ color: "#F97316" }}>{item.quantity}</span><span className="text-[10px] ml-1" style={{ color: "var(--t-text-dim)" }}>{item.unit}</span></td>
                                                        <td className="px-4 py-3">
                                                            {item.job ? (
                                                                <a href={`/jobs/${item.job.id}`} className="text-sm font-bold hover:underline" style={{ color: "#F97316" }}>{item.job.jobNo}</a>
                                                            ) : <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>-</span>}
                                                            {item.job?.customerName && <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>{item.job.customerName}</p>}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs" style={{ color: "var(--t-text-secondary)" }}>{item.job ? `${item.job.carBrand} ${item.job.carModel}` : "-"}<br />{item.job?.plateNo && <span style={{ color: "var(--t-text-dim)" }}>{item.job.plateNo}</span>}</td>
                                                        <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}><User className="w-3 h-3" />{item.withdrawnBy || "-"}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )
            }

            {/* === Paint Withdrawal History Tab === */}
            {
                tab === "paints" && (
                    <>
                        <div className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="flex-1 min-w-[130px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><CalendarDays className="w-3 h-3 inline mr-1" />จากวันที่</label><input type="date" value={paintFrom} onChange={e => setPaintFrom(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            <div className="flex-1 min-w-[130px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><CalendarDays className="w-3 h-3 inline mr-1" />ถึงวันที่</label><input type="date" value={paintTo} onChange={e => setPaintTo(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            <div className="flex-2 min-w-[180px]"><label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--t-text-muted)" }}><Search className="w-3 h-3 inline mr-1" />ค้นหา</label><input type="text" value={paintSearch} onChange={e => setPaintSearch(e.target.value)} placeholder="ชื่อสี, ช่างเบิก, Job..." className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} /></div>
                            <button onClick={() => {
                                if (!paintData?.items?.length) return;
                                const headers = ["วันที่", "เวลา", "ชื่อสี", "จำนวน", "หน่วย", "เลข Job", "ลูกค้า", "รถ", "ทะเบียน", "ช่างเบิก"];
                                const rows = paintData.items.map((i: any) => { const d = new Date(i.addedAt); return [d.toLocaleDateString("th-TH"), d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), i.partName, i.quantity, i.unit, i.job?.jobNo, i.job?.customerName, `${i.job?.carBrand} ${i.job?.carModel}`, i.job?.plateNo, i.withdrawnBy || "-"].map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","); });
                                downloadCSV([headers.join(","), ...rows].join("\n"), `paint_history_${paintFrom}_${paintTo}.csv`);
                            }} disabled={!paintData?.items?.length} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-md hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}><Download className="w-4 h-4" />Export</button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="rounded-xl p-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: "2px solid #8B5CF6" }}>
                                <div className="flex items-center gap-2 mb-2"><Palette className="w-4 h-4" style={{ color: "#8B5CF6" }} /><span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>รายการเบิกทั้งหมด</span></div>
                                <p className="text-2xl font-bold" style={{ color: "#8B5CF6" }}>{paintData?.summary?.totalItems || 0}</p>
                            </div>
                            <div className="rounded-xl p-4" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)", borderTop: "2px solid #7C3AED" }}>
                                <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4" style={{ color: "#7C3AED" }} /><span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>จำนวนชิ้นรวม</span></div>
                                <p className="text-2xl font-bold" style={{ color: "#7C3AED" }}>{paintData?.summary?.totalPieces || 0}</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                            <div className="p-4" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}><h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--t-text)" }}><Palette className="w-4 h-4" style={{ color: "#8B5CF6" }} />ประวัติเบิกสี</h2></div>
                            {paintLoading ? (
                                <div className="p-8 text-center"><div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--t-border)", borderTopColor: "#8B5CF6" }} /><p className="text-sm" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p></div>
                            ) : !paintData?.items?.length ? (
                                <div className="p-8 text-center"><Palette className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} /><p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ไม่พบรายการเบิกสีในช่วงเวลาที่เลือก</p></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead><tr style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                                            {["วันที่/เวลา", "ชื่อสี", "จำนวน", "เลข Job", "รถ", "ช่างเบิก"].map(h => <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: "var(--t-text-muted)" }}>{h}</th>)}
                                        </tr></thead>
                                        <tbody>
                                            {paintData.items.map((item: any) => {
                                                const d = new Date(item.addedAt);
                                                return (
                                                    <tr key={item.id} className="transition-colors" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                        <td className="px-4 py-3">
                                                            <p className="text-sm" style={{ color: "var(--t-text)" }}>{d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" })}</p>
                                                            <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p>
                                                        </td>
                                                        <td className="px-4 py-3"><p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{item.partName}</p></td>
                                                        <td className="px-4 py-3"><span className="text-sm font-bold" style={{ color: "#8B5CF6" }}>{item.quantity}</span><span className="text-[10px] ml-1" style={{ color: "var(--t-text-dim)" }}>{item.unit}</span></td>
                                                        <td className="px-4 py-3">
                                                            {item.job ? (
                                                                <a href={`/jobs/${item.job.id}`} className="text-sm font-bold hover:underline" style={{ color: "#F97316" }}>{item.job.jobNo}</a>
                                                            ) : <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>-</span>}
                                                            {item.job?.customerName && <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>{item.job.customerName}</p>}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs" style={{ color: "var(--t-text-secondary)" }}>{item.job ? `${item.job.carBrand} ${item.job.carModel}` : "-"}<br />{item.job?.plateNo && <span style={{ color: "var(--t-text-dim)" }}>{item.job.plateNo}</span>}</td>
                                                        <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}><User className="w-3 h-3" />{item.withdrawnBy || "-"}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )
            }

            {/* === Audit Tab === */}
            {
                tab === "audit" && (
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
                                                    CREATE_PART: "bg-orange-500/15 text-orange-500",
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
                )
            }
        </div >
    );
}

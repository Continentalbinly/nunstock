"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getJob, updateJobStatus, addJobPart, removeJobPart, updateJobPartStatus, cancelJob,
    getParts, getShopStock, addRepairStep, removeRepairStep, advanceRepairStep,
    reorderRepairSteps, getRepairStepTemplates,
} from "@/lib/api";
import {
    ArrowLeft, Plus, X, Trash2, Package, Car, Clock, PlayCircle, PackageCheck, Truck,
    ShieldCheck, Banknote, ArrowRight, Search, Wrench, ClipboardList, Bell, Ban, Lock,
    CheckCircle2, Minus, User, Hammer, Paintbrush, Settings, Sparkles, Phone, StickyNote,
    ChevronUp, ChevronDown, PackageOpen, Palette,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import BarcodeModal from "@/components/BarcodeModal";
import ConsumableWithdrawModal from "@/components/ConsumableWithdrawModal";
import PaintWithdrawModal from "@/components/PaintWithdrawModal";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    WAITING_PARTS: { label: "รออะไหล่", icon: Clock, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
    RECEIVED: { label: "รับรถ", icon: Car, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
    IN_PROGRESS: { label: "กำลังซ่อม", icon: PlayCircle, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
    COMPLETED: { label: "ซ่อมเสร็จ", icon: PackageCheck, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
    DELIVERED: { label: "ส่งมอบ", icon: Truck, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
    CLOSED: { label: "ปิดงาน", icon: Lock, color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
    CANCELLED: { label: "ยกเลิก", icon: Ban, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};
const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    INSURANCE: { label: "ประกัน", icon: ShieldCheck, color: "#F97316" },
    CASH: { label: "หน้าร้าน", icon: Banknote, color: "#22C55E" },
};
const PART_STATUS: Record<string, { label: string; color: string; Icon: any }> = {
    ORDERED: { label: "สั่งแล้ว", color: "#F59E0B", Icon: Clock },
    ARRIVED: { label: "มาถึง", color: "#22C55E", Icon: CheckCircle2 },
    WITHDRAWN: { label: "เบิกแล้ว", color: "#A855F7", Icon: PackageOpen },
    INSTALLED: { label: "ติดตั้ง", color: "#F97316", Icon: Wrench },
};
const NEXT_STATUS: Record<string, string> = { WAITING_PARTS: "RECEIVED", RECEIVED: "IN_PROGRESS", IN_PROGRESS: "COMPLETED", COMPLETED: "DELIVERED", DELIVERED: "CLOSED" };
const NEXT_PART_STATUS: Record<string, string> = { ORDERED: "ARRIVED", ARRIVED: "WITHDRAWN", WITHDRAWN: "INSTALLED" };
const SOURCE_LABELS: Record<string, string> = { SHOP_PART: "หน้าร้าน", INSURANCE_PART: "ประกัน", SHOP_STOCK: "สต็อกอู่", CONSUMABLE: "วัสดุสิ้นเปลือง", PAINT: "สี", EXTERNAL: "สั่งใหม่" };
const ICON_MAP: Record<string, any> = { Hammer, Paintbrush, Settings, Sparkles, Wrench, ClipboardList, Package };

const inputStyle: React.CSSProperties = { background: "var(--t-input-bg)", color: "var(--t-input-text)", border: "1px solid var(--t-input-border)" };

export default function JobDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Add part modal
    const [showAddPart, setShowAddPart] = useState(false);
    const [partSource, setPartSource] = useState("SHOP_STOCK");
    const [partSearch, setPartSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [newPart, setNewPart] = useState({ partName: "", quantity: 1, unit: "ชิ้น", note: "", sourceId: "" });
    const [partSaving, setPartSaving] = useState(false);
    // Insurance catalog
    const [insCatalog, setInsCatalog] = useState<any[]>([]);
    const [insCatalogLoading, setInsCatalogLoading] = useState(false);
    const [insSearch, setInsSearch] = useState("");
    const [selectedInsParts, setSelectedInsParts] = useState<Record<string, { name: string; qty: number }>>({});

    // Cancel confirm
    const [showCancel, setShowCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState("");

    // Repair step modal
    const [showStepModal, setShowStepModal] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [customStepName, setCustomStepName] = useState("");

    // Generic confirmation modal
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Barcode print
    const [barcodePart, setBarcodePart] = useState<any>(null);

    // Notes modal
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [noteSaving, setNoteSaving] = useState(false);
    const [jobNotes, setJobNotes] = useState<any[]>([]);

    // Consumables withdrawal
    const [showConsumables, setShowConsumables] = useState(false);

    // Paint withdrawal
    const [showPaints, setShowPaints] = useState(false);
    const [consumables, setConsumables] = useState<any[]>([]);
    const [loadingCons, setLoadingCons] = useState(false);
    const [consSearch, setConsSearch] = useState("");
    const [selectedCons, setSelectedCons] = useState<Record<string, { qty: number; name: string; unit: string }>>({});
    const [withdrawnBy, setWithdrawnBy] = useState("");
    const [consSaving, setConsSaving] = useState(false);

    const filteredCons = consumables.filter(p => !consSearch || p.name.toLowerCase().includes(consSearch.toLowerCase()));

    const loadConsumables = async () => {
        setLoadingCons(true);
        try {
            const r = await getParts({ type: "CONSUMABLE", pageSize: "100" });
            setConsumables(r.data || []);
        } catch { setConsumables([]); }
        finally { setLoadingCons(false); }
    };

    const toggleCons = (part: any) => {
        setSelectedCons(prev => {
            const next = { ...prev };
            if (next[part.id]) { delete next[part.id]; }
            else { next[part.id] = { qty: 1, name: part.name, unit: part.unit || "ชิ้น" }; }
            return next;
        });
    };
    const updateConsQty = (partId: string, delta: number) => {
        setSelectedCons(prev => {
            const cur = prev[partId];
            if (!cur) return prev;
            return { ...prev, [partId]: { ...cur, qty: Math.max(1, cur.qty + delta) } };
        });
    };

    const handleWithdrawConsumables = async () => {
        if (Object.keys(selectedCons).length === 0) return;
        if (!withdrawnBy.trim()) { toast.error("กรุณาระบุชื่อผู้เบิก"); return; }
        setConsSaving(true);
        try {
            for (const [sourceId, info] of Object.entries(selectedCons)) {
                await addJobPart(id as string, {
                    source: "CONSUMABLE", sourceId,
                    partName: info.name, quantity: info.qty, unit: info.unit,
                    withdrawnBy: withdrawnBy.trim(),
                });
            }
            toast.success(`เบิกวัสดุ ${Object.keys(selectedCons).length} รายการ`);
            setSelectedCons({});
            setShowConsumables(false);
            setConsSearch("");
            fetchJob();
        } catch (err: any) { toast.error(err.message || "ไม่สามารถเบิกได้"); }
        finally { setConsSaving(false); }
    };

    const fetchJob = async () => {
        setLoading(true);
        try { const r = await getJob(id as string); setJob(r); }
        catch { toast.error("ไม่สามารถโหลด Job ได้"); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (id) fetchJob(); }, [id]);

    const handleStatusChange = async (status: string) => {
        const label = STATUS_CONFIG[status]?.label || status;
        setConfirmAction({
            title: `เปลี่ยนสถานะเป็น "${label}"`,
            message: `ยืนยันเปลี่ยนสถานะ Job เป็น "${label}"?\nการเปลี่ยนสถานะจะไม่สามารถย้อนกลับได้`,
            onConfirm: async () => {
                await updateJobStatus(id as string, status);
                toast.success(`เปลี่ยนสถานะ: ${label}`);
                fetchJob();
            },
        });
    };

    const handleClaimCall = async () => {
        try {
            await fetch(`/api/jobs/${id}/claim-call`, { method: "POST", credentials: "include" });
            toast.success("บันทึกแจ้งเคลมแล้ว");
            fetchJob();
        } catch (err: any) { toast.error(err.message || "ไม่สามารถบันทึกได้"); }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setNoteSaving(true);
        try {
            await fetch(`/api/jobs/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ note: noteText.trim() }) });
            toast.success("เพิ่มหมายเหตุเรียบร้อย");
            setNoteText(""); setShowNoteModal(false);
            // Refresh notes
            const res = await fetch(`/api/jobs/${id}/notes`, { credentials: "include" });
            const json = await res.json();
            if (json.success) setJobNotes(json.data);
        } catch (err: any) { toast.error(err.message || "ไม่สามารถเพิ่มได้"); }
        finally { setNoteSaving(false); }
    };

    const handlePartStatusChange = async (partId: string, nextStatus: string, partName?: string) => {
        const confirmMessages: Record<string, { title: string; message: string }> = {
            ARRIVED: { title: "ยืนยันอะไหล่มาถึง?", message: `"${partName || 'อะไหล่'}" มาถึงร้านแล้ว\nระบบจะสร้างบาร์โค้ดและเปิดหน้าปริ้นให้อัตโนมัติ` },
            WITHDRAWN: { title: "ยืนยันเบิกอะไหล่?", message: `เบิก "${partName || 'อะไหล่'}" ออกจากคลังเพื่อใช้ซ่อม` },
            INSTALLED: { title: "ยืนยันติดตั้งเสร็จ?", message: `"${partName || 'อะไหล่'}" ติดตั้งเรียบร้อยแล้ว` },
        };
        const msg = confirmMessages[nextStatus] || { title: "ยืนยัน?", message: `เปลี่ยนสถานะอะไหล่เป็น ${PART_STATUS[nextStatus]?.label}` };

        setConfirmAction({
            title: msg.title,
            message: msg.message,
            onConfirm: async () => {
                const updated = await updateJobPartStatus(id as string, partId, nextStatus);
                toast.success(`อะไหล่: ${PART_STATUS[nextStatus]?.label}`);
                fetchJob();
                // Auto-open barcode modal for ARRIVED
                if (nextStatus === "ARRIVED" && updated?.barcode) {
                    setBarcodePart({ code: updated.barcode, name: updated.partName || partName, brand: "", quantity: updated.quantity, unit: updated.unit });
                }
            },
        });
    };

    const searchForParts = async (q: string) => {
        setPartSearch(q);
        if (q.length < 1) { setSearchResults([]); return; }
        try {
            if (partSource === "SHOP_STOCK") {
                const r = await getShopStock({ search: q, pageSize: "10" });
                setSearchResults((r.data || []).map((s: any) => ({ id: s.id, name: s.name, quantity: s.quantity, unit: s.unit })));
            } else {
                const r = await getParts({ search: q, pageSize: "10" });
                setSearchResults((r.data || []).map((p: any) => ({ id: p.id, name: p.name, quantity: p.quantity, unit: p.unit })));
            }
        } catch { setSearchResults([]); }
    };

    const handleAddPart = async () => {
        if (!newPart.partName) return;
        setPartSaving(true);
        try {
            await addJobPart(id as string, {
                source: partSource, sourceId: newPart.sourceId || undefined,
                partName: newPart.partName, quantity: newPart.quantity, unit: newPart.unit, note: newPart.note || undefined,
            });
            toast.success("เพิ่มอะไหล่เรียบร้อย");
            setShowAddPart(false);
            fetchJob();
        } catch (err: any) { toast.error(err.message || "ไม่สามารถเพิ่มได้"); }
        finally { setPartSaving(false); }
    };

    const loadInsCatalog = async (model: string) => {
        setInsCatalogLoading(true);
        try {
            const r = await getParts({ search: model, pageSize: "100" });
            const parts = (r.data || []).filter((p: any) => p.code?.startsWith("INS-"));
            setInsCatalog(parts);
        } catch { setInsCatalog([]); }
        finally { setInsCatalogLoading(false); }
    };

    const handleAddInsuranceParts = async () => {
        const entries = Object.entries(selectedInsParts);
        if (entries.length === 0) return;
        setPartSaving(true);
        try {
            for (const [sourceId, info] of entries) {
                await addJobPart(id as string, {
                    source: "INSURANCE_PART", sourceId,
                    partName: info.name, quantity: info.qty, unit: "ชิ้น",
                });
            }
            toast.success(`เพิ่มอะไหล่ประกัน ${entries.length} รายการเรียบร้อย`);
            setShowAddPart(false);
            fetchJob();
        } catch (err: any) { toast.error(err.message || "ไม่สามารถเพิ่มได้"); }
        finally { setPartSaving(false); }
    };

    const isLocked = job?.status === "COMPLETED" || job?.status === "DELIVERED" || job?.status === "CLOSED" || job?.status === "CANCELLED";

    const handleRemovePart = (partId: string, partName: string) => {
        setConfirmAction({
            title: `ลบ "${partName}"?`,
            message: `ยืนยันลบอะไหล่นี้? สต็อกจะถูกคืนอัตโนมัติ\nไม่สามารถย้อนกลับได้`,
            onConfirm: async () => {
                await removeJobPart(id as string, partId);
                toast.success("ลบอะไหล่ + คืนสต็อก");
                fetchJob();
            },
        });
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) { toast.error("กรุณาระบุเหตุผล"); return; }
        try {
            await cancelJob(id as string, cancelReason.trim());
            toast.success("ยกเลิก Job เรียบร้อย");
            router.push("/jobs");
        } catch (err: any) { toast.error(err.message); }
    };

    if (loading) return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
        </div>
    );

    if (!job) return (
        <div className="p-8 text-center">
            <p style={{ color: "var(--t-text-muted)" }}>ไม่พบ Job นี้</p>
            <button onClick={() => router.push("/jobs")} className="mt-4 text-sm underline cursor-pointer" style={{ color: "#F97316" }}>กลับ</button>
        </div>
    );

    const st = STATUS_CONFIG[job.status] || STATUS_CONFIG.RECEIVED;
    const tp = TYPE_CONFIG[job.type] || TYPE_CONFIG.CASH;
    const StIcon = st.icon;
    const consumableParts = (job.parts || []).filter((p: any) => p.source === "CONSUMABLE");
    const paintParts = (job.parts || []).filter((p: any) => p.source === "PAINT");
    const nonConsumableParts = (job.parts || []).filter((p: any) => p.source !== "CONSUMABLE" && p.source !== "PAINT");
    const arrivedCount = nonConsumableParts.filter((p: any) => p.status === "ARRIVED" || p.status === "INSTALLED" || p.status === "WITHDRAWN").length;
    const totalParts = nonConsumableParts.length;

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <button onClick={() => router.push("/jobs")} className="flex items-center gap-1 text-sm mb-4 cursor-pointer transition-colors" style={{ color: "var(--t-text-muted)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#F97316"} onMouseLeave={e => e.currentTarget.style.color = "var(--t-text-muted)"}>
                <ArrowLeft className="w-4 h-4" /> กลับไปรายการงาน
            </button>

            {/* Job Info Card */}
            <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="p-5" style={{ borderBottom: `2px solid ${st.color}20` }}>
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.12)" }}>
                                <ClipboardList className="w-6 h-6" style={{ color: "#F97316" }} />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold" style={{ color: "#F97316" }}>{job.jobNo}</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${tp.color}15`, color: tp.color }}>
                                        <tp.icon className="w-3 h-3" /> {tp.label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: st.bg, color: st.color }}>
                                        <StIcon className="w-3 h-3" /> {st.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {NEXT_STATUS[job.status] && (
                                <button onClick={() => handleStatusChange(NEXT_STATUS[job.status])}
                                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer text-white transition-all" style={{ background: "#F97316" }}>
                                    <ArrowRight className="w-4 h-4" /> {STATUS_CONFIG[NEXT_STATUS[job.status]]?.label}
                                </button>
                            )}
                            {job.type === "INSURANCE" && !job.claimCalledAt && job.status !== "CANCELLED" && job.status !== "CLOSED" && (
                                <button onClick={handleClaimCall}
                                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all" style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>
                                    <Phone className="w-3.5 h-3.5" /> แจ้งเคลม
                                </button>
                            )}
                            {job.type === "INSURANCE" && job.claimCalledAt && (
                                <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                                    <CheckCircle2 className="w-3 h-3" /> แจ้งเคลมแล้ว
                                </span>
                            )}
                            <button onClick={async () => { setShowNoteModal(true); try { const res = await fetch(`/api/jobs/${id}/notes`, { credentials: "include" }); const json = await res.json(); if (json.success) setJobNotes(json.data); } catch { } }}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all" style={{ background: "rgba(249,115,22,0.08)", color: "#F97316", border: "1px solid rgba(249,115,22,0.15)" }}>
                                <StickyNote className="w-3.5 h-3.5" /> หมายเหตุ
                            </button>
                            {!isLocked && job.status !== "CANCELLED" && (
                                <button onClick={() => setShowCancel(true)} className="text-xs font-medium px-3 py-2 rounded-lg cursor-pointer" style={{ color: "#ef4444" }}>ยกเลิก</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--t-text-dim)" }}>ลูกค้า</p><p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{job.customerName}</p>{job.customerPhone && <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{job.customerPhone}</p>}</div>
                    <div><p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--t-text-dim)" }}>รถ</p><p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{job.carBrand} {job.carModel}</p><p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{job.plateNo}</p></div>
                    {job.type === "INSURANCE" && (
                        <>
                            <div><p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--t-text-dim)" }}>เลขเคลม</p><p className="text-sm font-medium" style={{ color: "#F97316" }}>{job.claimNo || "-"}</p></div>
                            <div><p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--t-text-dim)" }}>บ.ประกัน</p><p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{job.insuranceComp || "-"}</p></div>
                        </>
                    )}
                    {job.type !== "INSURANCE" && (
                        <div className="col-span-2"><p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--t-text-dim)" }}>อะไหล่</p><p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{arrivedCount}/{totalParts} มาถึง</p></div>
                    )}
                </div>
                {job.notes && <div className="px-5 pb-4"><div className="rounded-lg p-3 text-sm" style={{ background: "var(--t-badge-bg)", color: "var(--t-text-secondary)" }}>{job.notes}</div></div>}
            </div>

            {/* ──── Status Timeline (READ ONLY) ──── */}
            <div className="rounded-xl p-5 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: "var(--t-text)" }}>สถานะ</h2>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg], i) => {
                        const Icon = cfg.icon;
                        const isActive = key === job.status;
                        const isPast = Object.keys(STATUS_CONFIG).indexOf(key) < Object.keys(STATUS_CONFIG).indexOf(job.status);
                        return (
                            <div key={key} className="flex items-center gap-1">
                                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                                    style={{
                                        background: isActive ? cfg.bg : isPast ? `${cfg.color}08` : "transparent",
                                        color: isActive ? cfg.color : isPast ? cfg.color : "var(--t-text-dim)",
                                        border: isActive ? `2px solid ${cfg.color}` : "1px solid transparent",
                                        fontWeight: isActive ? 700 : 400,
                                    }}>
                                    <Icon className="w-3.5 h-3.5" /> {cfg.label}
                                </div>
                                {i < 4 && <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "var(--t-text-dim)" }} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ──── Repair Steps ──── */}
            {(job.status === "IN_PROGRESS" || job.status === "RECEIVED") && (
                <div className="rounded-xl p-5 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
                            <Wrench className="w-4 h-4" style={{ color: "#F97316" }} />
                            ขั้นตอนซ่อม ({(job.repairSteps || []).length})
                        </h2>
                        {job.status === "IN_PROGRESS" && (
                            <button onClick={async () => {
                                setShowStepModal(true);
                                try { const res = await getRepairStepTemplates(); setTemplates(Array.isArray(res) ? res : []); } catch { }
                            }} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer text-white" style={{ background: "#F97316" }}>
                                <Plus className="w-3.5 h-3.5" /> เพิ่มขั้นตอน
                            </button>
                        )}
                    </div>

                    {(job.repairSteps || []).length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีขั้นตอน — เพิ่มได้จากปุ่มด้านบน</p>
                    ) : (
                        <div className="space-y-2">
                            {(job.repairSteps || []).sort((a: any, b: any) => a.order - b.order).map((rs: any, idx: number) => {
                                const StepIcon = ICON_MAP[rs.step] || Wrench;
                                const stepColor = rs.status === "COMPLETED" ? "#22C55E" : rs.status === "IN_PROGRESS" ? "#F97316" : "#9CA3AF";
                                const statusLabel = rs.status === "COMPLETED" ? "เสร็จแล้ว" : rs.status === "IN_PROGRESS" ? "กำลังดำเนินงาน" : "รอดำเนินงาน";
                                const StatusIcon = rs.status === "COMPLETED" ? PackageCheck : rs.status === "IN_PROGRESS" ? PlayCircle : Clock;
                                const nextStepLabel = rs.status === "PENDING" ? "เริ่มงาน" : rs.status === "IN_PROGRESS" ? "เสร็จ" : null;
                                const steps = job.repairSteps.sort((a: any, b: any) => a.order - b.order);

                                return (
                                    <div key={rs.id} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: `${stepColor}08`, border: `1px solid ${stepColor}20` }}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: stepColor }}>{idx + 1}</span>
                                            <StepIcon className="w-4 h-4" style={{ color: stepColor }} />
                                            <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{rs.label}</span>
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${stepColor}15`, color: stepColor }}>
                                                <StatusIcon className="w-3 h-3" /> {statusLabel}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Priority arrows */}
                                            {!isLocked && idx > 0 && (
                                                <button onClick={async () => {
                                                    const newOrder = [...steps.map((s: any) => s.id)];
                                                    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                                                    try { await reorderRepairSteps(id as string, newOrder); fetchJob(); } catch { }
                                                }} className="p-0.5 rounded cursor-pointer" style={{ color: "var(--t-text-dim)" }}>
                                                    <ChevronUp className="w-4 h-4" />
                                                </button>
                                            )}
                                            {!isLocked && idx < steps.length - 1 && (
                                                <button onClick={async () => {
                                                    const newOrder = [...steps.map((s: any) => s.id)];
                                                    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                                                    try { await reorderRepairSteps(id as string, newOrder); fetchJob(); } catch { }
                                                }} className="p-0.5 rounded cursor-pointer" style={{ color: "var(--t-text-dim)" }}>
                                                    <ChevronDown className="w-4 h-4" />
                                                </button>
                                            )}
                                            {nextStepLabel && !isLocked && (
                                                <button onClick={() => {
                                                    setConfirmAction({
                                                        title: `${nextStepLabel} "${rs.label}"?`,
                                                        message: `ยืนยัน${rs.status === "PENDING" ? "เริ่มงาน" : "เสร็จสิ้น"} ขั้นตอน "${rs.label}"?\nไม่สามารถย้อนกลับได้`,
                                                        onConfirm: async () => {
                                                            await advanceRepairStep(id as string, rs.id);
                                                            toast.success(`${rs.label}: ${nextStepLabel}`);
                                                            fetchJob();
                                                        },
                                                    });
                                                }} className="text-xs px-2 py-1 rounded-md font-medium cursor-pointer" style={{ background: `${stepColor}15`, color: stepColor }}>
                                                    <ArrowRight className="w-3 h-3 inline" /> {nextStepLabel}
                                                </button>
                                            )}
                                            {rs.status === "PENDING" && !isLocked && (
                                                <button onClick={async () => {
                                                    try { await removeRepairStep(id as string, rs.id); toast.success(`ลบขั้นตอน: ${rs.label}`); fetchJob(); }
                                                    catch (err: any) { toast.error(err.message || "ไม่สามารถลบได้"); }
                                                }} className="p-1 rounded cursor-pointer" style={{ color: "#ef4444" }}>
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ──── Parts Section ──── */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                    <div>
                        <h2 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>อะไหล่ ({nonConsumableParts.length})</h2>
                        {nonConsumableParts.length > 0 && <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{arrivedCount}/{nonConsumableParts.length} มาถึงร้าน</p>}
                    </div>
                    {!isLocked && (
                        <button onClick={() => {
                            setNewPart({ partName: "", quantity: 1, unit: "ชิ้น", note: "", sourceId: "" });
                            setPartSearch(""); setSearchResults([]);
                            setPartSource(job.type === "INSURANCE" ? "INSURANCE_PART" : "SHOP_STOCK");
                            setInsSearch(""); setSelectedInsParts({});
                            if (job.type === "INSURANCE" && job.carModel) loadInsCatalog(job.carModel);
                            setShowAddPart(true);
                        }}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer text-white transition-all" style={{ background: "#F97316" }}>
                            <Plus className="w-3.5 h-3.5" /> เพิ่มอะไหล่
                        </button>
                    )}
                </div>

                {nonConsumableParts.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} />
                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีอะไหล่</p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: "var(--t-border-subtle)" }}>
                        {nonConsumableParts.map((p: any) => {
                            const ps = PART_STATUS[p.status] || PART_STATUS.ORDERED;
                            return (
                                <div key={p.id} className="flex items-center justify-between px-5 py-3 transition-colors"
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.partName}</p>
                                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
                                                style={{ background: `${ps.color}18`, color: ps.color }}>
                                                <ps.Icon className="w-3 h-3" /> {ps.label}
                                            </span>
                                            {NEXT_PART_STATUS[p.status] && (() => {
                                                const nextKey = NEXT_PART_STATUS[p.status];
                                                // ORDERED→ARRIVED: ok anytime (parts arrive at shop). Others: only IN_PROGRESS
                                                const canAdvance = !isLocked;
                                                if (!canAdvance) return null;
                                                const nextPs = PART_STATUS[nextKey];
                                                return (
                                                    <button onClick={() => handlePartStatusChange(p.id, nextKey, p.partName)}
                                                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold cursor-pointer transition-opacity hover:opacity-80"
                                                        style={{ background: `${nextPs.color}18`, color: nextPs.color }}>
                                                        <ArrowRight className="w-3 h-3" /> {nextPs.label}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--t-input-bg)", color: "var(--t-text-dim)" }}>{SOURCE_LABELS[p.source] || p.source}</span>
                                            <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>x{p.quantity} {p.unit}</span>
                                            {p.note && <span className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>• {p.note}</span>}
                                            {p.barcode && (
                                                <button onClick={() => setBarcodePart({ code: p.barcode, name: p.partName, brand: "", quantity: p.quantity, unit: p.unit })}
                                                    className="font-mono text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-70"
                                                    style={{ background: "rgba(249,115,22,0.1)", color: "#F97316", border: "1px solid rgba(249,115,22,0.2)" }}>
                                                    {p.barcode}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {
                                        !isLocked && (
                                            <button onClick={() => handleRemovePart(p.id, p.partName)} className="p-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: "#ef4444" }} title="ลบ + คืนสต็อก">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )
                                    }
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ──── Consumables Withdrawal Section ──── */}
            <div className="rounded-xl overflow-hidden mt-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                    <div>
                        <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
                            <Wrench className="w-4 h-4" style={{ color: "#f59e0b" }} />
                            วัสดุสิ้นเปลือง
                        </h2>
                        {consumableParts.length > 0 && <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>เบิกแล้ว {consumableParts.length} รายการ</p>}
                    </div>
                    {job.status === "IN_PROGRESS" && (
                        <button onClick={() => setShowConsumables(true)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer text-white transition-all" style={{ background: "#f59e0b" }}>
                            <Plus className="w-3.5 h-3.5" /> เบิกวัสดุ
                        </button>
                    )}
                </div>

                {/* Existing consumable parts list */}
                {consumableParts.length > 0 && (
                    <div className="divide-y" style={{ borderColor: "var(--t-border-subtle)" }}>
                        {consumableParts.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between px-5 py-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.partName}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>วัสดุสิ้นเปลือง</span>
                                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>x{p.quantity} {p.unit}</span>
                                        {p.withdrawnBy && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--t-badge-bg)", color: "var(--t-text-dim)" }}>
                                                <User className="w-2.5 h-2.5" /> {p.withdrawnBy}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!isLocked && <button onClick={() => handleRemovePart(p.id, p.partName)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>}
                            </div>
                        ))}
                    </div>
                )}

                {consumableParts.length === 0 && !showConsumables && (
                    <div className="text-center py-8">
                        <Wrench className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} />
                        <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีการเบิกวัสดุ</p>
                    </div>
                )}
            </div>

            {/* ──── Paint Withdrawal Section ──── */}
            <div className="rounded-xl overflow-hidden mt-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
                    <div>
                        <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
                            <Palette className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                            สี
                        </h2>
                        {paintParts.length > 0 && <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>เบิกแล้ว {paintParts.length} รายการ</p>}
                    </div>
                    {job.status === "IN_PROGRESS" && (
                        <button onClick={() => setShowPaints(true)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer text-white transition-all" style={{ background: "#8B5CF6" }}>
                            <Plus className="w-3.5 h-3.5" /> เบิกสี
                        </button>
                    )}
                </div>

                {paintParts.length > 0 && (
                    <div className="divide-y" style={{ borderColor: "var(--t-border-subtle)" }}>
                        {paintParts.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between px-5 py-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{p.partName}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>สี</span>
                                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>x{p.quantity} {p.unit}</span>
                                        {p.withdrawnBy && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--t-badge-bg)", color: "var(--t-text-dim)" }}>
                                                <User className="w-2.5 h-2.5" /> {p.withdrawnBy}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!isLocked && <button onClick={() => handleRemovePart(p.id, p.partName)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>}
                            </div>
                        ))}
                    </div>
                )}

                {paintParts.length === 0 && !showPaints && (
                    <div className="text-center py-8">
                        <Palette className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--t-text-dim)" }} />
                        <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>ยังไม่มีการเบิกสี</p>
                    </div>
                )}
            </div>

            {/* ──── Add Part Modal ──── */}
            {
                showAddPart && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setShowAddPart(false)}>
                        <div className="rounded-2xl w-[92%] max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--t-border-subtle)", background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))" }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>เพิ่มอะไหล่เข้า Job</h3>
                                        <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{job.jobNo} — {job.customerName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddPart(false)} className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-black/5" style={{ color: "var(--t-text-muted)" }}><X className="w-4 h-4" /></button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {/* Insurance-specific info cards */}
                                {job.type === "INSURANCE" && partSource === "INSURANCE_PART" && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg p-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                                                <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--t-text-dim)" }}>บริษัทประกัน</p>
                                                <p className="text-xs font-bold" style={{ color: "#6366F1" }}>{job.insuranceComp || "-"}</p>
                                            </div>
                                            <div className="rounded-lg p-3" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                                                <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--t-text-dim)" }}>รถ</p>
                                                <p className="text-xs font-bold" style={{ color: "#F97316" }}>{job.carBrand} {job.carModel}</p>
                                            </div>
                                        </div>

                                        {/* Search insurance parts */}
                                        <div>
                                            <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--t-text-secondary)" }}>
                                                อะไหล่ประกัน — เลือกรายการที่ต้องการเคลม
                                            </label>
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--t-text-dim)" }} />
                                                <input value={insSearch} onChange={e => setInsSearch(e.target.value)}
                                                    className="w-full rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20" style={inputStyle}
                                                    placeholder="ค้นหาอะไหล่..." />
                                            </div>
                                        </div>

                                        {/* Catalog list */}
                                        {insCatalogLoading ? (
                                            <div className="py-6 text-center">
                                                <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: "var(--t-border)", borderTopColor: "#F97316" }} />
                                                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>กำลังโหลดรายการอะไหล่...</p>
                                            </div>
                                        ) : (() => {
                                            const filtered = insSearch
                                                ? insCatalog.filter(p => p.name.toLowerCase().includes(insSearch.toLowerCase()))
                                                : insCatalog;
                                            // Exclude already-added parts
                                            const existingNames = new Set((job.parts || []).map((p: any) => p.partName));
                                            const available = filtered.filter(p => !existingNames.has(p.name));
                                            return available.length === 0 ? (
                                                <div className="rounded-lg py-4 text-center" style={{ background: "var(--t-badge-bg)" }}>
                                                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                                                        {insCatalog.length === 0 ? `ไม่พบอะไหล่สำหรับ ${job.carModel}` : "เพิ่มครบแล้ว หรือไม่พบที่ค้นหา"}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg">
                                                    {available.map(p => {
                                                        const sel = selectedInsParts[p.id];
                                                        return (
                                                            <div key={p.id}
                                                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all"
                                                                style={{ background: sel ? "rgba(249,115,22,0.06)" : "var(--t-badge-bg)", border: `1.5px solid ${sel ? "rgba(249,115,22,0.3)" : "var(--t-border-subtle)"}` }}
                                                                onClick={() => setSelectedInsParts(prev => {
                                                                    const next = { ...prev };
                                                                    if (next[p.id]) delete next[p.id];
                                                                    else next[p.id] = { name: p.name, qty: 1 };
                                                                    return next;
                                                                })}>
                                                                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{
                                                                    background: sel ? "#F97316" : "transparent",
                                                                    border: `2px solid ${sel ? "#F97316" : "var(--t-text-dim)"}`,
                                                                }}>
                                                                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                                </div>
                                                                <span className="text-sm flex-1" style={{ color: sel ? "#F97316" : "var(--t-text)", fontWeight: sel ? 600 : 400 }}>{p.name}</span>
                                                                {sel && (
                                                                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                                        <button type="button" onClick={() => setSelectedInsParts(prev => {
                                                                            const cur = prev[p.id]; if (!cur || cur.qty <= 1) return prev;
                                                                            return { ...prev, [p.id]: { ...cur, qty: cur.qty - 1 } };
                                                                        })} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                                                            <Minus className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                                                                        </button>
                                                                        <span className="text-sm font-bold w-6 text-center" style={{ color: "#F97316" }}>{sel.qty}</span>
                                                                        <button type="button" onClick={() => setSelectedInsParts(prev => {
                                                                            const cur = prev[p.id]; if (!cur) return prev;
                                                                            return { ...prev, [p.id]: { ...cur, qty: cur.qty + 1 } };
                                                                        })} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                                                            <Plus className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}

                                {/* Non-insurance source selector & search (existing logic) */}
                                {(job.type !== "INSURANCE" || partSource !== "INSURANCE_PART") && (
                                    <>
                                        <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>แหล่ง</label>
                                            <select value={partSource} onChange={e => { setPartSource(e.target.value); setSearchResults([]); setPartSearch(""); setNewPart({ ...newPart, sourceId: "", partName: "" }); }}
                                                className="w-full rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none" style={inputStyle}>
                                                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </div>
                                        {partSource !== "EXTERNAL" ? (
                                            <div>
                                                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ค้นหาอะไหล่</label>
                                                <input value={partSearch} onChange={e => searchForParts(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="พิมพ์ชื่อ..." />
                                                {searchResults.length > 0 && (
                                                    <div className="mt-1 rounded-lg max-h-32 overflow-y-auto" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                                                        {searchResults.map((r: any) => (
                                                            <button key={r.id} onClick={() => { setNewPart({ ...newPart, sourceId: r.id, partName: r.name, unit: r.unit }); setSearchResults([]); setPartSearch(r.name); }}
                                                                className="w-full flex items-center justify-between px-3 py-2 text-xs cursor-pointer text-left" style={{ color: "var(--t-text)" }}
                                                                onMouseEnter={e => e.currentTarget.style.background = "var(--t-hover-overlay)"}
                                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                                <span>{r.name}</span>
                                                                <span style={{ color: r.quantity === 0 ? "#EF4444" : "var(--t-text-muted)" }}>{r.quantity} {r.unit}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div><label className="text-xs mb-1 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ชื่ออะไหล่ (สั่งใหม่)</label>
                                                <input value={newPart.partName} onChange={e => setNewPart({ ...newPart, partName: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} placeholder="กรอกชื่อ..." /></div>
                                        )}
                                        {newPart.partName && <div className="text-xs px-2 py-1 rounded" style={{ background: "rgba(249,115,22,0.1)", color: "#F97316" }}>✓ {newPart.partName}</div>}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>จำนวน</label>
                                                <input type="number" value={newPart.quantity} onChange={e => setNewPart({ ...newPart, quantity: Math.max(1, Number(e.target.value)) })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} min={1} /></div>
                                            <div><label className="text-xs mb-1 block" style={{ color: "var(--t-text-secondary)" }}>หมายเหตุ</label>
                                                <input value={newPart.note} onChange={e => setNewPart({ ...newPart, note: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} /></div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-4 flex gap-3 shrink-0" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                                <button onClick={() => setShowAddPart(false)} className="flex-1 rounded-xl py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                {job.type === "INSURANCE" && partSource === "INSURANCE_PART" ? (
                                    <button onClick={handleAddInsuranceParts} disabled={partSaving || Object.keys(selectedInsParts).length === 0}
                                        className="flex-1 text-white font-bold rounded-xl py-2.5 text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:-translate-y-0.5"
                                        style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}>
                                        {partSaving ? "กำลังเพิ่ม..." : `เพิ่ม ${Object.keys(selectedInsParts).length} รายการ`}
                                    </button>
                                ) : (
                                    <button onClick={handleAddPart} disabled={partSaving || !newPart.partName}
                                        className="flex-1 text-white font-bold rounded-xl py-2.5 text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:-translate-y-0.5"
                                        style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}>
                                        {partSaving ? "กำลัง..." : "เพิ่ม"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ──── Cancel Confirm ──── */}
            {
                showCancel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => { setShowCancel(false); setCancelReason(""); }}>
                        <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}><Ban className="w-5 h-5 text-red-500" /></div>
                                <h3 className="font-bold" style={{ color: "var(--t-text)" }}>ยกเลิก Job {job.jobNo}?</h3>
                            </div>
                            <p className="text-xs mb-3" style={{ color: "var(--t-text-dim)" }}>อะไหล่ที่มาถึงแล้วจะถูกโอนเข้าสต็อกร้าน</p>
                            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} placeholder="เหตุผลในการยกเลิก (จำเป็น)" className="w-full text-sm px-3 py-2 rounded-lg resize-none mb-4" style={{ background: "var(--t-input-bg)", color: "var(--t-text)", border: "1px solid var(--t-input-border)" }} />
                            <div className="flex gap-3">
                                <button onClick={() => { setShowCancel(false); setCancelReason(""); }} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ปิด</button>
                                <button onClick={handleCancel} disabled={!cancelReason.trim()} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 text-sm cursor-pointer disabled:opacity-40">ยกเลิก Job</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ──── Confirmation Modal ──── */}
            {
                confirmAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => !confirmLoading && setConfirmAction(null)}>
                        <div className="rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}><ArrowRight className="w-5 h-5" style={{ color: "#F97316" }} /></div>
                                <h3 className="font-bold" style={{ color: "var(--t-text)" }}>{confirmAction.title}</h3>
                            </div>
                            <p className="text-xs mb-4 whitespace-pre-line" style={{ color: "var(--t-text-dim)" }}>{confirmAction.message}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmAction(null)} disabled={confirmLoading} className="flex-1 rounded-lg py-2.5 text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ยกเลิก</button>
                                <button onClick={async () => {
                                    setConfirmLoading(true);
                                    try { await confirmAction.onConfirm(); setConfirmAction(null); }
                                    catch (err: any) { toast.error(err.message || "เกิดข้อผิดพลาด"); }
                                    finally { setConfirmLoading(false); }
                                }} disabled={confirmLoading} className="flex-1 font-semibold rounded-lg py-2.5 text-sm cursor-pointer text-white" style={{ background: "#F97316" }}>
                                    {confirmLoading ? "กำลังดำเนินการ..." : "ยืนยัน"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ──── Step Template Modal ──── */}
            {
                showStepModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--t-modal-overlay)" }} onClick={() => { setShowStepModal(false); setCustomStepName(""); }}>
                        <div className="rounded-2xl p-6 w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}><Plus className="w-5 h-5" style={{ color: "#F97316" }} /></div>
                                <h3 className="font-bold" style={{ color: "var(--t-text)" }}>เพิ่มขั้นตอนซ่อม</h3>
                            </div>

                            {/* Template list */}
                            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                                {templates.map((t: any) => {
                                    const TIcon = ICON_MAP[t.icon] || Wrench;
                                    const alreadyAdded = (job.repairSteps || []).some((rs: any) => rs.label === t.label);
                                    return (
                                        <button key={t.id} onClick={async () => {
                                            if (alreadyAdded) return;
                                            try {
                                                await addRepairStep(id as string, t.icon || "Wrench", t.label);
                                                toast.success(`เพิ่มขั้นตอน: ${t.label}`);
                                                fetchJob();
                                                setShowStepModal(false);
                                            } catch (err: any) { toast.error(err.message || "ไม่สามารถเพิ่มได้"); }
                                        }} disabled={alreadyAdded}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-left cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ background: alreadyAdded ? "var(--t-input-bg)" : `${t.color}08`, border: `1px solid ${alreadyAdded ? "var(--t-border-subtle)" : t.color + "30"}`, color: "var(--t-text)" }}>
                                            <TIcon className="w-4 h-4 shrink-0" style={{ color: t.color || "#6B7280" }} />
                                            <span className="font-medium">{t.label}</span>
                                            {alreadyAdded && <span className="ml-auto text-xs" style={{ color: "var(--t-text-muted)" }}>เพิ่มแล้ว</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom new step */}
                            <div className="flex gap-2">
                                <input value={customStepName} onChange={e => setCustomStepName(e.target.value)} placeholder="หรือพิมพ์ชื่อขั้นตอนใหม่..."
                                    className="flex-1 text-sm px-3 py-2.5 rounded-lg focus:outline-none" style={inputStyle}
                                    onKeyDown={async (e) => {
                                        if (e.key === "Enter" && customStepName.trim()) {
                                            try {
                                                await addRepairStep(id as string, "Wrench", customStepName.trim());
                                                toast.success(`เพิ่มขั้นตอน: ${customStepName.trim()}`);
                                                setCustomStepName("");
                                                fetchJob();
                                                setShowStepModal(false);
                                            } catch (err: any) { toast.error(err.message || "ไม่สามารถเพิ่มได้"); }
                                        }
                                    }} />
                                <button onClick={async () => {
                                    if (!customStepName.trim()) return;
                                    try {
                                        await addRepairStep(id as string, "Wrench", customStepName.trim());
                                        toast.success(`เพิ่มขั้นตอน: ${customStepName.trim()}`);
                                        setCustomStepName("");
                                        fetchJob();
                                        setShowStepModal(false);
                                    } catch (err: any) { toast.error(err.message || "ไม่สามารถเพิ่มได้"); }
                                }} disabled={!customStepName.trim()} className="px-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer text-white disabled:opacity-40" style={{ background: "#F97316" }}>
                                    เพิ่ม
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* ──── Consumable Withdraw Modal ──── */}
            <ConsumableWithdrawModal
                open={showConsumables}
                jobId={id as string}
                jobLabel={job ? `${job.jobNo} — ${job.customerName}` : undefined}
                onClose={() => setShowConsumables(false)}
                onSuccess={fetchJob}
            />
            {/* ──── Paint Withdraw Modal ──── */}
            <PaintWithdrawModal
                open={showPaints}
                jobId={id as string}
                jobLabel={job ? `${job.jobNo} — ${job.customerName}` : undefined}
                onClose={() => setShowPaints(false)}
                onSuccess={fetchJob}
            />
            {/* ──── Notes Modal ──── */}
            {showNoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowNoteModal(false)}>
                    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
                    <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)" }} onClick={e => e.stopPropagation()}>
                        <div className="p-5 text-center" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
                            <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                                <StickyNote className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-white">หมายเหตุ</h3>
                            <p className="text-sm text-white/70 mt-1">{job?.jobNo} — {job?.customerName}</p>
                        </div>
                        <div className="p-5 space-y-3" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="เช่น ลูกค้าจะมารับรถพรุ่งนี้ 10.00 น."
                                className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none" rows={3}
                                style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                            {jobNotes.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--t-text-muted)" }}>หมายเหตุก่อนหน้า</p>
                                    {jobNotes.map((n: any) => (
                                        <div key={n.id} className="rounded-lg p-3 mb-2" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                            <p className="text-sm" style={{ color: "var(--t-text)" }}>{n.note}</p>
                                            <p className="text-[10px] mt-1" style={{ color: "var(--t-text-dim)" }}>{new Date(n.createdAt).toLocaleString("th-TH")}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 flex gap-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setShowNoteModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-muted)" }}>ยกเลิก</button>
                            <button onClick={handleAddNote} disabled={!noteText.trim() || noteSaving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
                                {noteSaving ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ──── Barcode Print Modal ──── */}
            <BarcodeModal part={barcodePart} onClose={() => setBarcodePart(null)} />
        </div >
    );
}

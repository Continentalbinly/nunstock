"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Search, CheckCircle2, Minus, Plus, Wrench, Briefcase, User, Package } from "lucide-react";
import { getParts, addJobPart, getUsers } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";

interface Props {
    open: boolean;
    jobId?: string;
    jobLabel?: string;
    preSelectedPart?: any;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ConsumableWithdrawModal({ open, jobId, jobLabel, preSelectedPart, onClose, onSuccess }: Props) {
    const { user } = useAuthStore();
    const [activeJobs, setActiveJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState(jobId || "");
    const [loadingJobs, setLoadingJobs] = useState(false);

    const [consumables, setConsumables] = useState<any[]>([]);
    const [loadingCons, setLoadingCons] = useState(false);
    const [consSearch, setConsSearch] = useState("");
    const [selectedCons, setSelectedCons] = useState<Record<string, { qty: number; name: string; unit: string; maxQty: number }>>({});

    const [withdrawnBy, setWithdrawnBy] = useState("");
    const [saving, setSaving] = useState(false);
    const [techUsers, setTechUsers] = useState<any[]>([]);

    const hasPreSelected = !!preSelectedPart;

    useEffect(() => {
        if (open) {
            setSelectedJobId(jobId || "");
            setConsSearch("");
            setWithdrawnBy(user?.role === "TECH" ? user.name : "");
            if (preSelectedPart) {
                setSelectedCons({
                    [preSelectedPart.id]: {
                        qty: 1,
                        name: preSelectedPart.name,
                        unit: preSelectedPart.unit || "ชิ้น",
                        maxQty: preSelectedPart.quantity || 999,
                    }
                });
            } else {
                setSelectedCons({});
                loadConsumables();
            }
            if (!jobId) loadActiveJobs();
            if (user?.role === "ADMIN") loadTechUsers();
        }
    }, [open, jobId, preSelectedPart, user]);

    const loadTechUsers = async () => {
        try {
            const users = await getUsers();
            setTechUsers((users || []).filter((u: any) => u.role === "TECH"));
        } catch { setTechUsers([]); }
    };

    const loadActiveJobs = async () => {
        setLoadingJobs(true);
        try {
            const res = await fetch("/api/jobs/active-jobs", { credentials: "include" });
            const json = await res.json();
            if (json.success) setActiveJobs(json.data || []);
        } catch { setActiveJobs([]); }
        finally { setLoadingJobs(false); }
    };

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
            if (next[part.id]) delete next[part.id];
            else next[part.id] = { qty: 1, name: part.name, unit: part.unit || "ชิ้น", maxQty: part.quantity || 999 };
            return next;
        });
    };

    const updateQty = (partId: string, delta: number) => {
        setSelectedCons(prev => {
            const cur = prev[partId];
            if (!cur) return prev;
            const newQty = Math.max(1, Math.min(cur.maxQty, cur.qty + delta));
            return { ...prev, [partId]: { ...cur, qty: newQty } };
        });
    };

    const effectiveJobId = jobId || selectedJobId;

    const handleSubmit = async () => {
        if (!effectiveJobId) { toast.error("กรุณาเลือก Job"); return; }
        if (Object.keys(selectedCons).length === 0) { toast.error("กรุณาเลือกวัสดุ"); return; }
        if (!withdrawnBy.trim()) { toast.error("กรุณาระบุชื่อผู้เบิก"); return; }
        setSaving(true);
        try {
            for (const [sourceId, info] of Object.entries(selectedCons)) {
                await addJobPart(effectiveJobId, {
                    source: "CONSUMABLE", sourceId,
                    partName: info.name, quantity: info.qty, unit: info.unit,
                    withdrawnBy: withdrawnBy.trim(),
                });
            }
            toast.success(`เบิกวัสดุ ${Object.keys(selectedCons).length} รายการสำเร็จ`);
            onClose();
            onSuccess?.();
        } catch (err: any) { toast.error(err.message || "ไม่สามารถเบิกได้"); }
        finally { setSaving(false); }
    };

    if (!open) return null;

    const filtered = consSearch
        ? consumables.filter(c => c.name.toLowerCase().includes(consSearch.toLowerCase()) || c.code?.toLowerCase().includes(consSearch.toLowerCase()))
        : consumables;

    const inputStyle = { background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" };
    const selectedJob = activeJobs.find(j => j.id === selectedJobId);
    const isTechUser = user?.role === "TECH";

    return (
        <div className="fixed inset-0 z-9998 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", animation: "fadeIn 150ms ease" }}
            onClick={() => !saving && onClose()}>
            <div className={`w-[92%] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${hasPreSelected ? "max-w-sm" : "max-w-md max-h-[85vh]"}`}
                style={{ background: "var(--t-modal-bg)", border: "1px solid var(--t-modal-border)", animation: "slideUp 200ms ease" }}
                onClick={e => e.stopPropagation()}>

                {/* ─── Header ─── */}
                <div className="px-5 py-4 flex items-center justify-between shrink-0"
                    style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(249,115,22,0.04))", borderBottom: "1px solid var(--t-border-subtle)" }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>
                                {hasPreSelected ? `เบิก ${preSelectedPart.name}` : "เบิกวัสดุสิ้นเปลือง"}
                            </h3>
                            <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                                {jobLabel || (hasPreSelected ? `คงเหลือ ${preSelectedPart.quantity} ${preSelectedPart.unit}` : "เลือกวัสดุ → เลือก Job → เบิก")}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-black/5" style={{ color: "var(--t-text-muted)" }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ─── Body ─── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Pre-selected part card */}
                    {hasPreSelected && (
                        <div className="rounded-xl p-4 flex items-center gap-4"
                            style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.3)" }}>
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: "rgba(245,158,11,0.15)" }}>
                                <Package className="w-5 h-5" style={{ color: "#F59E0B" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate" style={{ color: "#F59E0B" }}>{preSelectedPart.name}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                                    {preSelectedPart.code} • คงเหลือ {preSelectedPart.quantity} {preSelectedPart.unit}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button type="button" onClick={() => updateQty(preSelectedPart.id, -1)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95"
                                    style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                    <Minus className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
                                </button>
                                <span className="text-lg font-bold w-8 text-center" style={{ color: "#F59E0B" }}>
                                    {selectedCons[preSelectedPart.id]?.qty || 1}
                                </span>
                                <button type="button" onClick={() => updateQty(preSelectedPart.id, 1)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95"
                                    style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                    <Plus className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Job selector */}
                    {!jobId && (
                        <div>
                            <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--t-text-secondary)" }}>
                                <Briefcase className="w-3.5 h-3.5" style={{ color: "#F97316" }} /> เลือก Job <span style={{ color: "#EF4444" }}>*</span>
                            </label>
                            {loadingJobs ? (
                                <div className="rounded-lg px-3 py-2.5 text-xs" style={{ ...inputStyle, color: "var(--t-text-muted)" }}>กำลังโหลด...</div>
                            ) : (
                                <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer" style={inputStyle}>
                                    <option value="">-- เลือก Job --</option>
                                    {activeJobs.map(j => (
                                        <option key={j.id} value={j.id}>{j.jobNo} — {j.customerName} ({j.carBrand} {j.carModel})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Mechanic selector */}
                    <div>
                        <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--t-text-secondary)" }}>
                            <User className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} /> ชื่อผู้เบิก (ช่าง) <span style={{ color: "#EF4444" }}>*</span>
                        </label>
                        {isTechUser ? (
                            <div className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold"
                                style={{ ...inputStyle, color: "#8B5CF6", background: "rgba(139,92,246,0.06)" }}>
                                {user.name}
                            </div>
                        ) : (
                            <select value={withdrawnBy} onChange={e => setWithdrawnBy(e.target.value)}
                                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer" style={inputStyle}>
                                <option value="">-- เลือกช่าง --</option>
                                {techUsers.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Consumable list — only if NO preSelectedPart */}
                    {!hasPreSelected && (
                        <>
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--t-text-dim)" }} />
                                <input value={consSearch} onChange={e => setConsSearch(e.target.value)}
                                    className="w-full rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20" style={inputStyle}
                                    placeholder="ค้นหาวัสดุ..." />
                            </div>

                            {loadingCons ? (
                                <div className="py-6 text-center">
                                    <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: "var(--t-border)", borderTopColor: "#F59E0B" }} />
                                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>กำลังโหลด...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="py-6 text-center rounded-lg" style={{ background: "var(--t-badge-bg)" }}>
                                    <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                                        {consumables.length === 0 ? "ยังไม่มีวัสดุสิ้นเปลือง" : "ไม่พบวัสดุที่ค้นหา"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-lg">
                                    {filtered.map(p => {
                                        const sel = selectedCons[p.id];
                                        return (
                                            <div key={p.id}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all"
                                                style={{
                                                    background: sel ? "rgba(245,158,11,0.06)" : "var(--t-badge-bg)",
                                                    border: `1.5px solid ${sel ? "rgba(245,158,11,0.3)" : "var(--t-border-subtle)"}`,
                                                }}
                                                onClick={() => toggleCons(p)}>
                                                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{
                                                    background: sel ? "#f59e0b" : "transparent",
                                                    border: `2px solid ${sel ? "#f59e0b" : "var(--t-text-dim)"}`,
                                                }}>
                                                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: sel ? "#f59e0b" : "var(--t-text)" }}>{p.name}</p>
                                                    <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>คงเหลือ {p.quantity} {p.unit}</p>
                                                </div>
                                                {sel && (
                                                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                        <button type="button" onClick={() => updateQty(p.id, -1)}
                                                            className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                                            <Minus className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                                                        </button>
                                                        <span className="text-sm font-bold w-6 text-center" style={{ color: "#f59e0b" }}>{sel.qty}</span>
                                                        <button type="button" onClick={() => updateQty(p.id, 1)}
                                                            className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border-subtle)" }}>
                                                            <Plus className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="px-5 py-4 flex gap-3 shrink-0" style={{ borderTop: "1px solid var(--t-border-subtle)", background: "var(--t-modal-bg)" }}>
                    <button onClick={onClose} disabled={saving}
                        className="flex-1 rounded-xl py-2.5 text-sm font-medium cursor-pointer transition-all active:scale-[0.98]"
                        style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>
                        ยกเลิก
                    </button>
                    <button onClick={handleSubmit}
                        disabled={saving || Object.keys(selectedCons).length === 0 || !effectiveJobId || !withdrawnBy.trim()}
                        className="flex-1 font-bold rounded-xl py-2.5 text-sm cursor-pointer text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg hover:-translate-y-0.5"
                        style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" }}>
                        {saving ? "กำลังเบิก..." : `ยืนยันเบิก (${Object.values(selectedCons).reduce((a, b) => a + b.qty, 0)} ชิ้น)`}
                    </button>
                </div>
            </div>
        </div>
    );
}

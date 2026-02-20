"use client";
import { useEffect, useState, useRef } from "react";
import { getParts, getCategories } from "@/lib/api";
import { Barcode, Search, Package, X, Printer, ScanBarcode } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function BarcodePage() {
    const { theme } = useTheme();
    const [parts, setParts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [selectedPart, setSelectedPart] = useState<any>(null);
    const barcodeRef = useRef<HTMLCanvasElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Scanner detection
    const lastKeyTime = useRef(0);
    const keyBuffer = useRef("");
    const [scannerMode, setScannerMode] = useState(false);

    useEffect(() => {
        Promise.all([getParts(), getCategories()])
            .then(([p, c]) => { setParts(p); setCategories(c); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedPart && barcodeRef.current) {
            import("jsbarcode").then((JsBarcode) => {
                JsBarcode.default(barcodeRef.current, selectedPart.code, {
                    format: "CODE128", width: 2, height: 80, displayValue: true,
                    background: "#FFFFFF", lineColor: "#000000", fontSize: 16, font: "monospace", margin: 16, textMargin: 6,
                });
            });
        }
    }, [selectedPart]);

    const filtered = parts.filter((p) => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));
        const matchCat = !categoryFilter || p.categoryId === categoryFilter;
        return matchSearch && matchCat;
    });

    // Handle keyboard in search - scanner detection + Enter to select
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const now = Date.now();
        const timeDiff = now - lastKeyTime.current;

        if (e.key === "Enter") {
            e.preventDefault();
            // Try exact code match first (scanner)
            if (keyBuffer.current.length >= 3) {
                const match = parts.find((p) => p.code.toLowerCase() === keyBuffer.current.toLowerCase());
                if (match) { setSelectedPart(match); setSearch(""); setScannerMode(false); keyBuffer.current = ""; return; }
            }
            // Otherwise select first filtered result
            if (filtered.length === 1) { setSelectedPart(filtered[0]); }
            keyBuffer.current = "";
            return;
        }

        if (timeDiff < 50 && e.key.length === 1) {
            setScannerMode(true);
            keyBuffer.current += e.key;
        } else if (e.key.length === 1) {
            keyBuffer.current = e.key;
            setScannerMode(false);
        }
        lastKeyTime.current = now;
    };

    // Auto-select on scanner complete
    useEffect(() => {
        if (scannerMode && search.length >= 3) {
            const timer = setTimeout(() => {
                const match = parts.find((p) => p.code.toLowerCase() === search.toLowerCase());
                if (match) { setSelectedPart(match); setSearch(""); setScannerMode(false); }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [search, scannerMode, parts]);

    const handlePrint = () => { window.print(); };

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-center"><div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p></div></div>;

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>บาร์โค้ด</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>คลิกที่อะไหล่หรือสแกนบาร์โค้ดเพื่อแสดงและพิมพ์</p>
            </div>

            {/* Search with scanner support */}
            <div className="rounded-xl p-4 mb-6" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {scannerMode ? <ScanBarcode className="w-4 h-4 text-emerald-500 animate-pulse" /> : <Search className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />}
                        </div>
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="ค้นหาหรือสแกนบาร์โค้ด... (ชื่อ, รหัส, ยี่ห้อ)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full rounded-lg pl-10 pr-10 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                            style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1" style={{ color: "var(--t-text-dim)" }}>
                            {scannerMode && <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded font-medium">SCAN</span>}
                            <ScanBarcode className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg px-3 py-2.5 text-sm cursor-pointer min-w-[140px] transition-colors focus:outline-none" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }}>
                        <option value="">ทุกประเภท</option>
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--t-text-muted)" }}>พบ <span className="font-medium" style={{ color: "var(--t-text)" }}>{filtered.length}</span> รายการ</p>

            {/* Parts Grid */}
            {filtered.length === 0 ? (
                <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                    <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                    <p style={{ color: "var(--t-text-muted)" }}>ไม่พบอะไหล่</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filtered.map((p) => {
                        const isLow = p.quantity <= p.minStock;
                        return (
                            <button key={p.id} onClick={() => setSelectedPart(p)} className="text-left rounded-xl p-4 transition-all cursor-pointer group" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22C55E80"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-badge-bg)" }}><Barcode className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></div>
                                    {isLow && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium">ใกล้หมด</span>}
                                </div>
                                <p className="font-medium text-sm mb-0.5 truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
                                <p className="font-mono text-xs mb-1" style={{ color: "var(--t-text-muted)" }}>{p.code}</p>
                                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                                    <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>{p.category?.name}</span>
                                    <span className="text-xs font-medium" style={{ color: isLow ? "#EF4444" : "var(--t-text-secondary)" }}>{p.quantity} {p.unit}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Barcode Modal */}
            {selectedPart && (
                <div className="fixed inset-0 z-100 flex items-center justify-center no-print" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setSelectedPart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-md shadow-2xl" style={{ background: "var(--t-modal-bg)", border: `1px solid var(--t-modal-border)`, animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold" style={{ color: "var(--t-text)" }}>บาร์โค้ด</h3>
                            <button onClick={() => setSelectedPart(null)} className="p-1 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-hover-overlay)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="rounded-lg p-3 mb-4" style={{ background: "var(--t-badge-bg)", border: "1px solid var(--t-border-subtle)" }}>
                            <p className="font-medium" style={{ color: "var(--t-text)" }}>{selectedPart.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="font-mono text-xs" style={{ color: "var(--t-text-muted)" }}>{selectedPart.code}</span>
                                {selectedPart.brand && <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>• {selectedPart.brand}</span>}
                                <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>• {selectedPart.category?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>คงเหลือ:</span>
                                <span className={`text-sm font-bold ${selectedPart.quantity <= selectedPart.minStock ? "text-red-500" : "text-emerald-500"}`}>{selectedPart.quantity} {selectedPart.unit}</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 flex justify-center print-area">
                            <canvas ref={barcodeRef} />
                        </div>

                        <div className="flex gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                            <button onClick={() => setSelectedPart(null)} className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer" style={{ background: "var(--t-input-bg)", color: "var(--t-text-secondary)", border: "1px solid var(--t-input-border)" }}>ปิด</button>
                            <button onClick={handlePrint} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> พิมพ์บาร์โค้ด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

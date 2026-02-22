"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPartsAll, getCategories } from "@/lib/api";
import { getCarLogoUrl } from "@/lib/carLogos";
import { Barcode, Search, Package, X, Printer, ScanBarcode, Car, Wrench, ChevronLeft } from "lucide-react";
import { isElectron, printBarcode } from "@/lib/electron";

type TabType = "shop" | "consumables";

export default function BarcodePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [parts, setParts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>((searchParams.get("tab") as TabType) || "shop");
    const [selectedBrandId, setSelectedBrandId] = useState<string>(searchParams.get("brand") || "");
    const [selectedModelId, setSelectedModelId] = useState<string>(searchParams.get("model") || "");
    const [brandSearch, setBrandSearch] = useState("");
    const [modelSearch, setModelSearch] = useState("");
    const [selectedPart, setSelectedPart] = useState<any>(null);
    const barcodeRef = useRef<HTMLCanvasElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Scanner detection
    const lastKeyTime = useRef(0);
    const keyBuffer = useRef("");
    const [scannerMode, setScannerMode] = useState(false);

    // Root category IDs
    const shopRoot = categories.find(c => c.name === "รถหน้าร้าน" && !c.parentId);
    const consumableRoot = categories.find(c => c.name === "อุปกรณ์สิ้นเปลือง" && !c.parentId);

    // Car brands under shop root
    const shopBrands = categories.filter(c => c.parentId === shopRoot?.id);

    // Selected brand and model objects
    const selectedBrand = shopBrands.find(b => b.id === selectedBrandId) || null;
    const shopModels = selectedBrand ? categories.filter((c: any) => c.parentId === selectedBrand.id) : [];
    const selectedModel = shopModels.find((m: any) => m.id === selectedModelId) || null;

    useEffect(() => {
        Promise.all([getPartsAll(), getCategories()])
            .then(([p, c]) => { setParts(p); setCategories(c); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Sync state with URL on back/forward navigation
    useEffect(() => {
        const tabParam = (searchParams.get("tab") as TabType) || "shop";
        const brandParam = searchParams.get("brand") || "";
        const modelParam = searchParams.get("model") || "";
        if (tabParam !== activeTab) setActiveTab(tabParam);
        if (brandParam !== selectedBrandId) setSelectedBrandId(brandParam);
        if (modelParam !== selectedModelId) setSelectedModelId(modelParam);
    }, [searchParams]);

    useEffect(() => {
        if (selectedPart && barcodeRef.current) {
            import("jsbarcode").then((JsBarcode) => {
                JsBarcode.default(barcodeRef.current, selectedPart.code, {
                    format: "CODE128", width: 3, height: 100, displayValue: true,
                    background: "#FFFFFF", lineColor: "#000000", fontSize: 24, font: "monospace", margin: 10, textMargin: 8,
                });
            });
        }
    }, [selectedPart]);

    // Helper: update URL params
    const updateUrl = (tab: TabType, brandId?: string, modelId?: string) => {
        const params = new URLSearchParams();
        params.set("tab", tab);
        if (brandId) params.set("brand", brandId);
        if (modelId) params.set("model", modelId);
        router.push(`/barcode?${params.toString()}`);
    };

    // Get the root category for a part by walking the parent chain
    const getRootCategoryId = (part: any): string | null => {
        if (!part.category) return null;
        let current = part.category;
        while (current.parent) current = current.parent;
        return current.id || null;
    };

    // Filter parts by tab + brand
    const getFilteredParts = () => {
        let rootId: string | null = null;
        if (activeTab === "shop") rootId = shopRoot?.id || null;
        else if (activeTab === "consumables") rootId = consumableRoot?.id || null;

        return parts.filter(p => {
            // Root category filter
            if (rootId) {
                const partRootId = getRootCategoryId(p);
                if (partRootId !== rootId) return false;
            }
            // Brand filter — now filter by model (for shop tab when a model is selected)
            if (activeTab === "shop" && selectedModelId && p.categoryId !== selectedModelId) return false;
            // Search filter
            if (!search) return true;
            const s = search.toLowerCase();
            return p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || (p.brand && p.brand.toLowerCase().includes(s));
        });
    };

    const filtered = getFilteredParts();

    // Get category label
    const getCategoryLabel = (part: any): string => {
        if (!part.category) return "-";
        return part.category.name;
    };

    // Handle keyboard - scanner detection + Enter to select
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const now = Date.now();
        const timeDiff = now - lastKeyTime.current;

        if (e.key === "Enter") {
            e.preventDefault();
            if (keyBuffer.current.length >= 3) {
                const match = parts.find((p) => p.code.toLowerCase() === keyBuffer.current.toLowerCase());
                if (match) { setSelectedPart(match); setSearch(""); setScannerMode(false); keyBuffer.current = ""; return; }
            }
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

    const handlePrint = async () => {
        if (!barcodeRef.current || !selectedPart) return;
        const dataUrl = barcodeRef.current.toDataURL("image/png");

        if (isElectron()) {
            // Electron: send barcode image to dedicated print window
            const savedPrinter = localStorage.getItem("nunmechanic-printer") || undefined;
            await printBarcode({ imageDataUrl: dataUrl, printerName: savedPrinter });
        } else {
            // Web: append to DOM and use window.print()
            const container = document.createElement("div");
            container.id = "barcode-print";
            container.innerHTML = `<img src="${dataUrl}" />`;
            document.body.appendChild(container);
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    if (container.parentNode) container.parentNode.removeChild(container);
                }, 500);
            }, 100);
        }
    };

    const tabs: { key: TabType; label: string; icon: any; color: string; count: number }[] = [
        {
            key: "shop", label: "อะไหล่หน้าร้าน", icon: Car, color: "#22C55E",
            count: parts.filter(p => getRootCategoryId(p) === shopRoot?.id).length
        },
        {
            key: "consumables", label: "วัสดุสิ้นเปลือง", icon: Wrench, color: "#F59E0B",
            count: parts.filter(p => getRootCategoryId(p) === consumableRoot?.id).length
        },
    ];

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen"><div className="text-center"><div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--t-border)", borderTopColor: "#22C55E" }} /><p style={{ color: "var(--t-text-muted)" }} className="text-sm">กำลังโหลดข้อมูล...</p></div></div>;

    const activeColor = tabs.find(t => t.key === activeTab)?.color || "#22C55E";

    // ─── Shop Tab: Brand Selection View ─────────────────────
    if (activeTab === "shop" && !selectedBrandId) {
        return (
            <div className="p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>บาร์โค้ด</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>คลิกที่อะไหล่หรือสแกนบาร์โค้ดเพื่อแสดงและพิมพ์</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setSelectedBrandId(""); setSelectedModelId(""); setSearch(""); updateUrl(tab.key); }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                            style={{
                                background: activeTab === tab.key ? `${tab.color}15` : "var(--t-input-bg)",
                                border: `1px solid ${activeTab === tab.key ? `${tab.color}40` : "var(--t-input-border)"}`,
                                color: activeTab === tab.key ? tab.color : "var(--t-text-secondary)",
                            }}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{
                                background: activeTab === tab.key ? `${tab.color}20` : "var(--t-badge-bg)",
                                color: activeTab === tab.key ? tab.color : "var(--t-text-muted)"
                            }}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Brand Cards */}
                <p className="text-sm mb-2 font-medium" style={{ color: "var(--t-text-muted)" }}>เลือกยี่ห้อรถเพื่อดูบาร์โค้ดอะไหล่</p>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                    <input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="ค้นหายี่ห้อรถ..." className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {shopBrands.filter((b: any) => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())).map((brand: any) => {
                        const modelCount = categories.filter((c: any) => c.parentId === brand.id).length;
                        return (
                            <button
                                key={brand.id}
                                onClick={() => { setSelectedBrandId(brand.id); setSelectedModelId(""); setSearch(""); updateUrl("shop", brand.id); }}
                                className="group rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center"
                                style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22C55E80"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(34,197,94,0.12)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                            >
                                <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--t-badge-bg)" }}>
                                    {getCarLogoUrl(brand.name) ? (
                                        <img src={getCarLogoUrl(brand.name)!} alt={brand.name} className="w-10 h-10 object-contain" loading="lazy" />
                                    ) : (
                                        <Car className="w-7 h-7" style={{ color: "#22C55E" }} />
                                    )}
                                </div>
                                <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>{brand.name}</p>
                                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{modelCount} รุ่น</p>
                            </button>
                        );
                    })}
                </div>

                {shopBrands.length === 0 && (
                    <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <Car className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                        <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มียี่ห้อรถ</p>
                    </div>
                )}
            </div>
        );
    }

    // ─── Shop Tab: Model Selection View (after brand) ───────────
    if (activeTab === "shop" && selectedBrandId && !selectedModelId) {
        return (
            <div className="p-6 lg:p-8">
                <div className="mb-8">
                    <button
                        onClick={() => { setSelectedBrandId(""); setSelectedModelId(""); setSearch(""); updateUrl("shop"); }}
                        className="flex items-center gap-2 text-sm font-medium mb-3 transition-colors cursor-pointer rounded-lg px-3 py-1.5"
                        style={{ color: "var(--t-text-muted)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-hover-overlay)"; e.currentTarget.style.color = "#22C55E"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-muted)"; }}
                    >
                        <ChevronLeft className="w-4 h-4" /> กลับไปเลือกยี่ห้อ
                    </button>
                    <div className="flex items-center gap-3">
                        {selectedBrand && getCarLogoUrl(selectedBrand.name) && (
                            <img src={getCarLogoUrl(selectedBrand.name)!} alt={selectedBrand.name} className="w-10 h-10 object-contain" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>บาร์โค้ด — {selectedBrand?.name}</h1>
                            <p className="mt-0.5 text-sm" style={{ color: "var(--t-text-muted)" }}>เลือกรุ่นรถเพื่อดูบาร์โค้ดอะไหล่</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                    <input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="ค้นหารุ่นรถ..." className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30" style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-input-text)" }} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {shopModels.filter((m: any) => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase())).map((model: any) => {
                        const modelPartCount = parts.filter(p => p.categoryId === model.id).length;
                        return (
                            <button
                                key={model.id}
                                onClick={() => { setSelectedModelId(model.id); setSearch(""); updateUrl("shop", selectedBrandId, model.id); }}
                                className="group rounded-2xl p-5 transition-all duration-200 cursor-pointer text-center"
                                style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22C55E80"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(34,197,94,0.12)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                            >
                                <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: "var(--t-badge-bg)" }}>
                                    {selectedBrand && getCarLogoUrl(selectedBrand.name) ? (
                                        <img src={getCarLogoUrl(selectedBrand.name)!} alt={selectedBrand.name} className="w-7 h-7 object-contain opacity-60" loading="lazy" />
                                    ) : (
                                        <Car className="w-5 h-5" style={{ color: "#22C55E" }} />
                                    )}
                                </div>
                                <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>{model.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{modelPartCount} อะไหล่</p>
                            </button>
                        );
                    })}
                </div>

                {shopModels.length === 0 && (
                    <div className="rounded-xl text-center py-16" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <Car className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-text-dim)" }} />
                        <p style={{ color: "var(--t-text-muted)" }}>ยังไม่มีรุ่นรถ</p>
                    </div>
                )}
            </div>
        );
    }

    // ─── Parts List View (after selecting brand for shop, or consumables tab) ──
    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                {/* Back button for shop tab with model selected */}
                {activeTab === "shop" && selectedModelId && (
                    <button
                        onClick={() => { setSelectedModelId(""); setSearch(""); updateUrl("shop", selectedBrandId); }}
                        className="flex items-center gap-2 text-sm font-medium mb-3 transition-colors cursor-pointer rounded-lg px-3 py-1.5"
                        style={{ color: "var(--t-text-muted)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-hover-overlay)"; e.currentTarget.style.color = "#22C55E"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-muted)"; }}
                    >
                        <ChevronLeft className="w-4 h-4" /> กลับไปเลือกรุ่น {selectedBrand?.name}
                    </button>
                )}
                <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
                    บาร์โค้ด{activeTab === "shop" && selectedBrand ? ` — ${selectedBrand.name}${selectedModel ? ` ${selectedModel.name}` : ""}` : ""}
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>คลิกที่อะไหล่หรือสแกนบาร์โค้ดเพื่อแสดงและพิมพ์</p>
            </div>

            {/* Tabs (show for consumables, or when in shop-brand view) */}
            <div className="flex gap-2 mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setSelectedBrandId(""); setSelectedModelId(""); setSearch(""); updateUrl(tab.key); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                        style={{
                            background: activeTab === tab.key ? `${tab.color}15` : "var(--t-input-bg)",
                            border: `1px solid ${activeTab === tab.key ? `${tab.color}40` : "var(--t-input-border)"}`,
                            color: activeTab === tab.key ? tab.color : "var(--t-text-secondary)",
                        }}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{
                            background: activeTab === tab.key ? `${tab.color}20` : "var(--t-badge-bg)",
                            color: activeTab === tab.key ? tab.color : "var(--t-text-muted)"
                        }}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Search with scanner support */}
            <div className="flex items-center gap-3 mb-6">
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
                            <button key={p.id} onClick={() => setSelectedPart(p)} className="text-left rounded-xl p-4 transition-all cursor-pointer group" style={{ background: "var(--t-card)", border: `1px solid var(--t-border-subtle)` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${activeColor}80`; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 12px ${activeColor}15`; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${activeColor}15` }}><Barcode className="w-4 h-4" style={{ color: activeColor }} /></div>
                                    {isLow && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium">ใกล้หมด</span>}
                                </div>
                                <p className="font-medium text-sm mb-0.5 truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
                                <p className="font-mono text-xs mb-1" style={{ color: "var(--t-text-muted)" }}>{p.code}</p>
                                {p.brand && <p className="text-xs mb-1" style={{ color: "var(--t-text-dim)" }}>{p.brand}</p>}
                                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                                    <span className="text-xs" style={{ color: "var(--t-text-dim)" }}>{getCategoryLabel(p)}</span>
                                    <span className="text-xs font-medium" style={{ color: isLow ? "#EF4444" : "var(--t-text-secondary)" }}>{p.quantity} {p.unit}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Barcode Modal */}
            {selectedPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center no-print" style={{ background: "var(--t-modal-overlay)", animation: "fadeIn 150ms ease" }} onClick={() => setSelectedPart(null)}>
                    <div className="rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl" style={{ background: "var(--t-modal-bg)", border: `1px solid var(--t-modal-border)`, animation: "slideUp 200ms ease" }} onClick={(e) => e.stopPropagation()}>
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

                        <div className="bg-white rounded-xl p-4 flex justify-center print-area overflow-hidden">
                            <canvas ref={barcodeRef} style={{ maxWidth: "100%", height: "auto" }} />
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

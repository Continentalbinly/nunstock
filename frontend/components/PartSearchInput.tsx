"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ScanBarcode, Package, X, CheckCircle2, AlertTriangle } from "lucide-react";

interface Part {
    id: string;
    code: string;
    name: string;
    brand?: string;
    quantity: number;
    minStock: number;
    unit: string;
    category?: { name: string };
}

interface PartSearchInputProps {
    parts: Part[];
    selectedPartId?: string;
    onSelect: (part: Part) => void;
    onClear?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    label?: string;
    showStock?: boolean;
}

export function PartSearchInput({
    parts,
    selectedPartId,
    onSelect,
    onClear,
    placeholder = "ค้นหาหรือสแกนบาร์โค้ด...",
    autoFocus = false,
    label,
    showStock = true,
}: PartSearchInputProps) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(0);
    const [scannerMode, setScannerMode] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lastKeyTime = useRef(0);
    const keyBuffer = useRef("");
    const scannerTimeout = useRef<NodeJS.Timeout | null>(null);

    const selectedPart = parts.find((p) => p.id === selectedPartId);

    // Filter parts by query
    const filtered = query.trim()
        ? parts.filter((p) => {
            const q = query.toLowerCase();
            return (
                p.code.toLowerCase().includes(q) ||
                p.name.toLowerCase().includes(q) ||
                (p.brand && p.brand.toLowerCase().includes(q))
            );
        })
        : parts;

    // Barcode scanner detection: rapid keystroke = scanner
    const detectScanner = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            const now = Date.now();
            const timeDiff = now - lastKeyTime.current;

            if (e.key === "Enter") {
                e.preventDefault();
                // Check if we have a match from scanner
                if (keyBuffer.current.length >= 3) {
                    const code = keyBuffer.current;
                    const match = parts.find((p) => p.code.toLowerCase() === code.toLowerCase());
                    if (match) {
                        onSelect(match);
                        setQuery("");
                        setIsOpen(false);
                        setScannerMode(false);
                        keyBuffer.current = "";
                        return;
                    }
                }
                // Select highlighted from dropdown
                if (isOpen && filtered.length > 0) {
                    onSelect(filtered[highlightIdx]);
                    setQuery("");
                    setIsOpen(false);
                }
                keyBuffer.current = "";
                return;
            }

            // Detect rapid typing (scanner typically < 50ms between chars)
            if (timeDiff < 50 && e.key.length === 1) {
                setScannerMode(true);
                keyBuffer.current += e.key;
            } else if (e.key.length === 1) {
                keyBuffer.current = e.key;
                setScannerMode(false);
            }

            lastKeyTime.current = now;

            // Keyboard navigation
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIdx((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Escape") {
                setIsOpen(false);
            }
        },
        [parts, filtered, highlightIdx, isOpen, onSelect]
    );

    // Auto-select on scanner complete
    useEffect(() => {
        if (scannerMode && query.length >= 3) {
            if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
            scannerTimeout.current = setTimeout(() => {
                const match = parts.find((p) => p.code.toLowerCase() === query.toLowerCase());
                if (match) {
                    onSelect(match);
                    setQuery("");
                    setIsOpen(false);
                    setScannerMode(false);
                }
            }, 200);
        }
        return () => {
            if (scannerTimeout.current) clearTimeout(scannerTimeout.current);
        };
    }, [query, scannerMode, parts, onSelect]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Reset highlight when filtered changes
    useEffect(() => {
        setHighlightIdx(0);
    }, [filtered.length]);

    // Show selected part
    if (selectedPart && !isOpen) {
        return (
            <div>
                {label && (
                    <label className="text-sm mb-1.5 block font-medium" style={{ color: "var(--t-text-secondary)" }}>
                        {label}
                    </label>
                )}
                <div
                    className="rounded-lg p-3 flex items-center gap-3 transition-all"
                    style={{
                        background: "var(--t-input-bg)",
                        border: "1px solid var(--t-sidebar-active-text)",
                        boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.1)",
                    }}
                >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/15">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>
                            {selectedPart.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                                {selectedPart.code}
                            </span>
                            {selectedPart.brand && (
                                <span className="text-[11px]" style={{ color: "var(--t-text-dim)" }}>
                                    • {selectedPart.brand}
                                </span>
                            )}
                            {showStock && (
                                <span
                                    className={`text-[11px] font-medium ${selectedPart.quantity <= selectedPart.minStock ? "text-red-500" : "text-emerald-500"
                                        }`}
                                >
                                    • เหลือ {selectedPart.quantity} {selectedPart.unit}
                                </span>
                            )}
                        </div>
                    </div>
                    {onClear && (
                        <button
                            type="button"
                            onClick={() => {
                                onClear();
                                setQuery("");
                                setTimeout(() => inputRef.current?.focus(), 50);
                            }}
                            className="p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                            style={{ color: "var(--t-text-muted)" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                                e.currentTarget.style.color = "#EF4444";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "var(--t-text-muted)";
                            }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {label && (
                <label className="text-sm mb-1.5 block font-medium" style={{ color: "var(--t-text-secondary)" }}>
                    {label}
                </label>
            )}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {scannerMode ? (
                        <ScanBarcode className="w-4 h-4 text-emerald-500 animate-pulse" />
                    ) : (
                        <Search className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    autoFocus={autoFocus}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={detectScanner}
                    placeholder={placeholder}
                    className="w-full rounded-lg pl-10 pr-10 py-2.5 text-sm transition-all focus:outline-none"
                    style={{
                        background: "var(--t-input-bg)",
                        border: isOpen ? "1px solid var(--t-sidebar-active-text)" : "1px solid var(--t-input-border)",
                        color: "var(--t-input-text)",
                        boxShadow: isOpen ? "0 0 0 2px rgba(34, 197, 94, 0.1)" : "none",
                    }}
                />
                <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1"
                    style={{ color: "var(--t-text-dim)" }}
                >
                    {scannerMode && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded font-medium">
                            SCAN
                        </span>
                    )}
                    <ScanBarcode className="w-3.5 h-3.5" />
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 rounded-xl shadow-2xl overflow-hidden"
                    style={{
                        background: "var(--t-modal-bg)",
                        border: "1px solid var(--t-modal-border)",
                        maxHeight: "280px",
                        animation: "fadeIn 100ms ease",
                    }}
                >
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center">
                            <Package className="w-6 h-6 mx-auto mb-1" style={{ color: "var(--t-text-dim)" }} />
                            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                                ไม่พบอะไหล่ที่ตรงกับ &quot;{query}&quot;
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto" style={{ maxHeight: "280px" }}>
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-dim)", borderBottom: "1px solid var(--t-border-subtle)" }}>
                                {filtered.length} รายการ {scannerMode && "• สแกนโหมด"}
                            </div>
                            {filtered.slice(0, 50).map((part, idx) => {
                                const isLow = part.quantity <= part.minStock;
                                const isHighlighted = idx === highlightIdx;
                                return (
                                    <button
                                        key={part.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer"
                                        style={{
                                            background: isHighlighted ? "var(--t-hover-overlay)" : "transparent",
                                            borderBottom: "1px solid var(--t-border-subtle)",
                                        }}
                                        onClick={() => {
                                            onSelect(part);
                                            setQuery("");
                                            setIsOpen(false);
                                        }}
                                        onMouseEnter={() => setHighlightIdx(idx)}
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-badge-bg)" }}>
                                            <Package className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>
                                                {part.name}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                                                    {part.code}
                                                </span>
                                                {part.brand && (
                                                    <span className="text-[11px]" style={{ color: "var(--t-text-dim)" }}>
                                                        {part.brand}
                                                    </span>
                                                )}
                                                <span className="text-[11px]" style={{ color: "var(--t-text-dim)" }}>
                                                    {part.category?.name}
                                                </span>
                                            </div>
                                        </div>
                                        {showStock && (
                                            <div className="text-right shrink-0">
                                                <p
                                                    className={`text-sm font-semibold ${isLow ? "text-red-500" : ""}`}
                                                    style={isLow ? {} : { color: "var(--t-text)" }}
                                                >
                                                    {part.quantity}
                                                </p>
                                                <p className="text-[10px]" style={{ color: "var(--t-text-dim)" }}>
                                                    {part.unit}
                                                </p>
                                            </div>
                                        )}
                                        {isLow && (
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    // Build page numbers to show
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                แสดง <span className="font-medium" style={{ color: "var(--t-text)" }}>{start}-{end}</span> จาก <span className="font-medium" style={{ color: "var(--t-text)" }}>{total}</span> รายการ
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: "var(--t-text-secondary)" }}
                    onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.background = "var(--t-hover-overlay)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`dots-${i}`} className="px-2 text-xs" style={{ color: "var(--t-text-dim)" }}>…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${page === p ? "bg-emerald-500 text-white" : ""}`}
                            style={page === p ? {} : { color: "var(--t-text-secondary)" }}
                            onMouseEnter={(e) => { if (page !== p) e.currentTarget.style.background = "var(--t-hover-overlay)"; }}
                            onMouseLeave={(e) => { if (page !== p) e.currentTarget.style.background = "transparent"; }}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: "var(--t-text-secondary)" }}
                    onMouseEnter={(e) => { if (page < totalPages) e.currentTarget.style.background = "var(--t-hover-overlay)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

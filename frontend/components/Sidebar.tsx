"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import {
    LayoutDashboard,
    Package,
    PackagePlus,
    Barcode,
    History,
    ShieldCheck,
    Bell,
    Wrench,
    LogOut,
    Sun,
    Moon,
} from "lucide-react";

const navItems = [
    { href: "/", icon: LayoutDashboard, label: "แดชบอร์ด" },
    { href: "/stock", icon: Package, label: "คลังอะไหล่" },
    { href: "/parts", icon: PackagePlus, label: "จัดการอะไหล่" },
    { href: "/barcode", icon: Barcode, label: "บาร์โค้ด" },
    { href: "/withdraw", icon: History, label: "ประวัติสต็อก" },
    { href: "/claims", icon: ShieldCheck, label: "เคลมประกัน" },
    { href: "/notifications", icon: Bell, label: "แจ้งเตือน" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    const handleLogout = async () => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:1100"}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
        router.push("/login");
        router.refresh();
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: `1px solid var(--t-border-subtle)` }}>
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 style={{ color: "var(--t-text)" }} className="font-bold text-base leading-tight tracking-tight">NunStock</h1>
                    <p style={{ color: "var(--t-text-muted)" }} className="text-[11px]">ระบบคลังอะไหล่</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--t-text-dim)" }}>
                    เมนูหลัก
                </p>
                {navItems.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                            style={{
                                background: active ? "var(--t-sidebar-active-bg)" : "transparent",
                                color: active ? "var(--t-sidebar-active-text)" : "var(--t-sidebar-text)",
                            }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--t-hover-overlay)"; }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                        >
                            <Icon className="w-[18px] h-[18px] shrink-0" />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4" style={{ borderTop: `1px solid var(--t-border-subtle)` }}>
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer mb-1"
                    style={{ color: "var(--t-sidebar-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-hover-overlay)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                    {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                    {isDark ? "ธีมสว่าง" : "ธีมมืด"}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                    style={{ color: "var(--t-text-muted)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; e.currentTarget.style.color = "#F87171"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-muted)"; }}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    ออกจากระบบ
                </button>
                <p style={{ color: "var(--t-text-dim)" }} className="text-[10px] text-center mt-3">v1.0.0 • NunStock</p>
            </div>
        </aside>
    );
}

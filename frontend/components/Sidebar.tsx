"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import {
    LayoutDashboard,
    Car,
    ShieldCheck,
    Wrench as WrenchIcon,
    Barcode,
    Bell,
    LogOut,
    Sun,
    Moon,
    Printer,
    MessageSquare,
    BarChart3,
} from "lucide-react";

const navItems = [
    { href: "/", icon: LayoutDashboard, label: "แดชบอร์ด" },
];

const stockItems = [
    { href: "/shop", icon: Car, label: "อะไหล่หน้าร้าน" },
    { href: "/insurance", icon: ShieldCheck, label: "อะไหล่ประกัน" },
    { href: "/consumables", icon: WrenchIcon, label: "วัสดุสิ้นเปลือง" },
];

const managementItems = [
    { href: "/barcode", icon: Barcode, label: "บาร์โค้ด" },
    { href: "/reports", icon: BarChart3, label: "รายงานสต็อก" },
    { href: "/claims", icon: ShieldCheck, label: "เคลมประกัน" },
    { href: "/line", icon: MessageSquare, label: "LINE Operations" },
    { href: "/notifications", icon: Bell, label: "แจ้งเตือน" },
    { href: "/printer-settings", icon: Printer, label: "เครื่องปริ้น" },
];

function NavLink({ href, icon: Icon, label, pathname }: { href: string; icon: any; label: string; pathname: string }) {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
        <Link
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
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    const handleLogout = async () => {
        await fetch("/api/auth/logout", {
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
                    <WrenchIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 style={{ color: "var(--t-text)" }} className="font-bold text-base leading-tight tracking-tight">นันการช่าง</h1>
                    <p style={{ color: "var(--t-text-muted)" }} className="text-[11px]">ร้านซ่อมรถยนต์</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {/* Dashboard */}
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--t-text-dim)" }}>
                    เมนูหลัก
                </p>
                {navItems.map((item) => (
                    <NavLink key={item.href} {...item} pathname={pathname} />
                ))}

                {/* คลังอะไหล่ */}
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest mb-2 mt-5" style={{ color: "var(--t-text-dim)" }}>
                    คลังอะไหล่
                </p>
                {stockItems.map((item) => (
                    <NavLink key={item.href} {...item} pathname={pathname} />
                ))}

                {/* จัดการ */}
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest mb-2 mt-5" style={{ color: "var(--t-text-dim)" }}>
                    จัดการ
                </p>
                {managementItems.map((item) => (
                    <NavLink key={item.href} {...item} pathname={pathname} />
                ))}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4" style={{ borderTop: `1px solid var(--t-border-subtle)` }}>
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
                <p style={{ color: "var(--t-text-dim)" }} className="text-[10px] text-center mt-3">v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"} • นันการช่าง</p>
            </div>
        </aside>
    );
}

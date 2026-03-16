"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getNavigationForRole, getMobileNavForRole, type NavItem } from "@/lib/config/navigation";
import {
    Menu,
    X,
    LogOut,
    Sun,
    Moon,
    User,
    type LucideIcon,
} from "lucide-react";

// ─── Mobile NavLink ─────────────────────────────────────

function MobileNavLink({
    href,
    icon: Icon,
    label,
    pathname,
    onNavigate,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
    pathname: string;
    onNavigate: () => void;
}) {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
    return (
        <Link
            href={href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
                background: active ? "var(--t-sidebar-active-bg)" : "transparent",
                color: active ? "var(--t-sidebar-active-text)" : "var(--t-text)",
            }}
        >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
        </Link>
    );
}

// ─── MobileHeader ───────────────────────────────────────

export function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuthStore();
    const isDark = theme === "dark";
    const drawerRef = useRef<HTMLDivElement>(null);

    const navigation = getNavigationForRole(user?.role);

    // Exclude items already shown in BottomNav from the drawer
    const bottomNavHrefs = new Set(getMobileNavForRole(user?.role).map((i) => i.href));
    const drawerNavigation = navigation
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => !bottomNavHrefs.has(item.href)),
        }))
        .filter((group) => group.items.length > 0);

    // Close drawer on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Listen for "More" button from BottomNav
    useEffect(() => {
        const handler = () => setIsOpen((prev) => !prev);
        window.addEventListener("toggle-mobile-drawer", handler);
        return () => window.removeEventListener("toggle-mobile-drawer", handler);
    }, []);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
        router.push("/login");
    };

    return (
        <>
            {/* ── Sticky Header Bar ── */}
            <header
                className="mobile-header"
                style={{
                    background: "var(--t-surface)",
                    borderBottom: "1px solid var(--t-border-subtle)",
                }}
            >
                <div className="flex items-center gap-2.5">
                    <img src="/logo.jpeg" alt="นันการช่าง" className="w-8 h-8 rounded-lg shrink-0 shadow-md object-cover" />
                    <div>
                        <h1
                            style={{ color: "var(--t-text)" }}
                            className="font-bold text-sm leading-tight tracking-tight"
                        >
                            นันการช่าง
                        </h1>
                        <p
                            style={{ color: "var(--t-text-muted)" }}
                            className="text-[10px] leading-tight"
                            suppressHydrationWarning
                        >
                            {user
                                ? `${user.name} • ${user.role === "ADMIN" ? "ผู้ดูแล" : "ช่าง"}`
                                : "ร้านซ่อมรถยนต์"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer"
                        style={{ color: "var(--t-text-muted)" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--t-hover-overlay)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                        }}
                    >
                        {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer"
                        style={{ color: "var(--t-text)" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--t-hover-overlay)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                        }}
                    >
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* ── Backdrop ── */}
            {isOpen && (
                <div
                    className="mobile-drawer-backdrop"
                    style={{ background: "var(--t-modal-overlay)" }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* ── Navigation Drawer ── */}
            <div
                ref={drawerRef}
                className={`mobile-drawer ${isOpen ? "mobile-drawer--open" : ""}`}
                style={{
                    background: "var(--t-surface)",
                    borderBottom: "1px solid var(--t-border-subtle)",
                }}
            >
                {/* User Info */}
                <div
                    className="flex items-center gap-3 px-4 py-3 mx-3 mb-2 rounded-xl"
                    style={{ background: "var(--t-hover-overlay)" }}
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "var(--t-sidebar-active-bg)" }}
                    >
                        <User className="w-5 h-5" style={{ color: "var(--t-sidebar-active-text)" }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                            {user?.name || "—"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                            {user?.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ช่างเทคนิค"}
                        </p>
                    </div>
                </div>

                {/* Nav Groups */}
                <nav className="px-3 pb-2 space-y-1 overflow-y-auto max-h-[60vh]">
                    {drawerNavigation.map((group, gi) => (
                        <div key={group.title}>
                            <p
                                className={`px-4 text-[10px] font-semibold uppercase tracking-widest mb-1 ${gi > 0 ? "mt-3" : ""}`}
                                style={{ color: "var(--t-text-dim)" }}
                            >
                                {group.title}
                            </p>
                            {group.items.map((item) => (
                                <MobileNavLink
                                    key={item.href}
                                    {...item}
                                    pathname={pathname}
                                    onNavigate={() => setIsOpen(false)}
                                />
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Logout */}
                <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ color: "var(--t-text-muted)" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                            e.currentTarget.style.color = "#F87171";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--t-text-muted)";
                        }}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        ออกจากระบบ
                    </button>
                </div>
            </div>
        </>
    );
}

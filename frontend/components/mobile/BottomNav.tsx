"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getMobileNavForRole } from "@/lib/config/navigation";

export function BottomNav() {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const items = getMobileNavForRole(user?.role);

    return (
        <nav
            className="bottom-nav"
            style={{
                background: "var(--t-surface)",
                borderTop: "1px solid var(--t-border-subtle)",
            }}
        >
            {items.map((item) => {
                const Icon = item.icon;
                const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href + "/"));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="bottom-nav__item"
                        style={{
                            color: active
                                ? "var(--t-sidebar-active-text)"
                                : "var(--t-text-muted)",
                        }}
                    >
                        {/* Active indicator dot */}
                        <span
                            className="bottom-nav__indicator"
                            style={{
                                background: active ? "var(--t-sidebar-active-text)" : "transparent",
                                opacity: active ? 1 : 0,
                            }}
                        />
                        <Icon
                            className="w-5 h-5 transition-transform duration-200"
                            style={{
                                transform: active ? "scale(1.1)" : "scale(1)",
                            }}
                        />
                        <span
                            className="text-[10px] font-medium leading-tight mt-0.5"
                            style={{
                                fontWeight: active ? 600 : 500,
                            }}
                        >
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}


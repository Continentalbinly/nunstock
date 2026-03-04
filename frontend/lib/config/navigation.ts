import {
    LayoutDashboard,
    Wrench,
    Palette,
    Warehouse,
    ShieldCheck,
    BarChart3,
    Users,
    MessageSquare,
    Bell,
    Printer,
    type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/stores/auth-store";

// ─── Types ──────────────────────────────────────────────

export interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
    /** Roles ที่เห็นเมนูนี้ — ถ้า [] หรือไม่ระบุ = ทุก role เห็น */
    roles: UserRole[];
}

export interface NavGroup {
    title: string;
    items: NavItem[];
    /** ถ้าระบุ → แสดง group title เฉพาะ roles เหล่านี้ */
    roles?: UserRole[];
}

// ─── Navigation Config ──────────────────────────────────

export const NAVIGATION: NavGroup[] = [
    {
        title: "เมนูหลัก",
        items: [
            { href: "/", icon: LayoutDashboard, label: "แดชบอร์ด", roles: [] },
            { href: "/jobs", icon: Wrench, label: "งานซ่อม", roles: ["ADMIN"] },
        ],
    },
    {
        title: "คลังอะไหล่",
        items: [
            { href: "/paints", icon: Palette, label: "คลังสี", roles: [] },
            { href: "/shop-stock", icon: Warehouse, label: "สต็อกอู่", roles: ["ADMIN"] },
            { href: "/insurance", icon: ShieldCheck, label: "อะไหล่ประกัน", roles: ["ADMIN"] },
            { href: "/consumables", icon: Wrench, label: "วัสดุสิ้นเปลือง", roles: [] },
        ],
    },
    {
        title: "จัดการ",
        roles: ["ADMIN"],
        items: [
            { href: "/reports", icon: BarChart3, label: "สรุปรายงาน", roles: ["ADMIN"] },
            { href: "/settings/users", icon: Users, label: "จัดการผู้ใช้", roles: ["ADMIN"] },
            { href: "/line", icon: MessageSquare, label: "LINE Operations", roles: ["ADMIN"] },
            { href: "/notifications", icon: Bell, label: "แจ้งเตือน", roles: ["ADMIN"] },
            { href: "/printer-settings", icon: Printer, label: "เครื่องปริ้น", roles: ["ADMIN"] },
        ],
    },
];

// ─── Helpers ────────────────────────────────────────────

/** Check if a user role can see this nav item */
export function canAccessItem(item: NavItem, role: UserRole | undefined): boolean {
    if (item.roles.length === 0) return true; // open to all
    if (!role) return false;
    return item.roles.includes(role);
}

/** Check if a user role can see this nav group */
export function canAccessGroup(group: NavGroup, role: UserRole | undefined): boolean {
    if (!group.roles || group.roles.length === 0) return true;
    if (!role) return false;
    return group.roles.includes(role);
}

/** Get filtered navigation for a specific role */
export function getNavigationForRole(role: UserRole | undefined): NavGroup[] {
    return NAVIGATION
        .filter((group) => canAccessGroup(group, role))
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => canAccessItem(item, role)),
        }))
        .filter((group) => group.items.length > 0);
}

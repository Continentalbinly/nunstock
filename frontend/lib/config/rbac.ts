import type { UserRole } from "@/lib/stores/auth-store";

/**
 * Route-level RBAC config.
 * Key = route prefix, Value = allowed roles (empty array = all roles).
 * 
 * The ProtectedRoute component matches the current pathname against these
 * entries in order — the first match wins.
 */
export const ROUTE_PERMISSIONS: { path: string; roles: UserRole[] }[] = [
    // Open to all authenticated users
    { path: "/", roles: [] },
    { path: "/paints", roles: [] },
    { path: "/consumables", roles: [] },

    // Admin only
    { path: "/jobs", roles: ["ADMIN"] },
    { path: "/shop-stock", roles: ["ADMIN"] },
    { path: "/insurance", roles: ["ADMIN"] },
    { path: "/reports", roles: ["ADMIN"] },
    { path: "/settings", roles: ["ADMIN"] },
    { path: "/line", roles: ["ADMIN"] },
    { path: "/notifications", roles: ["ADMIN"] },
    { path: "/printer-settings", roles: ["ADMIN"] },
];

/**
 * Check if a given role is allowed on the given pathname.
 * Returns true if allowed, false if denied.
 */
export function isRouteAllowed(pathname: string, role: UserRole | undefined): boolean {
    // Find matching route permission (first match wins)
    const match = ROUTE_PERMISSIONS.find((perm) => {
        if (perm.path === "/") return pathname === "/";
        return pathname === perm.path || pathname.startsWith(perm.path + "/");
    });

    // If no matching route config found, default to allow (open route)
    if (!match) return true;

    // Empty roles array means all authenticated users can access
    if (match.roles.length === 0) return true;

    // Check role
    if (!role) return false;
    return match.roles.includes(role);
}

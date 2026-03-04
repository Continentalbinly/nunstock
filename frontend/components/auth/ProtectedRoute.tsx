"use client";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { isRouteAllowed } from "@/lib/config/rbac";
import { useEffect, type ReactNode } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
}

/**
 * Client-side route guard.
 * - If not authenticated → redirect to /login
 * - If role doesn't match → redirect to / (unauthorized)
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (loading) return; // still validating token

        if (!isAuthenticated) {
            router.replace("/login");
            return;
        }

        if (!isRouteAllowed(pathname, user?.role)) {
            router.replace("/");
        }
    }, [loading, isAuthenticated, user?.role, pathname, router]);

    // While loading, show nothing (middleware already shows the page shell)
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "var(--t-border-subtle)", borderTopColor: "transparent" }}
                    />
                    <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                        กำลังตรวจสอบสิทธิ์...
                    </p>
                </div>
            </div>
        );
    }

    // Not authenticated or wrong role → will redirect via useEffect
    if (!isAuthenticated || !isRouteAllowed(pathname, user?.role)) {
        return null;
    }

    return <>{children}</>;
}

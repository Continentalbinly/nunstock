"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname.startsWith("/login");

    // Login page: no auth gate, no sidebar, no protection
    if (isLoginPage) {
        return <main>{children}</main>;
    }

    // All other pages: validate token → check role → render with sidebar
    return (
        <AuthGate>
            <ProtectedRoute>
                <Sidebar />
                <main className="main-content">{children}</main>
            </ProtectedRoute>
        </AuthGate>
    );
}

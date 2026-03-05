"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { BottomNav } from "@/components/mobile/BottomNav";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname.startsWith("/login");

    // Login page: no auth gate, no sidebar, no protection
    if (isLoginPage) {
        return <main>{children}</main>;
    }

    // All other pages: validate token → check role → render with sidebar + mobile nav
    return (
        <AuthGate>
            <ProtectedRoute>
                {/* Desktop: sidebar visible, mobile components hidden */}
                <Sidebar />
                {/* Mobile: header + bottom nav visible, sidebar hidden */}
                <MobileHeader />
                <main className="main-content">{children}</main>
                <BottomNav />
            </ProtectedRoute>
        </AuthGate>
    );
}


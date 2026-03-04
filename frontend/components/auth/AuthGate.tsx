"use client";
import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

interface AuthGateProps {
    children: ReactNode;
}

/**
 * AuthGate — validates the user's token on app startup.
 * 
 * Placed in ClientLayout to run fetchMe() once when the app loads.
 * This component does NOT redirect — that's the job of ProtectedRoute.
 * It only initializes the auth state from the server.
 */
export function AuthGate({ children }: AuthGateProps) {
    const fetchMe = useAuthStore((s) => s.fetchMe);

    useEffect(() => {
        fetchMe();
    }, [fetchMe]);

    return <>{children}</>;
}

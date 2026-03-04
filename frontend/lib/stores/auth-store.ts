"use client";
import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────
export type UserRole = "ADMIN" | "TECH";

export interface AuthUser {
    id: string;
    username: string;
    name: string;
    role: UserRole;
}

interface AuthState {
    user: AuthUser | null;
    loading: boolean;

    // Derived
    isAuthenticated: boolean;
    isAdmin: boolean;
    isTech: boolean;

    // Actions
    login: (userData: AuthUser) => void;
    logout: () => Promise<void>;
    fetchMe: () => Promise<void>;
    reset: () => void;
}

// ─── Store ──────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    loading: true,

    // Derived (recomputed on every set)
    isAuthenticated: false,
    isAdmin: false,
    isTech: false,

    // Called by login page after successful auth
    login: (userData: AuthUser) => {
        set({
            user: userData,
            loading: false,
            isAuthenticated: true,
            isAdmin: userData.role === "ADMIN",
            isTech: userData.role === "TECH",
        });
    },

    // Logout: clear state + call API to delete cookie
    logout: async () => {
        set({
            user: null,
            loading: false,
            isAuthenticated: false,
            isAdmin: false,
            isTech: false,
        });
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {
            // ignore network errors during logout
        }
    },

    // Validate token against server (called on app init)
    fetchMe: async () => {
        try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            const data = await res.json();
            if (data.success && data.data) {
                const u = data.data as AuthUser;
                set({
                    user: u,
                    loading: false,
                    isAuthenticated: true,
                    isAdmin: u.role === "ADMIN",
                    isTech: u.role === "TECH",
                });
            } else {
                set({
                    user: null,
                    loading: false,
                    isAuthenticated: false,
                    isAdmin: false,
                    isTech: false,
                });
            }
        } catch {
            set({
                user: null,
                loading: false,
                isAuthenticated: false,
                isAdmin: false,
                isTech: false,
            });
        }
    },

    // Hard reset (for testing or error recovery)
    reset: () => {
        set({
            user: null,
            loading: true,
            isAuthenticated: false,
            isAdmin: false,
            isTech: false,
        });
    },
}));

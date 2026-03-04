"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthUser {
    id: string;
    username: string;
    name: string;
    role: "ADMIN" | "TECH";
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    isAdmin: boolean;
    refresh: () => Promise<void>;
    login: (userData: AuthUser) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    refresh: async () => { },
    login: () => { },
    logout: async () => { },
});

const CACHE_KEY = "nunstock_user";

function getCachedUser(): AuthUser | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setCachedUser(user: AuthUser | null) {
    try {
        if (user) sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
        else sessionStorage.removeItem(CACHE_KEY);
    } catch { }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    // Initialize from cache → instant UI
    const [user, setUser] = useState<AuthUser | null>(() => getCachedUser());
    const [loading, setLoading] = useState(() => !getCachedUser());

    // Called by login page after successful auth → updates state immediately
    const login = useCallback((userData: AuthUser) => {
        setUser(userData);
        setCachedUser(userData);
        setLoading(false);
    }, []);

    // Logout: clear everything
    const logout = useCallback(async () => {
        setCachedUser(null);
        setUser(null);
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch { }
        router.push("/login");
    }, [router]);

    // Background validation of token
    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setUser(data.data);
                setCachedUser(data.data);
            } else {
                setUser(null);
                setCachedUser(null);
                if (pathname !== "/login") router.replace("/login");
            }
        } catch {
            setUser(null);
            setCachedUser(null);
            if (pathname !== "/login") router.replace("/login");
        } finally {
            setLoading(false);
        }
    }, [pathname, router]);

    useEffect(() => {
        fetchUser();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAdmin: user?.role === "ADMIN",
            refresh: fetchUser,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

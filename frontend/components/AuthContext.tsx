"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    refresh: async () => { },
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
    // Initialize from cache → instant UI, no blank flash
    const [user, setUser] = useState<AuthUser | null>(() => getCachedUser());
    const [loading, setLoading] = useState(() => !getCachedUser());

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setUser(data.data);
                setCachedUser(data.data);
            } else {
                setUser(null);
                setCachedUser(null);
                // Token invalid → redirect to login (only if not already on login)
                if (pathname !== "/login") {
                    router.replace("/login");
                }
            }
        } catch {
            setUser(null);
            setCachedUser(null);
            if (pathname !== "/login") {
                router.replace("/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAdmin: user?.role === "ADMIN",
            refresh: fetchUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

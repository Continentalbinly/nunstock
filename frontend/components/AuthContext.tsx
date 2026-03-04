"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            const data = await res.json();
            if (data.success) setUser(data.data);
            else setUser(null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
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

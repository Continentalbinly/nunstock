"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => { } });

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("nunstock-theme") as Theme | null;
        if (saved === "light" || saved === "dark") {
            setTheme(saved);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("nunstock-theme", theme);
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme, mounted]);

    const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

    // Prevent flash of wrong theme
    if (!mounted) {
        return (
            <div data-theme="dark" style={{ visibility: "hidden" }}>
                {children}
            </div>
        );
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { Wrench, Eye, EyeOff, LogIn, Sun, Moon, Download } from "lucide-react";
import { isElectron } from "@/lib/electron";

export default function LoginPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isElectronApp, setIsElectronApp] = useState(false);

    useEffect(() => {
        setIsElectronApp(isElectron());
    }, []);

    useEffect(() => {
        const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === "accepted") setInstallPrompt(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300"
            style={{ background: isDark ? "linear-gradient(135deg, #020617 0%, #0F172A 50%, #020617 100%)" : "linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)" }}
        >
            {/* Theme Toggle - top right */}
            <div className="absolute top-6 right-6 z-20">
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                    style={{
                        background: "var(--t-card)",
                        border: "1px solid var(--t-border-subtle)",
                        color: "var(--t-text-secondary)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-card-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--t-card)"; }}
                    title={isDark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>

            {/* Background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: isDark ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.08)" }} />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: isDark ? "rgba(249,115,22,0.05)" : "rgba(249,115,22,0.08)" }} />
            </div>

            <div className="w-full max-w-sm relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25">
                        <Wrench className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--t-text)" }}>นันการช่าง</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--t-text-muted)" }}>ระบบจัดการอะไหล่ร้านซ่อมรถยนต์</p>
                </div>

                {/* Card */}
                <div
                    className="rounded-2xl p-8 shadow-2xl transition-colors duration-300"
                    style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}
                >
                    <h2 className="font-semibold text-lg mb-6 text-center" style={{ color: "var(--t-text)" }}>เข้าสู่ระบบ</h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="text-sm mb-1.5 block font-medium" style={{ color: "var(--t-text-secondary)" }}>ชื่อผู้ใช้</label>
                            <input
                                id="username"
                                autoFocus
                                placeholder="กรอกชื่อผู้ใช้"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                required
                                className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                                style={{
                                    background: "var(--t-input-bg)",
                                    border: "1px solid var(--t-input-border)",
                                    color: "var(--t-input-text)",
                                }}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm mb-1.5 block font-medium" style={{ color: "var(--t-text-secondary)" }}>รหัสผ่าน</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="กรอกรหัสผ่าน"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                                    style={{
                                        background: "var(--t-input-bg)",
                                        border: "1px solid var(--t-input-border)",
                                        color: "var(--t-input-text)",
                                    }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer" style={{ color: "var(--t-text-muted)" }}>
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-2.5 mt-2 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <LogIn className="w-4 h-4" />
                            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        </button>
                    </form>
                </div>

                {/* Download Section - hide in Electron */}
                {!isElectronApp && (
                    <div className="mt-6 rounded-xl p-4 text-center" style={{ background: "var(--t-card)", border: "1px solid var(--t-border-subtle)" }}>
                        <p className="text-xs font-medium mb-3" style={{ color: "var(--t-text-muted)" }}>📥 ดาวน์โหลดแอปนันการช่าง</p>
                        <div className="flex gap-2">
                            {/* Desktop .exe */}
                            <a
                                href="https://github.com/Continentalbinly/nunstock/releases/tag/latest"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                                style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-secondary)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22C55E60"; e.currentTarget.style.color = "#22C55E"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-input-border)"; e.currentTarget.style.color = "var(--t-text-secondary)"; }}
                            >
                                <Download className="w-4 h-4" />
                                Windows (.exe)
                            </a>
                            {/* PWA Install */}
                            <button
                                onClick={installPrompt ? handleInstall : undefined}
                                disabled={!installPrompt}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-input-border)", color: "var(--t-text-secondary)" }}
                                onMouseEnter={(e) => { if (installPrompt) { e.currentTarget.style.borderColor = "#F9731660"; e.currentTarget.style.color = "#F97316"; } }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--t-input-border)"; e.currentTarget.style.color = "var(--t-text-secondary)"; }}
                                title={installPrompt ? "ติดตั้งเป็นเว็บแอป" : "เปิดใน Chrome/Edge เพื่อติดตั้ง"}
                            >
                                <Download className="w-4 h-4" />
                                {installPrompt ? "ติดตั้ง PWA" : "PWA (ใช้ Chrome)"}
                            </button>
                        </div>
                    </div>
                )}

                <p className="text-center text-xs mt-4" style={{ color: "var(--t-text-dim)" }}>© 2026 นันการช่าง v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</p>
            </div>
        </div>
    );
}

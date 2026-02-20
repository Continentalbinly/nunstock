import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { headers } from "next/headers";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "NunStock - ระบบคลังอะไหล่ร้านซ่อมรถยนต์",
  description: "ระบบจัดการคลังอะไหล่ร้านซ่อมรถยนต์ครบวงจร",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isLoginPage = pathname.startsWith("/login");

  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            try {
              var theme = localStorage.getItem('nunstock-theme') || 'dark';
              document.documentElement.setAttribute('data-theme', theme);
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        <ThemeProvider>
          {!isLoginPage && <Sidebar />}
          <main className={isLoginPage ? "" : "main-content"}>
            {children}
          </main>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

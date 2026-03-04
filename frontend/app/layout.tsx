import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/PWARegister";
import { GlobalBarcodeScanner } from "@/components/GlobalBarcodeScanner";
import { CartProvider } from "@/components/CartContext";
import { ClientLayout } from "@/components/ClientLayout";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "นันการช่าง - ระบบจัดการอะไหล่ร้านซ่อมรถยนต์",
  description: "ระบบจัดการอะไหล่ร้านซ่อมรถยนต์ นันการช่าง ครบวงจร",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "นันการช่าง",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        <ThemeProvider>
          <CartProvider>
            <ClientLayout>{children}</ClientLayout>
            <Toaster richColors position="top-right" />
            <PWARegister />
            <GlobalBarcodeScanner />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

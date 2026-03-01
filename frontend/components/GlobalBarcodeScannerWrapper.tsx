"use client";
import dynamic from "next/dynamic";

const GlobalBarcodeScanner = dynamic(
    () => import("@/components/GlobalBarcodeScanner").then(m => ({ default: m.GlobalBarcodeScanner })),
    { ssr: false }
);

export function GlobalBarcodeScannerWrapper() {
    return <GlobalBarcodeScanner />;
}

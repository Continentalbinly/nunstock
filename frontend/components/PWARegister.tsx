"use client";

import { useEffect } from "react";

export function PWARegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("SW registered:", registration.scope);

                    // Check for updates every 60 minutes
                    setInterval(() => {
                        registration.update();
                    }, 60 * 60 * 1000);
                })
                .catch((err) => {
                    console.log("SW registration failed:", err);
                });
        }
    }, []);

    return null;
}

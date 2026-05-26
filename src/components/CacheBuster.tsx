"use client";

import { useEffect } from "react";

const VERSION_KEY = "signalflow_app_version";

export default function CacheBuster() {
  useEffect(() => {
    try {
      const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
      const storedVersion = localStorage.getItem(VERSION_KEY);

      if (storedVersion && storedVersion !== currentVersion) {
        // Version changed — clear stale data
        const keysToKeep = [
          "signalflow-ai-config",
          "signalflow_favorite_tickers",
          "signalflow-strategy-config",
        ];

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !keysToKeep.includes(key)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        // Clear caches if available
        if ("caches" in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }

        console.info(
          `[SignalFlow] Version changed ${storedVersion} → ${currentVersion}. Stale data cleared.`,
        );
      }

      localStorage.setItem(VERSION_KEY, currentVersion);
    } catch {
      // localStorage unavailable — non-critical
    }
  }, []);

  return null;
}

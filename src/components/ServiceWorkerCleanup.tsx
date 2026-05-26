"use client";

import { useEffect } from "react";

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    async function cleanup() {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }

        console.info("[SignalFlow] Old service workers and caches cleared");
      } catch (error) {
        console.warn("[SignalFlow] Service worker cleanup failed", error);
      }
    }

    cleanup();
  }, []);

  return null;
}

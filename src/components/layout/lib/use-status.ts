"use client";

import { useEffect, useState } from "react";

export interface ServiceStatus {
  name: string;
  status: "connected" | "error" | "no_key";
  detail: string;
  latencyMs: number;
}

export function useStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch("/api/status");
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setServices(json.services);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  return { services, loading, error };
}

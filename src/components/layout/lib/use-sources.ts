"use client";

import { useEffect, useState } from "react";

export interface ModuleStatus {
  name: string;
  status: "active" | "error";
  count: number;
  detail: string;
  color: string;
}

export function useSources() {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchSources() {
      try {
        const res = await fetch("/api/sources");
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setModules(json.modules);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSources();
    const interval = setInterval(fetchSources, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { modules, loading, error };
}

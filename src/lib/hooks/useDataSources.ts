"use client";

import { useEffect, useState } from "react";
import type { ModuleStatus } from "../types/datasource";
import { fetchSources } from "../api/datasources";

export type { ModuleStatus };

export function useDataSources() {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const json = await fetchSources();
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
    load();
    const interval = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { modules, loading, error };
}

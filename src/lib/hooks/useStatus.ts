"use client";

import { useEffect, useState } from "react";
import { fetchStatus } from "../api/datasources";

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
    async function load() {
      try {
        const json = await fetchStatus();
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
    load();
    return () => { cancelled = true; };
  }, []);

  return { services, loading, error };
}

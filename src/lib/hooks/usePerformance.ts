"use client";

import { useEffect, useState } from "react";
import type { CoinPerf } from "../types/datasource";
import { fetchPerformance } from "../api/datasources";

export type { CoinPerf };

export function usePerformance() {
  const [coins, setCoins] = useState<CoinPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const json = await fetchPerformance();
        if (!cancelled) {
          setCoins(json.coins);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 300_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { coins, loading, error };
}

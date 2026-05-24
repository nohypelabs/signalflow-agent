"use client";

import { useEffect, useState } from "react";

export interface CoinPerf {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  high30d: number;
  low30d: number;
  volatility30d: number;
  klines: { t: number; c: number }[];
}

export function usePerformance() {
  const [coins, setCoins] = useState<CoinPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPerf() {
      try {
        const res = await fetch("/api/performance");
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
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
    fetchPerf();
    const interval = setInterval(fetchPerf, 300_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { coins, loading, error };
}

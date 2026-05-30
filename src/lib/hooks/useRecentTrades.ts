"use client";

import { useState, useEffect, useCallback } from "react";
import type { SoDEXTrade } from "../types/trade";

interface UseRecentTradesReturn {
  data: SoDEXTrade[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRecentTrades(symbol: string, limit = 50): UseRecentTradesReturn {
  const [data, setData] = useState<SoDEXTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/trades/recent?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.trades ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trades");
    } finally {
      setLoading(false);
    }
  }, [symbol, limit]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

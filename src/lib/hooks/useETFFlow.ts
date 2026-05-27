"use client";

import { useState, useEffect, useCallback } from "react";
import type { ETFSummaryItem } from "@/lib/sosovalue";

interface UseETFFlowReturn {
  data: ETFSummaryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useETFFlow(symbol = "BTC", countryCode = "US", limit = 30): UseETFFlowReturn {
  const [data, setData] = useState<ETFSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/etf-flow?symbol=${symbol}&country=${countryCode}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ETF data");
    } finally {
      setLoading(false);
    }
  }, [symbol, countryCode, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

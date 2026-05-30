"use client";

import { useState, useEffect, useCallback } from "react";

interface CorrelationData {
  matrix: number[][];
  symbols: string[];
  updated: number;
}

interface UseCorrelationReturn {
  data: CorrelationData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCorrelation(
  symbols?: string[],
  timeframe = "1d",
  limit = 30,
): UseCorrelationReturn {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (symbols?.length) qs.set("symbols", symbols.join(","));
      qs.set("timeframe", timeframe);
      qs.set("limit", String(limit));

      const res = await fetch(`/api/correlation?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch correlation");
    } finally {
      setLoading(false);
    }
  }, [symbols, timeframe, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { parseApiResponse } from "@/lib/api/client";
import type { CryptoSentimentResult } from "@/lib/marketaux";

interface UseMarketauxReturn {
  data: CryptoSentimentResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMarketaux(limit = 10): UseMarketauxReturn {
  const [data, setData] = useState<CryptoSentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketaux?limit=${limit}`);
      const json = await parseApiResponse<CryptoSentimentResult>(res);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch Marketaux data");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

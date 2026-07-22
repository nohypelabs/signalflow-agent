"use client";

import { useQuery } from "@tanstack/react-query";
import { parseApiResponse } from "@/lib/api/client";

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
  const query = useQuery<CorrelationData, Error>({
    queryKey: ["correlation", symbols, timeframe, limit],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (symbols?.length) qs.set("symbols", symbols.join(","));
      qs.set("timeframe", timeframe);
      qs.set("limit", String(limit));

      const res = await fetch(`/api/correlation?${qs.toString()}`);
      return parseApiResponse<CorrelationData>(res);
    },
    staleTime: 60_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
    refetch: () => { void query.refetch(); },
  };
}

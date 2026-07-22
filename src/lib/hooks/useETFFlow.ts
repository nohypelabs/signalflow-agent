"use client";

import { useQuery } from "@tanstack/react-query";
import { parseApiResponse } from "@/lib/api/client";
import type { ETFSummaryItem } from "@/lib/sosovalue";

interface UseETFFlowReturn {
  data: ETFSummaryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useETFFlow(symbol = "BTC", countryCode = "US", limit = 30): UseETFFlowReturn {
  const query = useQuery<ETFSummaryItem[], Error>({
    queryKey: ["etf-flow", symbol, countryCode, limit],
    queryFn: async () => {
      const res = await fetch(`/api/etf-flow?symbol=${symbol}&country=${countryCode}&limit=${limit}`);
      const json = await parseApiResponse<{ data?: ETFSummaryItem[] }>(res);
      return json.data ?? [];
    },
    staleTime: 60_000,
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
    refetch: () => { void query.refetch(); },
  };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { parseApiResponse } from "@/lib/api/client";

import type { FundingRateData } from "@/lib/funding-rate";

export function useFundingRate(symbol: string) {
  // Extract base symbol from SoDEX format (vBTC_vUSDC -> BTC)
  const base = symbol.replace(/^v/, "").replace(/_vUSDC$/, "").split("/")[0].toUpperCase();

  const query = useQuery<FundingRateData | null, Error>({
    queryKey: ["funding-rate", base],
    queryFn: async () => {
      const res = await fetch(`/api/funding?symbol=${encodeURIComponent(base)}`);
      const data = await parseApiResponse<Record<string, FundingRateData>>(res);
      return data[base] ?? null;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
  };
}

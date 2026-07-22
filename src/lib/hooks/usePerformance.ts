"use client";

import { useQuery } from "@tanstack/react-query";
import type { CoinPerf } from "../types/datasource";
import { fetchPerformance } from "../api/datasources";

export type { CoinPerf };

export function usePerformance() {
  const query = useQuery<{ coins: CoinPerf[] }, Error>({
    queryKey: ["performance-coins"],
    queryFn: fetchPerformance,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  return {
    coins: query.data?.coins ?? [],
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
  };
}

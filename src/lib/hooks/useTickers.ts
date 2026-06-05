"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { SoDEXTicker } from "../types/trade";
import { fetchTickers } from "../api/datasources";

export const TICKERS_QUERY_KEY = ["tickers"] as const;

export interface UseTickersResult {
  tickers: SoDEXTicker[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  // Raw RQ result for advanced usage / suspense etc.
  query: UseQueryResult<SoDEXTicker[] | null, Error>;
}

/**
 * Shared tickers query.
 * - staleTime: 8s (data fresh for 8s)
 * - refetchInterval: 10s (live prices like Hyperliquid ticker tape)
 * - Automatic deduping across all consumers (useMarket, dashboard, charts, etc.)
 * - For suspense: use `useSuspenseQuery` with same options or wrap in <Suspense>
 */
export function useTickers(): UseTickersResult {
  const query = useQuery<SoDEXTicker[] | null, Error>({
    queryKey: TICKERS_QUERY_KEY,
    queryFn: fetchTickers,
    staleTime: 8_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    retry: 2,
  });

  const tickers = query.data ?? null;
  const loading = query.isLoading || (query.isFetching && tickers === null);
  const error = query.error ? (query.error instanceof Error ? query.error.message : "Failed to fetch tickers") : null;

  const refetch = () => {
    query.refetch();
  };

  return {
    tickers,
    loading,
    error,
    refetch,
    query,
  };
}

// For suspense usage (requires parent <Suspense fallback={...}> boundary):
// import { useSuspenseQuery } from '@tanstack/react-query';
// const { data: tickers } = useSuspenseQuery({ queryKey: TICKERS_QUERY_KEY, queryFn: fetchTickers, ... });
export { useSuspenseQuery } from "@tanstack/react-query";

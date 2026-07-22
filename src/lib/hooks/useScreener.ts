"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseApiResponse } from "@/lib/api/client";
import type { ScreenerPair } from "../api/screener";

interface ScreenerFilters {
  category: string;
  sortBy: string;
  sortDir: string;
  minVolume: number;
}

interface UseScreenerReturn {
  data: ScreenerPair[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: ScreenerFilters;
  setFilters: (f: Partial<ScreenerFilters>) => void;
  refetch: () => void;
}

const DEFAULT_FILTERS: ScreenerFilters = {
  category: "all",
  sortBy: "volume",
  sortDir: "desc",
  minVolume: 0,
};

export function useScreener(): UseScreenerReturn {
  const [filters, setFiltersState] = useState<ScreenerFilters>(DEFAULT_FILTERS);

  const setFilters = useCallback((partial: Partial<ScreenerFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const query = useQuery<{ pairs: ScreenerPair[]; total: number }, Error>({
    queryKey: ["screener", filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters.category !== "all") qs.set("category", filters.category);
      qs.set("sortBy", filters.sortBy);
      qs.set("sortDir", filters.sortDir);
      if (filters.minVolume > 0) qs.set("minVolume", String(filters.minVolume));

      const res = await fetch(`/api/screener?${qs.toString()}`);
      const json = await parseApiResponse<{ pairs?: ScreenerPair[]; total?: number }>(res);
      return {
        pairs: json.pairs ?? [],
        total: json.total ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    data: query.data?.pairs ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
    filters,
    setFilters,
    refetch: () => { void query.refetch(); },
  };
}

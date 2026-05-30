"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [data, setData] = useState<ScreenerPair[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ScreenerFilters>(DEFAULT_FILTERS);

  const setFilters = useCallback((partial: Partial<ScreenerFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filters.category !== "all") qs.set("category", filters.category);
      qs.set("sortBy", filters.sortBy);
      qs.set("sortDir", filters.sortDir);
      if (filters.minVolume > 0) qs.set("minVolume", String(filters.minVolume));

      const res = await fetch(`/api/screener?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.pairs ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch screener");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, total, loading, error, filters, setFilters, refetch: fetchData };
}

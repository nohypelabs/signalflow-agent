"use client";

import { useEffect, useState } from "react";

export interface DimensionData {
  score: number;
  detail: string;
}

export interface SignalDimensions {
  etfFlow: DimensionData;
  sentiment: DimensionData;
  macro: DimensionData;
  momentum: DimensionData;
  treasury: DimensionData;
}

export interface SignalsData {
  updated: number;
  sources: Record<string, boolean>;
  dimensions: Record<string, SignalDimensions>;
  overall?: Record<string, number>;
  weights?: Record<string, Record<string, number>>;
  capped?: Record<string, string[]>;
}

export function useSignals() {
  const [data, setData] = useState<SignalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchSignals() {
      try {
        const res = await fetch("/api/signals");
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Signal fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSignals();
    const interval = setInterval(fetchSignals, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}

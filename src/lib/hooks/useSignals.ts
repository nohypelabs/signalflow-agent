"use client";

import { useEffect, useState } from "react";
import type { SignalsData } from "../types/signal";
import type { TradingType } from "../types/trading-type";
import { fetchSignals } from "../api/signals";

export type { SignalsData };
export type { LiveSignalDimensions as SignalDimensions, DimensionData } from "../types/signal";

export function useSignals(tradingType?: TradingType | null) {
  const [data, setData] = useState<SignalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const json = await fetchSignals(tradingType);
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
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tradingType]);

  return { data, loading, error };
}

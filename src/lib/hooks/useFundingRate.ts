"use client";

import { useState, useEffect } from "react";
import { parseApiResponse } from "@/lib/api/client";

import type { FundingRateData } from "@/lib/funding-rate";

export function useFundingRate(symbol: string) {
  const [data, setData] = useState<FundingRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract base symbol from SoDEX format (vBTC_vUSDC -> BTC)
  const base = symbol.replace(/^v/, "").replace(/_vUSDC$/, "").split("/")[0].toUpperCase();

  useEffect(() => {
    let cancelled = false;

    async function fetchFunding() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/funding?symbol=${encodeURIComponent(base)}`);
        const data = await parseApiResponse<Record<string, FundingRateData>>(res);

        if (!cancelled) {
          setData(data[base] ?? null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch");
          setLoading(false);
        }
      }
    }

    fetchFunding();
    // Refresh every 30 seconds
    const interval = setInterval(fetchFunding, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [base]);

  return { data, loading, error };
}

"use client";

import { useEffect, useState } from "react";
import { parseApiResponse } from "@/lib/api/client";
import type { SoDEXPerpsPosition } from "@/lib/sodex-perps";

interface PositionsResponse {
  blockTime: number;
  blockHeight: number;
  positions: SoDEXPerpsPosition[];
  source: "SoDEX Perps";
  readOnly: true;
}

export function useSodexPerpsPositions(address?: string) {
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/perps/positions?address=${encodeURIComponent(address!)}`,
          { cache: "no-store" },
        );
        const next = await parseApiResponse<PositionsResponse>(response);
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to fetch positions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [address]);

  return { data, positions: data?.positions ?? [], loading, error };
}

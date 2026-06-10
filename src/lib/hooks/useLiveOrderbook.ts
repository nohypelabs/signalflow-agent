"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface OrderbookLevel {
  price: number;
  quantity: number;
}

interface LiveOrderbook {
  bestBid: OrderbookLevel | null;
  bestAsk: OrderbookLevel | null;
  spread: number;
  spreadBps: number;
  midPrice: number;
  lastUpdated: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch live orderbook data at short intervals.
 * Shows real-time best bid/ask to prove data is live.
 */
export function useLiveOrderbook(
  symbol: string | null,
  pollIntervalMs: number = 3000,
): LiveOrderbook {
  const [state, setState] = useState<LiveOrderbook>({
    bestBid: null,
    bestAsk: null,
    spread: 0,
    spreadBps: 0,
    midPrice: 0,
    lastUpdated: 0,
    loading: true,
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchOrderbook = useCallback(async () => {
    if (!symbol) return;

    try {
      const res = await fetch(`/api/orderbook?symbol=${encodeURIComponent(symbol)}&limit=5`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!mountedRef.current) return;

      // Parse orderbook response
      const bids: [number, number][] = data.bids ?? [];
      const asks: [number, number][] = data.asks ?? [];

      const bestBid = bids.length > 0
        ? { price: Number(bids[0][0]), quantity: Number(bids[0][1]) }
        : null;
      const bestAsk = asks.length > 0
        ? { price: Number(asks[0][0]), quantity: Number(asks[0][1]) }
        : null;

      const spread = bestBid && bestAsk ? bestAsk.price - bestBid.price : 0;
      const midPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : 0;
      const spreadBps = midPrice > 0 ? (spread / midPrice) * 10_000 : 0;

      setState({
        bestBid,
        bestAsk,
        spread,
        spreadBps,
        midPrice,
        lastUpdated: Date.now(),
        loading: false,
        error: null,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Fetch failed",
      }));
    }
  }, [symbol]);

  useEffect(() => {
    mountedRef.current = true;

    if (!symbol) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Initial fetch
    fetchOrderbook();

    // Poll at interval
    intervalRef.current = setInterval(fetchOrderbook, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, pollIntervalMs, fetchOrderbook]);

  return state;
}

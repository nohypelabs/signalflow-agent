"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface OrderbookLevel {
  price: number;
  quantity: number;
}

export interface LiveOrderbookData {
  bestBid: OrderbookLevel | null;
  bestAsk: OrderbookLevel | null;
  bidTotal: number; // total bid volume (top N levels)
  askTotal: number; // total ask volume (top N levels)
  imbalance: number; // 0-100, 50=balanced, >50=bid-heavy(bullish), <50=ask-heavy(bearish)
  spread: number;
  spreadBps: number;
  midPrice: number;
  lastUpdated: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch live orderbook data and calculate imbalance score.
 * Returns imbalance 0-100 for use as a confluence factor.
 */
export function useLiveOrderbook(
  symbol: string | null,
  pollIntervalMs: number = 3000,
): LiveOrderbookData {
  const [state, setState] = useState<LiveOrderbookData>({
    bestBid: null,
    bestAsk: null,
    bidTotal: 0,
    askTotal: 0,
    imbalance: 50,
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
      const res = await fetch(`/api/orderbook?symbol=${encodeURIComponent(symbol)}&limit=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!mountedRef.current) return;

      const bids: [number, number][] = data.bids ?? [];
      const asks: [number, number][] = data.asks ?? [];

      const bestBid = bids.length > 0
        ? { price: Number(bids[0][0]), quantity: Number(bids[0][1]) }
        : null;
      const bestAsk = asks.length > 0
        ? { price: Number(asks[0][0]), quantity: Number(asks[0][1]) }
        : null;

      // Sum total volume on each side (quote-weighted: price * qty)
      const bidTotal = bids.reduce((sum, [p, q]) => sum + Number(p) * Number(q), 0);
      const askTotal = asks.reduce((sum, [p, q]) => sum + Number(p) * Number(q), 0);

      // Imbalance: 0-100 scale
      // 50 = perfectly balanced
      // >50 = bid-heavy (bullish buying pressure)
      // <50 = ask-heavy (bearish selling pressure)
      const total = bidTotal + askTotal;
      const imbalance = total > 0 ? Math.round((bidTotal / total) * 100) : 50;

      const spread = bestBid && bestAsk ? bestAsk.price - bestBid.price : 0;
      const midPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : 0;
      const spreadBps = midPrice > 0 ? (spread / midPrice) * 10_000 : 0;

      setState({
        bestBid,
        bestAsk,
        bidTotal,
        askTotal,
        imbalance,
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

    fetchOrderbook();
    intervalRef.current = setInterval(fetchOrderbook, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [symbol, pollIntervalMs, fetchOrderbook]);

  return state;
}

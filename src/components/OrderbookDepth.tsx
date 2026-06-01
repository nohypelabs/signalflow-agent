"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { ChartBarIcon } from "@/components/ui/icons";
import { unwrapApiResponse } from "@/lib/api/client";

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
}

function fmtPrice(p: number, coin: string): string {
  if (coin === "BTC") return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

function fmtQty(q: number): string {
  if (q >= 1000) return `${(q / 1000).toFixed(1)}K`;
  if (q >= 1) return q.toFixed(3);
  return q.toFixed(6);
}

function DepthRow({
  entry,
  maxTotal,
  side,
  coin,
}: {
  entry: OrderBookEntry;
  maxTotal: number;
  side: "bid" | "ask";
  coin: string;
}) {
  const pct = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0;
  const color = side === "bid" ? "#00ff88" : "#ff4444";

  return (
    <div className="relative flex items-center gap-2 px-3 py-[3px] font-mono text-[10px] group hover:bg-elevated/20">
      <div
        className="absolute top-0 bottom-0 opacity-10"
        style={{
          [side === "bid" ? "right" : "left"]: 0,
          width: `${pct}%`,
          backgroundColor: color,
        }}
      />
      <span className="flex-1 relative z-10" style={{ color }}>
        {fmtPrice(entry.price, coin)}
      </span>
      <span className="flex-1 text-right text-txt-secondary relative z-10">
        {fmtQty(entry.quantity)}
      </span>
      <span className="flex-1 text-right text-txt-faint relative z-10">
        {fmtQty(entry.total)}
      </span>
    </div>
  );
}

export default function OrderbookDepth({ symbol = "vBTC_vUSDC", coin = "BTC" }: { symbol?: string; coin?: string }) {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(10);
  const fetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (fetchingRef.current) return; // prevent concurrent fetches
      fetchingRef.current = true;

      try {
        const res = await fetch(`/api/orderbook?symbol=${symbol}&limit=${depth}`);
        const json = unwrapApiResponse<OrderBookData>(await res.json());
        if (!cancelled) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symbol, depth]);

  const { bids, asks, spread, spreadPct, midPrice } = useMemo(() => {
    if (!data) return { bids: [], asks: [], spread: 0, spreadPct: 0, midPrice: 0 };

    const parseEntries = (entries: [string, string][]): OrderBookEntry[] => {
      let total = 0;
      return entries.slice(0, depth).map(([p, q]) => {
        const quantity = parseFloat(q);
        total += quantity;
        return { price: parseFloat(p), quantity, total };
      });
    };

    const parsedBids = parseEntries(data.bids ?? []);
    const parsedAsks = parseEntries(data.asks ?? []);

    const bestBid = parsedBids[0]?.price ?? 0;
    const bestAsk = parsedAsks[0]?.price ?? 0;
    const sp = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const mid = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : 0;
    const spPct = mid > 0 ? (sp / mid) * 100 : 0;

    return { bids: parsedBids, asks: parsedAsks, spread: sp, spreadPct: spPct, midPrice: mid };
  }, [data, depth]);

  const maxBidTotal = bids.length > 0 ? bids[bids.length - 1].total : 0;
  const maxAskTotal = asks.length > 0 ? asks[asks.length - 1].total : 0;
  const maxTotal = Math.max(maxBidTotal, maxAskTotal);

  // Only show skeleton on initial load
  if (loading && !data) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">Orderbook error: {error}</p>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartBarIcon size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-txt-primary">Orderbook</h3>
            <span className="text-[9px] text-txt-faint font-mono">{coin}/USDC</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="text-[9px] bg-elevated border border-border-default rounded px-1.5 py-0.5 text-txt-muted outline-none cursor-pointer"
            >
              {[10, 15, 20, 30].map((d) => (
                <option key={d} value={d}>{d} levels</option>
              ))}
            </select>
            <span className={`w-1.5 h-1.5 rounded-full ${error ? "bg-hold" : "bg-buy"} animate-pulse`} />
          </div>
        </div>
      </div>

      {/* Spread info */}
      <div className="px-4 py-2 bg-elevated/20 border-b border-border-default flex items-center justify-between shrink-0">
        <span className="text-[9px] text-txt-faint">Spread</span>
        <span className="text-[10px] font-mono text-txt-secondary">
          {spread > 0 ? `${fmtPrice(spread, coin)} (${spreadPct.toFixed(3)}%)` : "—"}
        </span>
      </div>

      {/* Column headers */}
      <div className="px-3 py-1.5 flex items-center gap-2 text-[8px] text-txt-faint uppercase tracking-wider border-b border-border-default shrink-0">
        <span className="flex-1">Price</span>
        <span className="flex-1 text-right">Size</span>
        <span className="flex-1 text-right">Total</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom) — fills available space */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {[...asks].reverse().map((entry, i) => (
          <DepthRow key={`ask-${i}`} entry={entry} maxTotal={maxTotal} side="ask" coin={coin} />
        ))}
      </div>

      {/* Mid price */}
      <div className="px-4 py-1.5 bg-elevated/30 border-y border-border-default text-center shrink-0">
        <span className="text-xs font-bold font-mono text-txt-primary">
          {midPrice > 0 ? `$${fmtPrice(midPrice, coin)}` : "—"}
        </span>
      </div>

      {/* Bids — fills available space */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {bids.map((entry, i) => (
          <DepthRow key={`bid-${i}`} entry={entry} maxTotal={maxTotal} side="bid" coin={coin} />
        ))}
      </div>
    </Card>
  );
}

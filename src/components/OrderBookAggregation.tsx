"use client";

import { useState, useEffect, useMemo } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

interface OrderBookLevel {
  price: number;
  qty: number;
  total: number;
}

interface Props {
  symbol: string;
}

const STEPS = [1, 10, 50, 100];

export default function OrderBookAggregation({ symbol }: Props) {
  const [raw, setRaw] = useState<{ bids: [string, string][]; asks: [string, string][] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/orderbook?symbol=${encodeURIComponent(symbol)}&limit=100`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setRaw(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  const { bids, asks, spread, spreadPct } = useMemo(() => {
    if (!raw) return { bids: [] as OrderBookLevel[], asks: [] as OrderBookLevel[], spread: 0, spreadPct: 0 };

    function aggregate(levels: [string, string][], isBid: boolean): OrderBookLevel[] {
      const map = new Map<number, number>();
      for (const [p, q] of levels) {
        const price = parseFloat(p);
        const qty = parseFloat(q);
        const bucket = Math.round(price / step) * step;
        map.set(bucket, (map.get(bucket) ?? 0) + qty);
      }
      const arr = Array.from(map.entries()).map(([price, qty]) => ({ price, qty, total: 0 }));
      arr.sort((a, b) => isBid ? b.price - a.price : a.price - b.price);
      let cum = 0;
      for (const l of arr) { cum += l.qty; l.total = cum; }
      return arr.slice(0, 15);
    }

    const aggBids = aggregate(raw.bids, true);
    const aggAsks = aggregate(raw.asks, false);

    const bestBid = aggBids[0]?.price ?? 0;
    const bestAsk = aggAsks[0]?.price ?? 0;
    const sp = bestAsk - bestBid;
    const spPct = bestAsk > 0 ? (sp / bestAsk) * 100 : 0;

    return { bids: aggBids, asks: aggAsks, spread: sp, spreadPct: spPct };
  }, [raw, step]);

  const maxTotal = useMemo(() => {
    const maxB = bids.length > 0 ? bids[bids.length - 1].total : 0;
    const maxA = asks.length > 0 ? asks[asks.length - 1].total : 0;
    return Math.max(maxB, maxA, 1);
  }, [bids, asks]);

  if (loading) {
    return (
      <Card padding="sm">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton variant="card" className="h-48" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">{error}</p>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-3 py-2 border-b border-border-default">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">📖</span>
            <h3 className="text-xs font-semibold text-txt-primary">Order Book Depth</h3>
          </div>
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                  step === s
                    ? "bg-accent-muted text-accent border border-accent-dim"
                    : "bg-elevated/30 text-txt-faint border border-border-default"
                }`}
              >
                ${s}
              </button>
            ))}
          </div>
        </div>

        {/* Spread */}
        <div className="flex items-center justify-center gap-2 text-[9px]">
          <span className="text-txt-faint">Spread:</span>
          <span className="font-mono text-txt-secondary">${spread.toFixed(2)}</span>
          <span className="font-mono text-txt-faint">({spreadPct.toFixed(3)}%)</span>
        </div>
      </div>

      {/* Depth visualization */}
      <div className="p-3 space-y-0.5">
        {/* Asks (reversed so lowest ask is at bottom) */}
        <div className="space-y-px">
          {asks.slice(0, 8).reverse().map((l) => (
            <DepthRow key={l.price} level={l} maxTotal={maxTotal} side="ask" />
          ))}
        </div>

        {/* Mid price divider */}
        <div className="py-1 text-center">
          <span className="text-xs font-bold font-mono text-txt-primary">
            ${(((bids[0]?.price ?? 0) + (asks[0]?.price ?? 0)) / 2 || bids[0]?.price || asks[0]?.price || 0).toLocaleString()}
          </span>
        </div>

        {/* Bids */}
        <div className="space-y-px">
          {bids.slice(0, 8).map((l) => (
            <DepthRow key={l.price} level={l} maxTotal={maxTotal} side="bid" />
          ))}
        </div>
      </div>
    </Card>
  );
}

function DepthRow({ level, maxTotal, side }: { level: OrderBookLevel; maxTotal: number; side: "bid" | "ask" }) {
  const pct = (level.total / maxTotal) * 100;
  const color = side === "bid" ? "#00ff88" : "#ff4444";

  return (
    <div className="relative h-6 flex items-center">
      {/* Depth bar */}
      <div
        className="absolute top-0 h-full rounded-sm opacity-15"
        style={{ [side === "bid" ? "right" : "left"]: 0, width: `${pct}%`, backgroundColor: color }}
      />
      <div className="relative z-10 flex items-center justify-between w-full px-2">
        <span className="text-[10px] font-mono" style={{ color }}>
          ${level.price.toLocaleString()}
        </span>
        <span className="text-[10px] font-mono text-txt-secondary">
          {level.qty.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

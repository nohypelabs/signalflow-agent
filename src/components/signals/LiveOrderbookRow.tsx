"use client";

import { useLiveOrderbook } from "@/lib/hooks/useLiveOrderbook";
import { pairToSodexSymbol } from "@/lib/pair-map";

interface Props {
  pair: string;
}

/**
 * Compact live orderbook display — 1 best bid + 1 best ask.
 * Proves data is real-time by showing live price updates.
 */
export default function LiveOrderbookRow({ pair }: Props) {
  const sodexSymbol = pairToSodexSymbol(pair);
  const ob = useLiveOrderbook(sodexSymbol, 3000); // Poll every 3s

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  const formatQty = (q: number) => {
    if (q >= 1000) return `${(q / 1000).toFixed(1)}K`;
    if (q >= 1) return q.toFixed(2);
    return q.toFixed(4);
  };

  if (ob.loading) {
    return (
      <div className="flex items-center gap-2 text-[9px] text-txt-dim animate-pulse">
        <span>Loading orderbook...</span>
      </div>
    );
  }

  if (ob.error || !ob.bestBid || !ob.bestAsk) {
    return (
      <div className="flex items-center gap-2 text-[9px] text-txt-dim">
        <span>Orderbook unavailable</span>
      </div>
    );
  }

  const timeSinceUpdate = Math.round((Date.now() - ob.lastUpdated) / 1000);
  const isStale = timeSinceUpdate > 10;

  return (
    <div className="flex items-center gap-2 text-[9px]">
      {/* Live indicator */}
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${isStale ? "bg-yellow-400" : "bg-green-400 animate-pulse"}`} />

      {/* Best Bid */}
      <div className="flex items-center gap-1">
        <span className="text-txt-dim">BID</span>
        <span className="font-mono font-bold text-buy tabular-nums">
          {formatPrice(ob.bestBid.price)}
        </span>
        <span className="font-mono text-txt-dim tabular-nums">
          {formatQty(ob.bestBid.quantity)}
        </span>
      </div>

      {/* Spread */}
      <span className="text-txt-dim">|</span>
      <span className="font-mono text-txt-dim tabular-nums">
        {ob.spreadBps.toFixed(1)}bps
      </span>

      {/* Best Ask */}
      <div className="flex items-center gap-1">
        <span className="text-txt-dim">ASK</span>
        <span className="font-mono font-bold text-sell tabular-nums">
          {formatPrice(ob.bestAsk.price)}
        </span>
        <span className="font-mono text-txt-dim tabular-nums">
          {formatQty(ob.bestAsk.quantity)}
        </span>
      </div>

      {/* Last updated */}
      <span className="text-txt-dim ml-auto">
        {timeSinceUpdate}s ago
      </span>
    </div>
  );
}

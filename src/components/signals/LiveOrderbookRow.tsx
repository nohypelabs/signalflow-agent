"use client";

import { useLiveOrderbook } from "@/lib/hooks/useLiveOrderbook";
import { pairToSodexSymbol } from "@/lib/pair-map";

interface Props {
  pair: string;
}

/**
 * Live orderbook as a confluence factor bar.
 * Shows bid/ask imbalance with animated bar that moves in real-time.
 * Green = bid-heavy (buying pressure), Red = ask-heavy (selling pressure).
 */
export default function LiveOrderbookFactor({ pair }: Props) {
  const sodexSymbol = pairToSodexSymbol(pair);
  const ob = useLiveOrderbook(sodexSymbol, 3000);

  const score = ob.imbalance; // 0-100, 50=balanced
  const isBullish = score > 55;
  const isBearish = score < 45;
  const isStrong = score > 65 || score < 35;

  // Color: green if bid-heavy, red if ask-heavy, yellow if balanced
  const barColor = score >= 60
    ? "#00E5A8" // strong bullish
    : score >= 53
      ? "#4ADE80" // mild bullish
      : score >= 47
        ? "#F59E0B" // neutral/balanced
        : score >= 40
          ? "#F97316" // mild bearish
          : "#EF4444"; // strong bearish

  const timeSince = ob.lastUpdated ? Math.round((Date.now() - ob.lastUpdated) / 1000) : null;
  const isStale = timeSince !== null && timeSince > 10;

  const formatVol = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  if (ob.loading) {
    return (
      <div className="flex items-center gap-2 text-[10px]">
        <div className="w-20 shrink-0 font-medium text-txt-primary flex items-center gap-1">
          <span className="text-[8px] text-txt-dim animate-pulse">●</span>
          Orderbook
        </div>
        <div className="flex-1 h-[6px] bg-[#27272a] rounded-full overflow-hidden">
          <div className="h-[6px] w-1/2 bg-txt-dim rounded-full animate-pulse" />
        </div>
        <div className="w-16 text-right font-mono text-[10px] text-txt-dim">...</div>
        <div className="w-8 text-right font-mono text-[8px] text-txt-dim">—</div>
      </div>
    );
  }

  if (ob.error || !ob.bestBid || !ob.bestAsk) {
    return (
      <div className="flex items-center gap-2 text-[10px]">
        <div className="w-20 shrink-0 font-medium text-txt-primary flex items-center gap-1">
          <span className="text-[8px] text-txt-dim">●</span>
          Orderbook
        </div>
        <div className="flex-1 h-[6px] bg-[#27272a] rounded-full" />
        <div className="w-16 text-right font-mono text-[10px] text-txt-dim">N/A</div>
        <div className="w-8 text-right font-mono text-[8px] text-txt-dim">—</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[10px]">
      {/* Factor name with direction indicator */}
      <div className="w-20 shrink-0 font-medium text-txt-primary flex items-center gap-1">
        {isStrong && <span className="text-[8px]" style={{ color: barColor }}>●</span>}
        {isBullish && !isStrong && <span className="text-[8px] text-green-400">▲</span>}
        {isBearish && !isStrong && <span className="text-[8px] text-red-400">▼</span>}
        {!isBullish && !isBearish && <span className="text-[8px] text-txt-dim">—</span>}
        <span className="flex items-center gap-0.5">
          {!isStale && <span className="inline-block w-1 h-1 rounded-full bg-green-400 animate-pulse" />}
          Orderbook
        </span>
      </div>

      {/* Animated bar — moves based on bid/ask imbalance */}
      <div className="flex-1 relative h-[6px] bg-[#27272a] rounded-full overflow-hidden">
        {/* Center marker (50 = balanced) */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-txt-dim/30 z-10" />
        {/* Bar fill — animated transition */}
        <div
          className="absolute top-0 h-[6px] rounded-full transition-all duration-[2000ms] ease-in-out"
          style={{
            width: `${Math.max(5, Math.min(100, score))}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 6px ${barColor}40`,
          }}
        />
      </div>

      {/* Score */}
      <div className="w-16 text-right font-mono text-[10px] font-semibold tabular-nums" style={{ color: barColor }}>
        {score}
      </div>

      {/* Weight (fixed for orderbook) */}
      <div className="w-8 text-right font-mono text-[8px] text-txt-dim">
        {isStale ? `${timeSince}s` : "LIVE"}
      </div>
    </div>
  );
}

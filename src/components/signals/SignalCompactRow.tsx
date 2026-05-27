"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import SignalTypeBadge from "./SignalTypeBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import SignalAnalysisDrawer from "./SignalAnalysisDrawer";
import { formatPrice, formatPercent } from "./signal-utils";

interface Props {
  signal: Signal;
  ticker?: SoDEXTicker;
  liveDims?: LiveSignalDimensions | null;
  overallScore?: number | null;
  weights?: Record<string, number> | null;
  cappedDims?: string[] | null;
}

export default function SignalCompactRow({ signal, ticker, liveDims, overallScore, weights, cappedDims }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const price = ticker ? parseFloat(ticker.lastPx) : signal.price;
  const change = ticker ? ticker.changePct : signal.change24h;
  const coin = signal.pair.split("/")[0];

  return (
    <>
      <div
        className={`
          grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center
          px-4 py-3 bg-card border border-border-default rounded-lg
          hover:border-border-muted cursor-pointer transition-colors
          ${drawerOpen ? "border-accent-dim" : ""}
        `}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        {/* Pair */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-txt-primary">{signal.pair}</span>
          <SignalTypeBadge action={signal.action} size="sm" />
          {ticker && (
            <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse-glow shrink-0" />
          )}
        </div>

        {/* Confidence */}
        <ConfidenceBadge value={signal.confidence} size="sm" />

        {/* Price */}
        <span className="text-xs font-mono font-semibold text-txt-primary whitespace-nowrap">
          ${formatPrice(price, coin)}
        </span>

        {/* Change */}
        <span className={`text-xs font-mono font-semibold whitespace-nowrap ${change >= 0 ? "text-buy" : "text-sell"}`}>
          {formatPercent(change)}
        </span>

        {/* Overall score */}
        <span className="text-[10px] text-txt-muted whitespace-nowrap">
          {overallScore != null ? `${overallScore}/100` : "—"}
        </span>

        {/* Updated */}
        <span className="text-[10px] text-txt-dim whitespace-nowrap">{signal.timeAgo}</span>

        {/* Action */}
        <div className="flex items-center gap-1">
          {signal.action !== "HOLD" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/trading?signal=${signal.id}`);
              }}
              className={`text-[9px] font-bold px-2 py-1 rounded transition-all cursor-pointer ${
                signal.action === "SHORT"
                  ? "bg-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/25"
                  : "bg-[#ff4444]/15 text-[#ff4444] hover:bg-[#ff4444]/25"
              }`}
            >
              {signal.action}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(!drawerOpen);
            }}
            className="text-[10px] text-accent font-semibold hover:opacity-80 whitespace-nowrap"
          >
            {drawerOpen ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <SignalAnalysisDrawer
          signal={signal}
          liveDims={liveDims}
          weights={weights}
          cappedDims={cappedDims}
        />
      )}
    </>
  );
}

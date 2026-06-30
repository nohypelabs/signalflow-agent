"use client";

import { useState } from "react";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
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
  tradingType?: TradingType | null;
  onFocusSignal?: (signal: Signal) => void;
}

export default function SignalCompactRow({ signal, ticker, liveDims, overallScore, weights, cappedDims, tradingType, onFocusSignal }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          <SignalTypeBadge action={signal.actionV2 ?? signal.action} size="sm" />
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFocusSignal?.(signal);
            }}
            className="text-[9px] font-bold px-2 py-1 rounded transition-all cursor-pointer bg-accent/10 text-accent hover:bg-accent/20"
          >
            Chart
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(!drawerOpen);
            }}
            className={`rounded-[35px] border px-2.5 py-1 text-[9px] font-bold transition-all whitespace-nowrap ${
              drawerOpen
                ? "border-accent/45 bg-accent/20 text-accent"
                : "border-accent/35 bg-accent/12 text-accent hover:border-accent/55 hover:bg-accent/18"
            }`}
          >
            {drawerOpen ? "Hide Analysis" : "View Analysis"}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <SignalAnalysisDrawer
          signal={signal}
          liveDims={liveDims}
          weights={weights}
          cappedDims={cappedDims}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

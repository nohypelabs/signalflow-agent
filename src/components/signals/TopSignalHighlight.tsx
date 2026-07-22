"use client";

import { useState } from "react";
import type { LiveSignalDimensions, Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import SignalTypeBadge from "./SignalTypeBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import SignalAnalysisDrawer from "./SignalAnalysisDrawer";
import { formatPrice, formatPercent } from "./signal-utils";

interface Props {
  signal: Signal;
  ticker?: SoDEXTicker;
  liveDims?: LiveSignalDimensions | null;
  weights?: Record<string, number> | null;
  cappedDims?: string[] | null;
  onFocusSignal?: (signal: Signal) => void;
  isCompact?: boolean;
}

export default function TopSignalHighlight({ signal, ticker, liveDims, weights, cappedDims, onFocusSignal, isCompact = false }: Props) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const price = ticker ? parseFloat(ticker.lastPx) : signal.price;
  const change = ticker ? ticker.changePct : signal.change24h;
  const coin = signal.pair.split("/")[0];

  return (
    <div className={isCompact ? "relative overflow-hidden w-full" : "signals-glass-card relative mb-5 overflow-hidden"}>
      {/* Accent stripe */}
      {!isCompact && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-buy to-accent/30" />
      )}

      <div className={isCompact ? "py-1.5 flex items-center justify-between gap-2.5 min-w-0" : "px-4 py-3 flex items-center justify-between gap-4"}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!isCompact && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-[10px] text-accent font-bold uppercase tracking-wider">Top Signal</span>
            </div>
          )}

          <span className="text-xs sm:text-sm font-bold text-txt-primary truncate">{signal.pair}</span>
          <SignalTypeBadge action={signal.actionV2 ?? signal.action} size={isCompact ? "sm" : "md"} />

          <span className="text-xs sm:text-sm font-bold font-mono text-txt-primary whitespace-nowrap">
            ${formatPrice(price, coin)}
          </span>
          <span className={`text-[10px] sm:text-xs font-mono font-semibold ${change >= 0 ? "text-buy" : "text-sell"} ${isCompact ? "hidden sm:inline" : ""}`}>
            {formatPercent(change)}
          </span>
        </div>

        <div className={`flex items-center gap-3 shrink-0 ${isCompact ? "hidden md:flex" : ""}`}>
          <ConfidenceBadge value={signal.confidence} size="md" showLabel />
          <p className="text-xs text-txt-muted max-w-xs truncate hidden md:block">
            {signal.reasoning}
          </p>
          <button
            onClick={() => onFocusSignal?.(signal)}
            className="glass-control cursor-pointer rounded-[35px] px-3 py-1.5 text-[10px] font-bold text-accent transition-all"
          >
            View on Chart
          </button>
          <button
            onClick={() => setAnalysisOpen(true)}
            className="rounded-[35px] border border-accent/35 bg-accent/12 px-3 py-1.5 text-[10px] font-bold text-accent shadow-[0_0_20px_rgba(0,229,168,0.10)] transition-all hover:border-accent/55 hover:bg-accent/18"
          >
            View Analysis
          </button>
        </div>
      </div>

      {analysisOpen && (
        <SignalAnalysisDrawer
          signal={signal}
          liveDims={liveDims}
          weights={weights}
          cappedDims={cappedDims}
          onClose={() => setAnalysisOpen(false)}
        />
      )}
    </div>
  );
}

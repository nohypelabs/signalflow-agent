"use client";

import { useState } from "react";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import SignalTypeBadge from "./SignalTypeBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import SignalScoreBreakdown from "./SignalScoreBreakdown";
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

export default function SignalCard({ signal, ticker, liveDims, overallScore, weights, cappedDims }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const price = ticker ? parseFloat(ticker.lastPx) : signal.price;
  const change = ticker ? ticker.changePct : signal.change24h;
  const coin = signal.pair.split("/")[0];

  return (
    <div className="bg-card border border-border-default rounded-xl overflow-hidden transition-colors hover:border-border-muted">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-txt-primary">{signal.pair}</span>
            <SignalTypeBadge action={signal.action} size="md" />
            {ticker && <Badge variant="live" size="sm">LIVE</Badge>}
          </div>
          <ConfidenceBadge value={signal.confidence} size="md" />
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono text-txt-primary">
              ${formatPrice(price, coin)}
            </span>
            <span className={`text-xs font-semibold font-mono ${change >= 0 ? "text-buy" : "text-sell"}`}>
              {formatPercent(change)}
            </span>
          </div>
          {overallScore != null && (
            <span className="text-[10px] text-txt-muted">
              Score: <span className="text-accent font-bold">{overallScore}/100</span>
            </span>
          )}
        </div>

        {/* Thesis */}
        <p className="text-xs text-txt-secondary leading-relaxed line-clamp-2 mb-3">
          {signal.reasoning}
        </p>

        {/* Score breakdown */}
        <SignalScoreBreakdown
          dims={signal.dimensions}
          dimDetails={signal.dimensionDetails}
          liveDims={liveDims}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-border-default px-4 py-2.5 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[9px] text-txt-dim shrink-0">Sources:</span>
          {signal.sources.slice(0, 4).map((src) => (
            <Badge key={src} variant="muted" size="sm">{src}</Badge>
          ))}
          {signal.sources.length > 4 && (
            <span className="text-[9px] text-txt-dim">+{signal.sources.length - 4}</span>
          )}
        </div>
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="text-[10px] text-accent font-semibold hover:opacity-80 shrink-0 ml-2"
        >
          {drawerOpen ? "Hide Analysis" : "View Analysis"}
        </button>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <SignalAnalysisDrawer
          signal={signal}
          liveDims={liveDims}
          weights={weights}
          cappedDims={cappedDims}
        />
      )}
    </div>
  );
}

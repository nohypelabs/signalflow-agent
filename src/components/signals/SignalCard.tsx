"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
import { TRADING_TYPES } from "@/lib/types/trading-type";
import Badge from "@/components/ui/Badge";
import SignalTypeBadge from "./SignalTypeBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import SignalScoreBreakdown from "./SignalScoreBreakdown";
import SignalAnalysisDrawer from "./SignalAnalysisDrawer";
import { formatPrice, formatPercent } from "./signal-utils";
import TradingTypeIcon from "@/components/TradingTypeIcon";

interface Props {
  signal: Signal;
  ticker?: SoDEXTicker;
  liveDims?: LiveSignalDimensions | null;
  overallScore?: number | null;
  weights?: Record<string, number> | null;
  cappedDims?: string[] | null;
  tradingType?: TradingType | null;
}

export default function SignalCard({ signal, ticker, liveDims, overallScore, weights, cappedDims, tradingType }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const price = ticker ? parseFloat(ticker.lastPx) : signal.price;
  const change = ticker ? ticker.changePct : signal.change24h;
  const coin = signal.pair.split("/")[0];
  const typeConfig = tradingType ? TRADING_TYPES[tradingType] : null;
  const qualityStatus = signal.quality?.status;
  const qualityTone = qualityStatus === "actionable"
    ? { text: "ACTIONABLE", className: "bg-buy/10 text-buy border-buy/25" }
    : qualityStatus === "watch"
      ? { text: "WATCH", className: "bg-hold/10 text-hold border-hold/25" }
      : qualityStatus === "blocked"
        ? { text: "BLOCKED", className: "bg-sell/10 text-sell border-sell/25" }
        : null;

  // Calculate type-specific TP/SL if trading type is selected
  const typeTP = typeConfig && signal.execution.entry > 0
    ? signal.action === "LONG"
      ? signal.execution.entry * (1 + (typeConfig.tpMultiplier.max * 0.02))
      : signal.execution.entry * (1 - (typeConfig.tpMultiplier.max * 0.02))
    : null;
  const typeSL = typeConfig && signal.execution.entry > 0
    ? signal.action === "LONG"
      ? signal.execution.entry * (1 - (typeConfig.slMultiplier.max * 0.02))
      : signal.execution.entry * (1 + (typeConfig.slMultiplier.max * 0.02))
    : null;

  return (
    <div className="bg-card border border-border-default rounded-xl overflow-hidden transition-colors hover:border-border-muted">
      {/* Card header */}
      <div className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-base font-bold text-txt-primary">{signal.pair}</span>
            <SignalTypeBadge action={signal.actionV2 ?? signal.action} size="md" />
            {ticker && <Badge variant="live" size="sm">LIVE</Badge>}
            {signal.regime && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-elevated text-txt-faint font-mono uppercase tracking-wider">
                {signal.regime.replace("_", " ")}
              </span>
            )}
            {signal.setup && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-mono uppercase tracking-wider">
                {signal.setup.label}
              </span>
            )}
            {qualityTone && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded border font-mono font-semibold ${qualityTone.className}`}>
                {qualityTone.text}
              </span>
            )}
            {/* Trading type badge */}
            {typeConfig && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: `${typeConfig.color}15`,
                  color: typeConfig.color,
                  border: `1px solid ${typeConfig.color}30`,
                }}
              >
                <TradingTypeIcon type={typeConfig.id} size={11} />
                {typeConfig.label}
              </span>
            )}
            {/* Multi-TF confluence badge */}
            {signal.multiTF && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: signal.multiTF.score >= 80 ? "#00E5A815" : signal.multiTF.score >= 60 ? "#F59E0B15" : "#EF444415",
                  color: signal.multiTF.score >= 80 ? "#00E5A8" : signal.multiTF.score >= 60 ? "#F59E0B" : "#EF4444",
                  border: `1px solid ${signal.multiTF.score >= 80 ? "#00E5A830" : signal.multiTF.score >= 60 ? "#F59E0B30" : "#EF444430"}`,
                }}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                MTF {signal.multiTF.score}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {signal.confluence != null && (
              <span className="text-[9px] text-txt-muted">
                Confluence: <span className="text-accent font-bold">{signal.confluence}</span>
              </span>
            )}
            <ConfidenceBadge value={signal.confidence} size="md" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 mb-3">
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

        {(signal.setup || signal.quality) && (
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {signal.setup && (
              <div className="rounded-lg border border-border-default bg-inset/30 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] text-txt-faint uppercase tracking-wider">Thesis</span>
                  <span className="text-[9px] text-accent font-mono">
                    {signal.setup.evidence.slice(0, 2).join(" / ") || "Awaiting edge"}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-txt-secondary">
                  {signal.setup.thesis}
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-txt-muted">
                  Invalid if: {signal.setup.invalidation}
                </p>
              </div>
            )}
            {signal.quality && (
              <div className="rounded-lg border border-border-default bg-inset/30 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] text-txt-faint uppercase tracking-wider">Calibration</span>
                  <span className="text-[9px] text-txt-muted font-mono">
                    {signal.quality.rawConfidence} to {signal.quality.calibratedConfidence}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  <span className="text-txt-muted">Min {signal.quality.minConfidence}</span>
                  <span className={signal.quality.confidenceAdjustment >= 0 ? "text-buy" : "text-sell"}>
                    Adj {signal.quality.confidenceAdjustment >= 0 ? "+" : ""}{signal.quality.confidenceAdjustment}
                  </span>
                  <span className="text-txt-muted">{signal.quality.lesson.status}</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-txt-muted">
                  {signal.quality.blockedReasons[0] ?? signal.quality.lesson.note}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Score breakdown */}
        <SignalScoreBreakdown
          dims={signal.dimensions}
          dimDetails={signal.dimensionDetails}
          liveDims={liveDims}
        />

        {/* Type-specific TP/SL preview */}
        {typeConfig && typeTP && typeSL && (
          <div
            className="mt-3 p-2.5 rounded-lg border flex flex-wrap items-center gap-2.5 sm:gap-4"
            style={{
              borderColor: `${typeConfig.color}20`,
              backgroundColor: `${typeConfig.color}06`,
            }}
          >
            <span className="text-[9px] text-txt-dim uppercase tracking-wider shrink-0">
              {typeConfig.label} Targets
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono">
              <span className="text-buy">
                TP: ${formatPrice(typeTP, coin)}
              </span>
              <span className="text-txt-faint">|</span>
              <span className="text-sell">
                SL: ${formatPrice(typeSL, coin)}
              </span>
              <span className="text-txt-faint">|</span>
              <span style={{ color: typeConfig.color }}>
                R:R {typeConfig.riskRewardTarget}
              </span>
            </div>
          </div>
        )}

        {/* Multi-TF confluence details */}
        {signal.multiTF && signal.multiTF.details.length > 1 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[9px] text-txt-dim">MTF:</span>
            {signal.multiTF.details.map((tf) => (
              <span
                key={tf.tf}
                className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                style={{
                  backgroundColor: tf.direction === "bullish" ? "#00E5A812" : tf.direction === "bearish" ? "#EF444412" : "#6B728012",
                  color: tf.direction === "bullish" ? "#00E5A8" : tf.direction === "bearish" ? "#EF4444" : "#6B7280",
                }}
              >
                {tf.tf}: {tf.action} ({tf.confidence}%)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-default px-3.5 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[9px] text-txt-dim shrink-0">Sources:</span>
          {signal.sources.slice(0, 4).map((src) => (
            <Badge key={src} variant="muted" size="sm">{src}</Badge>
          ))}
          {signal.sources.length > 4 && (
            <span className="text-[9px] text-txt-dim">+{signal.sources.length - 4}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:ml-2 self-end sm:self-auto">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="text-[10px] text-accent font-semibold hover:opacity-80"
          >
            {drawerOpen ? "Hide Analysis" : "View Analysis"}
          </button>
          {signal.action !== "HOLD" && (
            <button
              onClick={() => {
                const params = new URLSearchParams({ signal: signal.id });
                if (tradingType) params.set("type", tradingType);
                router.push(`/trading?${params.toString()}`);
              }}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                signal.action === "SHORT"
                  ? "bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/20 hover:bg-[#00ff88]/25"
                  : "bg-[#ff4444]/15 text-[#ff4444] border border-[#ff4444]/20 hover:bg-[#ff4444]/25"
              }`}
            >
              Execute {signal.action}
            </button>
          )}
        </div>
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

"use client";

import type { Signal } from "@/lib/types/signal";
import type { SignalDimensions } from "@/lib/hooks/useSignals";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import ProgressBar from "@/components/ui/ProgressBar";
import EmptyState from "@/components/ui/EmptyState";

const dimLabels: { key: keyof Signal["dimensions"]; label: string; color: string }[] = [
  { key: "etfFlow", label: "ETF Flow", color: "#00d4ff" },
  { key: "sentiment", label: "Sentiment", color: "#8B5CF6" },
  { key: "macro", label: "Macro", color: "#00ff88" },
  { key: "momentum", label: "Momentum", color: "#ff8800" },
  { key: "treasury", label: "Treasury", color: "#ff4488" },
];

const actionAccent: Record<string, string> = {
  buy: "#00ff88",
  sell: "#ff4444",
  hold: "#ff8800",
};

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  signal: Signal | null;
  liveDims?: SignalDimensions | null;
  tickerMap?: Map<string, SoDEXTicker>;
}

export default function AIReasoning({ signal, liveDims, tickerMap }: Props) {
  if (!signal) {
    return (
      <Card padding="lg">
        <EmptyState
          title="No signal selected"
          description="Select a live signal from the feed or generate an AI thesis to view multi-dimensional analysis and trade execution plan"
          icon="signal"
        />
      </Card>
    );
  }

  const hasLive = liveDims !== undefined && liveDims !== null;
  const accent = actionAccent[signal.action.toLowerCase()] ?? "#00E5A8";

  // Resolve live price from ticker
  const sodSym = pairToSodexSymbol(signal.pair);
  const liveTicker = tickerMap?.get(sodSym);
  const livePrice = liveTicker ? parseFloat(liveTicker.lastPx) : null;
  const liveChg = liveTicker ? liveTicker.changePct : null;

  // When live price is available, recalculate TP/SL proportionally
  const entry = livePrice ?? signal.execution.entry;
  const entryRatio = livePrice && signal.execution.entry > 0
    ? livePrice / signal.execution.entry
    : 1;
  const takeProfit = livePrice && signal.execution.takeProfit > 0
    ? signal.execution.takeProfit * entryRatio
    : signal.execution.takeProfit;
  const stopLoss = livePrice && signal.execution.stopLoss > 0
    ? signal.execution.stopLoss * entryRatio
    : signal.execution.stopLoss;

  return (
    <Card padding="none" className="overflow-hidden animate-slide-up">
      {/* Header bar */}
      <div
        className="px-5 py-3 border-b border-border-default flex items-center gap-3 flex-wrap"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <h3 className="font-semibold text-sm text-txt-primary">
          {hasLive ? "Live Signal Analysis" : "AI Signal Reasoning"}
        </h3>
        <Badge variant={signal.action.toLowerCase()} size="md">{signal.action}</Badge>
        <span className="text-sm text-txt-secondary font-medium">{signal.pair}</span>
        {livePrice !== null && (
          <span className="text-xs font-mono text-txt-primary tabular-nums">
            ${fmt(livePrice)}
            {liveChg !== null && (
              <span className={`ml-1.5 text-[11px] font-semibold ${liveChg >= 0 ? "text-buy" : "text-sell"}`}>
                {liveChg >= 0 ? "+" : ""}{liveChg.toFixed(1)}%
              </span>
            )}
          </span>
        )}
        {livePrice !== null && (
          <span className="flex items-center gap-1.5">
            <StatusDot status="live" size="sm" />
            <Badge variant="live" size="sm">LIVE</Badge>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="accent" size="sm">
            {livePrice !== null ? "SoDEX Live" : hasLive ? "SoSoValue" : "AI Generated"}
          </Badge>
          <span className="text-[10px] text-txt-secondary">{signal.timeAgo}</span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Thesis + Dimensions */}
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-txt-primary uppercase tracking-wider mb-1.5">Signal Thesis</p>
            <Card variant="inset" padding="md" className="border-l-2" style={{ borderLeftColor: accent }}>
              <p className="text-sm text-txt-primary leading-relaxed">
                &ldquo;{signal.reasoning}&rdquo;
              </p>
            </Card>
          </div>

          <div>
            <p className="text-[10px] text-txt-primary uppercase tracking-wider mb-2">
              {hasLive ? "Live Dimensions (SoSoValue)" : "Signal Dimensions"}
            </p>
            <div className="flex flex-col gap-2.5">
              {dimLabels.map((d) => {
                const score = hasLive ? liveDims[d.key].score : signal.dimensions[d.key];
                const detail =
                  (hasLive ? liveDims[d.key].detail : null) ??
                  signal.dimensionDetails?.[d.key]?.detail ??
                  null;
                return (
                  <div key={d.key}>
                    <ProgressBar
                      value={score}
                      color={d.color}
                      height="md"
                      label={d.label}
                      showValue
                    />
                    {detail && (
                      <p className="text-[10px] text-txt-secondary mt-0.5 ml-[5.5rem] leading-relaxed">
                        {detail}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Execution Plan */}
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-txt-primary uppercase tracking-wider mb-2">Trade Execution Plan</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Order Type", value: signal.execution.orderType, color: "text-accent" },
                {
                  label: livePrice !== null ? "Live Price" : "Entry Price",
                  value: `$${fmt(entry)}`,
                  color: livePrice !== null ? "text-buy" : "text-txt-primary",
                },
                {
                  label: "Take Profit",
                  value: takeProfit > 0 ? `$${fmt(takeProfit)}` : "—",
                  color: "text-buy",
                },
                {
                  label: "Stop Loss",
                  value: stopLoss > 0 ? `$${fmt(stopLoss)}` : "—",
                  color: "text-sell",
                },
                { label: "Position Size", value: signal.execution.positionSize, color: "text-txt-primary" },
                { label: "Risk/Reward", value: signal.execution.riskReward, color: "text-buy" },
              ].map((item) => (
                <Card key={item.label} variant="inset" padding="sm">
                  <p className="text-[10px] text-txt-primary">{item.label}</p>
                  <p className={`text-xs font-semibold mt-0.5 font-mono ${item.color}`}>
                    {item.value}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Risk meter */}
          {stopLoss > 0 && entry > 0 && (
            <div>
              <p className="text-[10px] text-txt-primary uppercase tracking-wider mb-1.5">Risk Assessment</p>
              <Card variant="inset" padding="sm">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-txt-primary mb-1">
                      <span>Entry → Stop Loss</span>
                      <span className="text-sell font-semibold">
                        -{((Math.abs(entry - stopLoss) / entry) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-inset rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-hold to-sell"
                        style={{ width: `${Math.min(100, (Math.abs(entry - stopLoss) / entry) * 500)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-txt-primary mb-1">
                      <span>Entry → Take Profit</span>
                      <span className="text-buy font-semibold">
                        +{((Math.abs(takeProfit - entry) / entry) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-inset rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-buy/60 to-buy"
                        style={{ width: `${Math.min(100, (Math.abs(takeProfit - entry) / entry) * 500)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Sources */}
          <div>
            <p className="text-[10px] text-txt-primary uppercase tracking-wider mb-2">Data Sources</p>
            <div className="flex flex-wrap gap-1.5">
              {signal.sources.map((src) => (
                <Badge key={src} variant="muted" size="sm">{src}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer metadata */}
      <div className="px-5 py-2.5 border-t border-border-default bg-inset/50">
        <p className="text-[10px] text-txt-primary font-mono">
          {livePrice !== null ? `Live: ${new Date().toISOString().slice(0, 19)}Z · Price: $${fmt(livePrice)}` : `Signal: ${new Date().toISOString().slice(0, 19)}Z`} · Confidence: {signal.confidence}% · Dimensions: 5 scored · Sources: {signal.sources.length}
        </p>
      </div>
    </Card>
  );
}

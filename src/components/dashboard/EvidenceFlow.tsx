"use client";

import type { Signal } from "@/lib/types/signal";
import type { SignalDimensions as LiveSignalDimensions } from "@/lib/hooks/useSignals";
import Badge from "@/components/ui/Badge";

interface Props {
  signal: Signal | null;
  liveDims: LiveSignalDimensions | null;
}

const DIMENSIONS: { key: keyof Signal["dimensions"]; label: string; source: string }[] = [
  { key: "etfFlow", label: "ETF Flow", source: "SoSoValue" },
  { key: "macro", label: "Macro", source: "SoSoValue" },
  { key: "sentiment", label: "Sentiment", source: "News" },
  { key: "treasury", label: "Treasury", source: "BTC Holdings" },
  { key: "momentum", label: "Momentum", source: "SoDEX" },
];

function tone(score: number): { label: string; className: string; variant: string } {
  if (score >= 65) return { label: "Bullish", className: "text-buy", variant: "buy" };
  if (score <= 40) return { label: "Bearish", className: "text-sell", variant: "sell" };
  return { label: "Neutral", className: "text-hold", variant: "hold" };
}

export default function EvidenceFlow({ signal, liveDims }: Props) {
  return (
    <section className="bg-card border border-border-default rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-txt-secondary font-semibold">Evidence Flow</p>
          <h2 className="mt-0.5 text-sm font-semibold text-txt-primary">Inputs feeding the signal engine</h2>
        </div>
        <Badge variant={signal ? "accent" : "muted"} size="sm">{signal ? "Linked to decision" : "Awaiting decision"}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 p-3">
        {DIMENSIONS.map((dimension) => {
          const live = liveDims?.[dimension.key];
          const score = live?.score ?? signal?.dimensions[dimension.key] ?? 0;
          const detail = live?.detail ?? signal?.dimensionDetails?.[dimension.key]?.detail ?? "Waiting for source contribution.";
          const t = tone(score);

          return (
            <div key={dimension.key} className="rounded-lg border border-border-default bg-inset/30 p-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-txt-secondary truncate">
                  {dimension.label}
                </span>
                <Badge variant={t.variant} size="sm">{t.label}</Badge>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <span className={`text-2xl font-semibold font-mono leading-none ${t.className}`}>{Math.round(score)}</span>
                <span className="text-[9px] text-txt-primary">{dimension.source}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-background overflow-hidden">
                <div
                  className={`h-full rounded-full ${score >= 65 ? "bg-buy" : score <= 40 ? "bg-sell" : "bg-hold"}`}
                  style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-txt-secondary line-clamp-2">{detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

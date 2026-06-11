"use client";

import type { Signal } from "@/lib/types/signal";
import type { SignalDimensions as LiveSignalDimensions } from "@/lib/hooks/useSignals";
import Badge from "@/components/ui/Badge";

interface Props {
  signal: Signal | null;
  liveDims: LiveSignalDimensions | null;
  sourceFlags?: Record<string, boolean | number>;
}

const DIMENSIONS: {
  key: keyof Signal["dimensions"];
  label: string;
  source: string;
  available: (flags?: Record<string, boolean | number>) => boolean;
}[] = [
  { key: "etfFlow", label: "ETF Flow", source: "SoSoValue ETF", available: (flags) => Boolean(flags?.etf) },
  { key: "macro", label: "Macro", source: "SoSoValue Macro", available: (flags) => Boolean(flags?.macro) },
  { key: "sentiment", label: "Sentiment", source: "SoSoValue News", available: (flags) => Boolean(flags?.news) },
  {
    key: "treasury",
    label: "Treasury",
    source: "SoSoValue Treasury",
    available: (flags) => Boolean(flags?.treasuries || flags?.treasuryActivity),
  },
  {
    key: "momentum",
    label: "Momentum",
    source: "SoSoValue Snapshot",
    available: (flags) => typeof flags?.snapshots === "number" ? flags.snapshots > 0 : Boolean(flags?.snapshots),
  },
];

function tone(score: number | null, available: boolean): { label: string; className: string; variant: string } {
  if (!available) return { label: "Unavailable", className: "text-txt-primary", variant: "muted" };
  if (score === null) return { label: "Waiting", className: "text-txt-primary", variant: "muted" };
  if (score >= 65) return { label: "Bullish", className: "text-buy", variant: "buy" };
  if (score <= 40) return { label: "Bearish", className: "text-sell", variant: "sell" };
  return { label: "Neutral", className: "text-hold", variant: "hold" };
}

export default function EvidenceFlow({ signal, liveDims, sourceFlags }: Props) {
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
          const available = dimension.available(sourceFlags);
          const live = available ? liveDims?.[dimension.key] : undefined;
          const fallbackScore = available ? signal?.dimensions[dimension.key] : undefined;
          const score =
            typeof live?.score === "number"
              ? live.score
              : typeof fallbackScore === "number"
                ? fallbackScore
                : null;
          const detail = available
            ? live?.detail ?? signal?.dimensionDetails?.[dimension.key]?.detail ?? "Waiting for source contribution."
            : "Source unavailable in the current response, so no score is shown.";
          const t = tone(score, available);

          return (
            <div key={dimension.key} className="rounded-lg border border-border-default bg-inset/30 p-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-txt-secondary truncate">
                  {dimension.label}
                </span>
                <Badge variant={t.variant} size="sm">{t.label}</Badge>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <span className={`text-2xl font-semibold font-mono leading-none ${t.className}`}>
                  {score === null ? "--" : Math.round(score)}
                </span>
                <span className="text-[9px] text-txt-primary">{dimension.source}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-background overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    score === null ? "bg-border-muted" : score >= 65 ? "bg-buy" : score <= 40 ? "bg-sell" : "bg-hold"
                  }`}
                  style={{ width: `${score === null ? 22 : Math.max(4, Math.min(100, score))}%` }}
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

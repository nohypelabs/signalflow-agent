"use client";

import type { Signal } from "@/lib/types/signal";

interface Props {
  signals: Signal[];
}

export default function SignalSummaryCards({ signals }: Props) {
  const total = signals.length;
  const buyCount = signals.filter((s) => s.action === "LONG").length;
  const holdCount = signals.filter((s) => s.action === "HOLD").length;
  const sellCount = signals.filter((s) => s.action === "SHORT").length;

  const avgConfidence = total > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / total)
    : 0;

  const highConfidence = signals.filter((s) => s.confidence >= 85).length;

  const stats = [
    { label: "Total Active", value: total, color: "var(--accent-primary)" },
    { label: "LONG", value: buyCount, color: "var(--color-buy)" },
    { label: "NO TRADE", value: holdCount, color: "var(--color-hold)" },
    { label: "SHORT", value: sellCount, color: "var(--color-sell)" },
    { label: "Avg Confidence", value: `${avgConfidence}%`, color: "var(--text-secondary)" },
    { label: "High Confidence", value: highConfidence, color: "var(--color-info)" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border-default rounded-xl p-3 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] text-txt-muted font-medium uppercase tracking-wider">
            {stat.label}
          </span>
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: stat.color }}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

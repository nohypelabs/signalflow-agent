"use client";

import { Target } from "lucide-react";
import type { DailyBreakdown } from "@/lib/hooks/useSignalHistory";
import Card from "@/components/ui/Card";

interface Props {
  accuracy: number | null;
  totalResolved: number;
  totalCorrect: number;
  winStreak: number;
  lossStreak: number;
  hydrated: boolean;
  dailyBreakdown: DailyBreakdown[];
}

function WinRateRing({ value, size = 64 }: { value: number | null | undefined; size?: number }) {
  const pct = value != null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = pct != null ? circ * (1 - pct / 100) : circ;
  const color = pct != null ? (pct >= 60 ? "var(--color-buy)" : pct >= 40 ? "var(--color-hold)" : "var(--color-sell)") : "var(--color-border-default)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="4" opacity="0.3" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-sm font-bold tabular-nums text-txt-primary leading-none">
          {pct != null ? `${pct.toFixed(0)}` : "—"}
        </span>
        <span className="text-[8px] text-txt-muted leading-none mt-0.5">%</span>
      </div>
    </div>
  );
}

export default function SignalReliabilityCard({ accuracy, totalResolved, totalCorrect, winStreak, lossStreak, hydrated, dailyBreakdown }: Props) {
  const totalMissed = Math.max(0, totalResolved - totalCorrect);

  const tone = totalResolved === 0
    ? "text-txt-muted"
    : accuracy == null
      ? "text-txt-muted"
      : accuracy >= 60
        ? "text-buy"
        : accuracy >= 45
          ? "text-hold"
          : "text-sell";

  const label = totalResolved === 0
    ? "collecting"
    : accuracy == null
      ? "pending"
      : accuracy >= 60
        ? "strong"
        : accuracy >= 45
          ? "mixed"
          : "weak";

  return (
    <Card variant="glass" padding="none" className="overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Target size={12} className="text-accent" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Signal Reliability</p>
        </div>
        <span className={`font-mono text-[9px] uppercase tabular-nums ${tone}`}>{label}</span>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl border border-border-default bg-inset/60 p-2">
            <WinRateRing value={accuracy} size={64} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-2xl font-bold tabular-nums ${tone}`}>
                {accuracy == null ? "--" : accuracy.toFixed(1)}
                {accuracy != null && <span className="text-sm">%</span>}
              </span>
              <span className="text-[9px] text-txt-muted">hit rate</span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-txt-secondary tabular-nums">
              {totalResolved} resolved
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-buy tabular-nums">{totalCorrect}</p>
            <p className="text-[8px] uppercase text-txt-muted">wins</p>
          </div>
          <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-sell tabular-nums">{totalMissed}</p>
            <p className="text-[8px] uppercase text-txt-muted">misses</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-buy-dim/40 bg-buy-muted/20 px-2 py-2">
            <p className="text-[9px] font-semibold text-buy/80">Win streak</p>
            <span className="mt-1 block font-mono text-lg font-bold tabular-nums text-buy leading-none">
              {winStreak || "—"}
            </span>
          </div>
          <div className="rounded-lg border border-sell-dim/40 bg-sell-muted/20 px-2 py-2">
            <p className="text-[9px] font-semibold text-sell/80">Loss streak</p>
            <span className="mt-1 block font-mono text-lg font-bold tabular-nums text-sell leading-none">
              {lossStreak || "—"}
            </span>
          </div>
        </div>

        {/* Daily Recap */}
        <div className="rounded-lg border border-border-default bg-inset/50 p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted mb-2">Daily Recap (7d)</p>
          <div className="space-y-1">
            {dailyBreakdown.map((day) => {
              const dayAccuracy = day.accuracy;
              const dayTone = dayAccuracy == null
                ? "text-txt-muted"
                : dayAccuracy >= 60
                  ? "text-buy"
                  : dayAccuracy >= 45
                    ? "text-hold"
                    : "text-sell";

              return (
                <div key={day.date} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-txt-secondary w-12">{day.date}</span>
                  <div className="flex-1 flex items-center gap-1">
                    <span className="font-mono text-buy tabular-nums">{day.wins}W</span>
                    <span className="text-txt-muted">/</span>
                    <span className="font-mono text-sell tabular-nums">{day.losses}L</span>
                  </div>
                  <span className={`font-mono font-bold tabular-nums ${dayTone} w-12 text-right`}>
                    {dayAccuracy == null ? "--" : `${dayAccuracy.toFixed(0)}%`}
                  </span>
                  <span className="text-txt-muted w-6 text-right">{day.total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!hydrated && (
          <div className="rounded-lg border border-border-default bg-elevated/20 px-3 py-2 text-center">
            <p className="text-[10px] text-txt-secondary">Loading history</p>
          </div>
        )}
      </div>
    </Card>
  );
}

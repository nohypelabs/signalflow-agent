"use client";

import { Layers } from "lucide-react";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";

interface Props {
  tickers: SoDEXTicker[];
  signals: Signal[];
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export default function MarketBreadthCard({ tickers, signals }: Props) {
  const validTickers = tickers
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      price: toFiniteNumber(t.lastPx),
      change: toFiniteNumber(t.changePct),
      volume: toFiniteNumber(t.quoteVolume),
    }))
    .filter((t) => t.price > 0);

  const advancers = validTickers.filter((t) => t.change > 0).length;
  const decliners = validTickers.filter((t) => t.change < 0).length;
  const unchanged = Math.max(0, validTickers.length - advancers - decliners);
  const breadthTotal = Math.max(1, advancers + decliners + unchanged);
  const breadthScore = Math.round(((advancers - decliners) / breadthTotal) * 100);

  const longSignals = signals.filter((s) => s.action === "LONG").length;
  const shortSignals = signals.filter((s) => s.action === "SHORT").length;
  const holdSignals = Math.max(0, signals.length - longSignals - shortSignals);

  const strongestMove = [...validTickers].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const highestVolume = [...validTickers].sort((a, b) => b.volume - a.volume)[0];
  const medianChange = validTickers.length > 0
    ? [...validTickers].sort((a, b) => a.change - b.change)[Math.floor(validTickers.length / 2)]?.change ?? 0
    : 0;
  const participation = validTickers.length > 0 ? Math.round(((advancers + decliners) / validTickers.length) * 100) : 0;

  const tone = breadthScore > 10 ? "text-buy" : breadthScore < -10 ? "text-sell" : "text-hold";
  const tapeLabel = breadthScore > 10 ? "risk-on" : breadthScore < -10 ? "risk-off" : "mixed";
  const longShare = signals.length > 0 ? Math.round((longSignals / signals.length) * 100) : 0;
  const shortShare = signals.length > 0 ? Math.round((shortSignals / signals.length) * 100) : 0;

  function fmtUsd(n: number): string {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }

  return (
    <Card variant="glass" padding="none" className="overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-accent" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Market Breadth</p>
        </div>
        <span className={`font-mono text-[9px] uppercase tabular-nums ${tone}`}>{tapeLabel}</span>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`font-mono text-3xl font-bold leading-none tabular-nums ${tone}`}>
              {breadthScore > 0 ? "+" : ""}{breadthScore}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Breadth impulse</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{validTickers.length}</p>
            <p className="text-[9px] text-txt-muted">live markets</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-buy tabular-nums">{advancers}</p>
            <p className="text-[8px] uppercase text-txt-muted">adv</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-txt-secondary tabular-nums">{unchanged}</p>
            <p className="text-[8px] uppercase text-txt-muted">flat</p>
          </div>
          <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-sell tabular-nums">{decliners}</p>
            <p className="text-[8px] uppercase text-txt-muted">dec</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-accent-dim/30 bg-accent-muted/10 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-accent tabular-nums">{participation}%</p>
            <p className="text-[8px] uppercase text-txt-muted">active tape</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-txt-primary tabular-nums">{medianChange > 0 ? "+" : ""}{medianChange.toFixed(2)}%</p>
            <p className="text-[8px] uppercase text-txt-muted">median</p>
          </div>
          <div className="rounded-lg border border-hold-dim/30 bg-hold-muted/10 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-hold tabular-nums">{holdSignals}</p>
            <p className="text-[8px] uppercase text-txt-muted">holds</p>
          </div>
        </div>

        <div className="rounded-lg border border-border-default bg-inset/50 p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[9px]">
            <span className="font-semibold text-buy">LONG {longSignals}</span>
            <span className="font-mono text-txt-muted tabular-nums">{signals.length} engine signals</span>
            <span className="font-semibold text-sell">SHORT {shortSignals}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-hold-muted">
            <div className="bg-buy transition-all duration-700" style={{ width: `${longShare}%` }} />
            <div className="bg-sell transition-all duration-700" style={{ width: `${shortShare}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-txt-muted">
            <span className="truncate">
              Lead: {strongestMove ? `${strongestMove.symbol} ${strongestMove.change > 0 ? "+" : ""}${strongestMove.change.toFixed(2)}%` : "waiting"}
            </span>
            <span className="shrink-0 font-mono tabular-nums">
              {highestVolume ? fmtUsd(highestVolume.volume) : "sync"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

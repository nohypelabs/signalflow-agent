"use client";

import { stats } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";
import Card from "@/components/ui/Card";

interface Props {
  tickers?: SoDEXTicker[] | null;
}

const icons = {
  volume: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  pairs: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  signals: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" />
    </svg>
  ),
  gainer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  loser: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
    </svg>
  ),
};

/** Parse changePct — already a number on SoDEXTicker, but guard against NaN */
function parseChange(t: SoDEXTicker): number | null {
  const v = t.changePct;
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

/** Return the top positive mover, or null if none */
function getTopGainer(tickers: SoDEXTicker[]): SoDEXTicker | null {
  const valid = tickers
    .map((t) => ({ t, change: parseChange(t) }))
    .filter((x) => x.change !== null && x.change > 0 && parseFloat(x.t.lastPx) > 0);

  if (valid.length === 0) return null;
  valid.sort((a, b) => (b.change as number) - (a.change as number));
  return valid[0].t;
}

/** Return the worst negative mover, or null if none */
function getWorstPerformer(tickers: SoDEXTicker[]): SoDEXTicker | null {
  const valid = tickers
    .map((t) => ({ t, change: parseChange(t) }))
    .filter((x) => x.change !== null && x.change < 0 && parseFloat(x.t.lastPx) > 0);

  if (valid.length === 0) return null;
  valid.sort((a, b) => (a.change as number) - (b.change as number));
  return valid[0].t;
}

function symbolFromTicker(t: SoDEXTicker): string {
  return t.symbol.replace(/^v/, "").replace(/_vUSDC$/, "");
}

export default function KPICards({ tickers }: Props) {
  const hasLive = tickers && tickers.length > 0;

  const totalVol = hasLive
    ? tickers.reduce((sum, t) => sum + parseFloat(t.quoteVolume || "0"), 0)
    : 0;
  const activePairs = hasLive ? tickers.filter((t) => parseFloat(t.lastPx) > 0).length : stats.activeSignals;

  const topGainer = hasLive ? getTopGainer(tickers) : null;
  const worstPerformer = hasLive ? getWorstPerformer(tickers) : null;

  const cards = [
    {
      label: hasLive ? "24H VOLUME" : "TOTAL P&L (24H)",
      value: hasLive ? `$${(totalVol / 1e6).toFixed(1)}M` : `+$${stats.totalPnl.toLocaleString()}`,
      sub: hasLive ? `${tickers.length} pairs traded` : `+${stats.pnlPercent}% today`,
      color: "#00ff88",
      icon: "volume" as const,
    },
    {
      label: hasLive ? "ACTIVE PAIRS" : "WIN RATE",
      value: String(activePairs),
      sub: hasLive ? "SoDEX Mainnet" : `${stats.winTrades}/${stats.totalTrades} trades`,
      color: "#00d4ff",
      icon: "pairs" as const,
    },
    {
      label: "ACTIVE SIGNALS",
      value: String(stats.activeSignals),
      sub: (
        <>
          <span className="text-buy">{stats.buySignals}B</span>
          <span className="text-txt-dim mx-0.5">·</span>
          <span className="text-hold">{stats.holdSignals}H</span>
          <span className="text-txt-dim mx-0.5">·</span>
          <span className="text-sell">{stats.sellSignals}S</span>
        </>
      ),
      color: "#00E5A8",
      icon: "signals" as const,
    },
    {
      label: hasLive ? "TOP 24H GAINER" : "AVG CONFIDENCE",
      value: hasLive
        ? topGainer
          ? symbolFromTicker(topGainer)
          : "—"
        : `${stats.avgConfidence}%`,
      sub: hasLive
        ? topGainer
          ? `+${(parseChange(topGainer) as number).toFixed(2)}%`
          : "No positive movers"
        : "High conviction mode",
      color: hasLive ? (topGainer ? "#00ff88" : "#F59E0B") : "#ff8800",
      icon: "gainer" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} padding="none" className="overflow-hidden group">
          <div className="p-4 relative">
            {/* Subtle top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
              style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }}
            />
            {/* Icon + label */}
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: c.color }} className="opacity-50">
                {icons[c.icon]}
              </span>
              <p className="text-[10px] text-txt-muted uppercase tracking-wider font-medium">
                {c.label}
              </p>
            </div>
            {/* Value */}
            <p
              className="text-2xl font-bold font-mono tabular-nums tracking-tight"
              style={{ color: c.color }}
            >
              {c.value}
            </p>
            {/* Sub line */}
            <p className="text-[11px] mt-1.5 text-txt-muted">
              {typeof c.sub === "string" ? c.sub : c.sub}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

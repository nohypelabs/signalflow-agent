"use client";

import { stats } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface Props {
  tickers?: SoDEXTicker[] | null;
}

/* ── Inline SVG icons (stroke-only, compact) ── */
const icons = {
  volume: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  pairs: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  signals: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" />
    </svg>
  ),
  gainer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
};

/* ── Helpers ── */
function parseChange(t: SoDEXTicker): number | null {
  const v = t.changePct;
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function getTopGainer(tickers: SoDEXTicker[]): SoDEXTicker | null {
  const valid = tickers
    .map((t) => ({ t, change: parseChange(t) }))
    .filter((x) => x.change !== null && x.change > 0 && parseFloat(x.t.lastPx) > 0);
  if (valid.length === 0) return null;
  valid.sort((a, b) => (b.change as number) - (a.change as number));
  return valid[0].t;
}

function symbolFromTicker(t: SoDEXTicker): string {
  return t.symbol.replace(/^v/, "").replace(/_vUSDC$/, "");
}

/* ── Trend Arrow ── */
function TrendArrow({ value, size = 10 }: { value: number; size?: number }) {
  if (value > 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-buy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 7 7 17" /><polyline points="7 7 17 7 17 17" />
      </svg>
    );
  }
  if (value < 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-sell)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="7 17 17 7" /><polyline points="17 17 7 17 7 7" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ── Main Component ── */
export default function KPICards({ tickers }: Props) {
  const hasLive = tickers && tickers.length > 0;

  const totalVol = hasLive
    ? tickers.reduce((sum, t) => sum + parseFloat(t.quoteVolume || "0"), 0)
    : 0;
  const activePairs = hasLive
    ? tickers.filter((t) => parseFloat(t.lastPx) > 0).length
    : stats.activeSignals;

  const topGainer = hasLive ? getTopGainer(tickers) : null;
  const gainerChange = topGainer ? parseChange(topGainer) : null;

  const cards = [
    {
      label: "24H Volume",
      value: hasLive ? `$${(totalVol / 1e6).toFixed(1)}M` : `+$${stats.totalPnl.toLocaleString()}`,
      sub: hasLive ? `${tickers.length} pairs traded` : `+${stats.pnlPercent}% today`,
      trend: hasLive ? 1 : null,
      timebadge: "24h",
      icon: "volume" as const,
      accent: "#00ff88",
    },
    {
      label: "Active Pairs",
      value: String(activePairs),
      sub: hasLive ? "SoDEX Mainnet" : `${stats.winTrades}/${stats.totalTrades} trades`,
      trend: null,
      timebadge: "live",
      icon: "pairs" as const,
      accent: "#00d4ff",
    },
    {
      label: "Live Signals",
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
      trend: null,
      timebadge: "live",
      icon: "signals" as const,
      accent: "#00E5A8",
    },
    {
      label: "Top 24H Gainer",
      value: hasLive
        ? topGainer
          ? symbolFromTicker(topGainer)
          : "—"
        : `${stats.avgConfidence}%`,
      sub: hasLive
        ? topGainer
          ? `+${(gainerChange as number).toFixed(2)}%`
          : "Market broadly negative"
        : "High conviction mode",
      trend: hasLive && gainerChange !== null ? (gainerChange > 0 ? 1 : gainerChange < 0 ? -1 : 0) : null,
      timebadge: "24h",
      icon: "gainer" as const,
      accent: hasLive ? (topGainer ? "#00ff88" : "#F59E0B") : "#ff8800",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="group relative bg-card border border-border-default rounded-lg overflow-hidden hover:border-border-muted transition-colors"
        >
          {/* Top accent stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, ${c.accent}80, transparent)` }}
          />

          <div className="px-3.5 pt-3 pb-3">
            {/* Row 1: icon + label + timebadge */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span style={{ color: c.accent }} className="opacity-40">
                  {c.icon}
                </span>
                <span className="text-[10px] text-txt-muted uppercase tracking-[0.12em] font-medium">
                  {c.label}
                </span>
              </div>
              {c.timebadge && (
                <span className={`text-[8px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded ${
                  c.timebadge === "live"
                    ? "bg-buy-muted text-buy"
                    : "bg-[#ffffff06] text-txt-faint"
                }`}>
                  {c.timebadge}
                </span>
              )}
            </div>

            {/* Row 2: value + trend */}
            <div className="flex items-end gap-1.5">
              <span
                className="text-xl font-bold font-mono tabular-nums tracking-tight leading-none"
                style={{ color: c.accent }}
              >
                {c.value}
              </span>
              {c.trend !== null && (
                <span className="mb-0.5">
                  <TrendArrow value={c.trend} size={11} />
                </span>
              )}
            </div>

            {/* Row 3: sub info */}
            <p className="text-[10px] mt-1.5 text-txt-dim leading-tight">
              {typeof c.sub === "string" ? c.sub : c.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

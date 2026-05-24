"use client";

import { stats } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface Props {
  tickers?: SoDEXTicker[] | null;
}

export default function KPICards({ tickers }: Props) {
  const hasLive = tickers && tickers.length > 0;

  const totalVol = hasLive
    ? tickers.reduce((sum, t) => sum + parseFloat(t.quoteVolume || "0"), 0)
    : 0;
  const topMover = hasLive
    ? tickers.reduce((best, t) => (Math.abs(t.changePct) > Math.abs(best.changePct) ? t : best), tickers[0])
    : null;
  const activePairs = hasLive ? tickers.filter((t) => parseFloat(t.lastPx) > 0).length : stats.activeSignals;

  const cards = [
    {
      label: hasLive ? "24H VOLUME" : "TOTAL P&L (24H)",
      value: hasLive ? `$${(totalVol / 1e6).toFixed(1)}M` : `+$${stats.totalPnl.toLocaleString()}`,
      sub: hasLive ? `${tickers.length} pairs` : `+${stats.pnlPercent}%`,
      color: "#00ff88",
    },
    {
      label: hasLive ? "ACTIVE PAIRS" : "WIN RATE",
      value: String(activePairs),
      sub: hasLive ? "SoDEX Testnet" : `${stats.winTrades}/${stats.totalTrades} trades`,
      color: "#00d4ff",
    },
    {
      label: "ACTIVE SIGNALS",
      value: String(stats.activeSignals),
      sub: `${stats.buySignals} BUY / ${stats.holdSignals} HOLD / ${stats.sellSignals} SELL`,
      color: "#7b2fff",
    },
    {
      label: hasLive && topMover ? "TOP MOVER" : "AVG CONFIDENCE",
      value: hasLive && topMover
        ? topMover.symbol.replace(/^v/, "").replace(/_vUSDC$/, "")
        : `${stats.avgConfidence}%`,
      sub: hasLive && topMover
        ? `${topMover.changePct >= 0 ? "+" : ""}${topMover.changePct.toFixed(1)}%`
        : "High conviction mode",
      color: "#ff8800",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4">
          <p className="text-[11px] text-[#666677] mb-2">{c.label}</p>
          <p className="text-2xl font-bold" style={{ color: c.color }}>
            {c.value}
          </p>
          <p className="text-xs mt-1" style={{ color: c.color }}>
            {c.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

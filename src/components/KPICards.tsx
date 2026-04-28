"use client";

import { stats } from "@/lib/mock-data";

const cards = [
  {
    label: "TOTAL P&L (24H)",
    value: `+$${stats.totalPnl.toLocaleString()}`,
    sub: `+${stats.pnlPercent}%`,
    color: "#00ff88",
  },
  {
    label: "WIN RATE",
    value: `${stats.winRate}%`,
    sub: `${stats.winTrades}/${stats.totalTrades} trades`,
    color: "#00d4ff",
  },
  {
    label: "ACTIVE SIGNALS",
    value: String(stats.activeSignals),
    sub: `${stats.buySignals} BUY / ${stats.holdSignals} HOLD / ${stats.sellSignals} SELL`,
    color: "#7b2fff",
  },
  {
    label: "AVG CONFIDENCE",
    value: `${stats.avgConfidence}%`,
    sub: "High conviction mode",
    color: "#ff8800",
  },
];

export default function KPICards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4"
        >
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

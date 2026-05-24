"use client";

import { signals, Signal } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";

const actionColors: Record<Signal["action"], { bg: string; border: string; text: string; accent: string }> = {
  BUY: { bg: "bg-[#0d2a1a]", border: "border-[#00ff8840]", text: "text-[#00ff88]", accent: "#00ff88" },
  SELL: { bg: "bg-[#2a0d0d]", border: "border-[#ff444440]", text: "text-[#ff4444]", accent: "#ff4444" },
  HOLD: { bg: "bg-[#1a1a0d]", border: "border-[#ff880040]", text: "text-[#ff8800]", accent: "#ff8800" },
};

const dimLabels = [
  { key: "etfFlow" as const, label: "ETF Flow", color: "#00d4ff" },
  { key: "sentiment" as const, label: "Sentiment", color: "#7b2fff" },
  { key: "macro" as const, label: "Macro", color: "#00ff88" },
  { key: "momentum" as const, label: "Momentum", color: "#ff8800" },
  { key: "treasury" as const, label: "Treasury", color: "#ff4488" },
];

interface Props {
  tickers?: SoDEXTicker[] | null;
}

export default function SignalsPage({ tickers }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">All Signals</h2>
        {tickers && tickers.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-[#00ff8820] text-[#00ff88] border border-[#00ff8830] rounded">LIVE PRICES</span>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {signals.map((s) => {
          const c = actionColors[s.action];
          const sodSym = pairToSodexSymbol(s.pair);
          const live = sodSym ? tickerMap.get(sodSym) : undefined;
          const price = live ? parseFloat(live.lastPx) : s.price;
          const chg = live ? live.changePct : s.change24h;

          return (
            <div key={s.id} className={`${c.bg} ${c.border} border rounded-xl p-5`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">{s.pair}</span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded border ${c.text}`} style={{ borderColor: c.accent }}>
                    {s.action}
                  </span>
                  {live && <span className="text-[9px] text-[#00ff88]">LIVE</span>}
                </div>
                <div className="text-right">
                  <span className="text-sm text-white font-semibold">
                    ${typeof price === "number" ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price}
                  </span>
                  <span className={`text-xs ml-2 ${chg >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                    {chg >= 0 ? "+" : ""}{typeof chg === "number" ? chg.toFixed(1) : chg}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#aaaaaa] mb-3 line-clamp-2">{s.reasoning}</p>
              <div className="flex flex-col gap-1.5">
                {dimLabels.map((d) => (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="text-[10px] w-16 shrink-0" style={{ color: d.color }}>{d.label}</span>
                    <div className="flex-1 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.dimensions[d.key]}%`, backgroundColor: d.color }} />
                    </div>
                    <span className="text-[10px] w-7 text-right" style={{ color: d.color }}>{s.dimensions[d.key]}%</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#ffffff10]">
                <span className="text-[10px] text-[#666677]">Confidence: <span className={`font-bold ${c.text}`}>{s.confidence}%</span></span>
                <span className="text-[10px] text-[#444455]">{s.timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

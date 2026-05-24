"use client";

import { signals, Signal } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";

const actionColors: Record<Signal["action"], { bg: string; border: string; text: string }> = {
  BUY: { bg: "bg-[#0d2a1a]", border: "border-[#00ff8840]", text: "text-[#00ff88]" },
  SELL: { bg: "bg-[#2a0d0d]", border: "border-[#ff444440]", text: "text-[#ff4444]" },
  HOLD: { bg: "bg-[#1a1a0d]", border: "border-[#ff880040]", text: "text-[#ff8800]" },
};

interface Props {
  onSelect: (s: Signal) => void;
  selected: string | null;
  tickers?: SoDEXTicker[] | null;
}

export default function SignalList({ onSelect, selected, tickers }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  return (
    <div className="w-full lg:w-64 bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4 shrink-0">
      <h3 className="font-semibold text-sm mb-3">Latest Signals</h3>
      <div className="flex flex-col gap-2">
        {signals.map((s) => {
          const c = actionColors[s.action];
          const sodSym = pairToSodexSymbol(s.pair);
          const live = sodSym ? tickerMap.get(sodSym) : undefined;
          const price = live ? parseFloat(live.lastPx) : s.price;
          const chg = live ? live.changePct : s.change24h;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`text-left w-full rounded-lg p-3 border transition-all ${c.bg} ${c.border} ${
                selected === s.id ? "ring-1 ring-white/20" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-white">
                  {s.pair}
                  {live && <span className="ml-1 text-[8px] text-[#00ff88]">LIVE</span>}
                </span>
                <span className={`text-xs font-bold ${c.text}`}>{s.action}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[11px] text-white font-mono">
                  ${typeof price === "number" ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price}
                  <span className={`ml-1.5 text-[10px] ${chg >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                    {chg >= 0 ? "+" : ""}{typeof chg === "number" ? chg.toFixed(1) : chg}%
                  </span>
                </span>
                <span className={`text-[10px] ${c.text}`}>{s.confidence}%</span>
              </div>
              <span className="text-[9px] text-[#444455]">{s.timeAgo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

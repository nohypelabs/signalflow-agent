"use client";

import { signals, Signal } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";

interface Props {
  onSelect: (s: Signal) => void;
  selected: string | null;
  tickers?: SoDEXTicker[] | null;
}

export default function SignalList({ onSelect, selected, tickers }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  return (
    <Card padding="md" className="w-full lg:w-64 shrink-0">
      <h3 className="font-semibold text-sm mb-3">Latest Signals</h3>
      <div className="flex flex-col gap-2">
        {signals.map((s) => {
          const sodSym = pairToSodexSymbol(s.pair);
          const live = sodSym ? tickerMap.get(sodSym) : undefined;
          const price = live ? parseFloat(live.lastPx) : s.price;
          const chg = live ? live.changePct : s.change24h;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`text-left w-full rounded-xl p-3 border border-border-default bg-card hover:border-accent-dim cursor-pointer transition-all ${
                selected === s.id ? "ring-1 ring-accent" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-txt-primary">
                  {s.pair}
                  {live && <Badge variant="live" size="sm" className="ml-1.5">LIVE</Badge>}
                </span>
                <Badge variant={s.action.toLowerCase()} size="sm">{s.action}</Badge>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[11px] text-txt-primary font-mono">
                  ${typeof price === "number" ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price}
                  <span className={`ml-1.5 text-[10px] ${chg >= 0 ? "text-buy" : "text-sell"}`}>
                    {chg >= 0 ? "+" : ""}{typeof chg === "number" ? chg.toFixed(1) : chg}%
                  </span>
                </span>
                <ConfidenceGauge value={s.confidence} size="sm" />
              </div>
              <span className="text-[9px] text-txt-dim">{s.timeAgo}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

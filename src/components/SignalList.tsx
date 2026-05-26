"use client";

import { signals as mockSignals } from "@/lib/mock-data";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";

const actionStyles: Record<string, { border: string; bg: string; dot: string }> = {
  buy: { border: "border-l-buy", bg: "hover:bg-buy-muted/30", dot: "bg-buy" },
  sell: { border: "border-l-sell", bg: "hover:bg-sell-muted/30", dot: "bg-sell" },
  hold: { border: "border-l-hold", bg: "hover:bg-hold-muted/30", dot: "bg-hold" },
};

interface Props {
  onSelect: (s: Signal) => void;
  selected: string | null;
  tickers?: SoDEXTicker[] | null;
  liveSignals?: Signal[];
}

export default function SignalList({ onSelect, selected, tickers, liveSignals }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  // Use live signals if available, fallback to mock
  const displaySignals = liveSignals && liveSignals.length > 0 ? liveSignals : mockSignals;
  const isLive = liveSignals && liveSignals.length > 0;

  return (
    <Card padding="none" className="w-full lg:w-72 shrink-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-txt-muted">Latest Signals</h3>
        <div className="flex items-center gap-1.5">
          {isLive && <Badge variant="live" size="sm">LIVE</Badge>}
          <span className="text-[10px] text-txt-dim">{displaySignals.length} active</span>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-border-default">
        {displaySignals.map((s) => {
          const sodSym = pairToSodexSymbol(s.pair);
          const live = sodSym ? tickerMap.get(sodSym) : undefined;
          const price = live ? parseFloat(live.lastPx) : s.price;
          const chg = live ? live.changePct : s.change24h;
          const style = actionStyles[s.action.toLowerCase()] ?? actionStyles.hold;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`
                text-left w-full px-4 py-3 cursor-pointer transition-all border-l-2
                ${style.border} ${style.bg}
                ${selected === s.id ? "bg-elevated/80 ring-1 ring-inset ring-accent-dim" : "bg-transparent"}
              `}
            >
              {/* Row 1: Pair + Action badge */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  <span className="text-xs font-semibold text-txt-primary">
                    {s.pair}
                  </span>
                  {live && (
                    <Badge variant="live" size="sm" className="animate-pulse-glow">LIVE</Badge>
                  )}
                </div>
                <Badge variant={s.action.toLowerCase()} size="sm">{s.action}</Badge>
              </div>

              {/* Row 2: Price + Change + Confidence */}
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-[11px] text-txt-secondary font-mono">
                  ${typeof price === "number" ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price}
                  <span className={`ml-1.5 text-[10px] font-semibold ${chg >= 0 ? "text-buy" : "text-sell"}`}>
                    {chg >= 0 ? "+" : ""}{typeof chg === "number" ? chg.toFixed(1) : chg}%
                  </span>
                </span>
                <ConfidenceGauge value={s.confidence} size="sm" />
              </div>

              {/* Row 3: Time */}
              <span className="text-[10px] text-txt-dim mt-0.5 block">{s.timeAgo}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

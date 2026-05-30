"use client";

import type { SoDEXTicker } from "@/lib/types/trade";

interface Props {
  ticker: SoDEXTicker | undefined;
}

export default function SpreadIndicator({ ticker }: Props) {
  if (!ticker) return null;

  const bid = parseFloat(ticker.bidPx);
  const ask = parseFloat(ticker.askPx);
  const price = parseFloat(ticker.lastPx);

  if (!bid || !ask || !price) return null;

  const spread = ask - bid;
  const spreadPct = (spread / ask) * 100;

  // Color: tight spread = green, wide = red
  const colorClass = spreadPct < 0.05 ? "text-[#00ff88]" : spreadPct < 0.2 ? "text-[#ff8800]" : "text-[#ff4444]";

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] text-txt-faint uppercase">Spread</span>
      <span className={`text-[10px] font-mono font-medium ${colorClass}`}>
        {spreadPct.toFixed(3)}%
      </span>
      <span className="text-[9px] font-mono text-txt-faint">
        (${spread.toFixed(2)})
      </span>
    </div>
  );
}

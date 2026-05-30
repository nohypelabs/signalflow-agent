"use client";

import type { SoDEXTicker } from "@/lib/types/trade";

interface Props {
  ticker: SoDEXTicker | undefined;
}

export default function HighLowRange({ ticker }: Props) {
  if (!ticker) return null;

  const price = parseFloat(ticker.lastPx);
  const high = parseFloat(ticker.highPx);
  const low = parseFloat(ticker.lowPx);

  if (!price || !high || !low || high === low) return null;

  const posPct = ((price - low) / (high - low)) * 100;

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[9px] font-mono text-txt-faint min-w-fit">${low.toLocaleString()}</span>
      <div className="flex-1 relative h-1.5 bg-elevated rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${posPct}%`,
            background: "linear-gradient(90deg, #ff4444, #ff8800, #00ff88)",
          }}
        />
        {/* Current price marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-border-default"
          style={{ left: `${posPct}%`, transform: `translateX(-50%) translateY(-50%)` }}
        />
      </div>
      <span className="text-[9px] font-mono text-txt-faint min-w-fit">${high.toLocaleString()}</span>
    </div>
  );
}

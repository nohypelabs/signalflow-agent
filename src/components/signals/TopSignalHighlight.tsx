"use client";

import { useRouter } from "next/navigation";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import SignalTypeBadge from "./SignalTypeBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import { formatPrice, formatPercent } from "./signal-utils";

interface Props {
  signal: Signal;
  ticker?: SoDEXTicker;
}

export default function TopSignalHighlight({ signal, ticker }: Props) {
  const router = useRouter();
  const price = ticker ? parseFloat(ticker.lastPx) : signal.price;
  const change = ticker ? ticker.changePct : signal.change24h;
  const coin = signal.pair.split("/")[0];

  return (
    <div className="mb-5 relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 via-card to-card">
      {/* Accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-buy to-accent/30" />

      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[10px] text-accent font-bold uppercase tracking-wider">Top Signal</span>
          </div>

          <span className="text-sm font-bold text-txt-primary">{signal.pair}</span>
          <SignalTypeBadge action={signal.action} size="md" />

          <span className="text-sm font-bold font-mono text-txt-primary">
            ${formatPrice(price, coin)}
          </span>
          <span className={`text-xs font-mono font-semibold ${change >= 0 ? "text-buy" : "text-sell"}`}>
            {formatPercent(change)}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ConfidenceBadge value={signal.confidence} size="md" showLabel />
          <p className="text-xs text-txt-muted max-w-xs truncate hidden md:block">
            {signal.reasoning}
          </p>
          {signal.action !== "HOLD" && (
            <button
              onClick={() => router.push(`/trading?signal=${signal.id}`)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                signal.action === "SHORT"
                  ? "bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/20 hover:bg-[#00ff88]/25"
                  : "bg-[#ff4444]/15 text-[#ff4444] border border-[#ff4444]/20 hover:bg-[#ff4444]/25"
              }`}
            >
              Execute {signal.action}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

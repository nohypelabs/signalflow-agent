"use client";

import type { FavoriteTicker } from "@/lib/hooks/useFavoriteTickers";

interface Props {
  tickers: FavoriteTicker[];
  onSelectTicker?: (symbol: string) => void;
}

export default function FavoriteTickerBar({ tickers, onSelectTicker }: Props) {
  if (tickers.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 h-8 bg-[#060810] border-b border-border-default">
        <span className="text-[10px] text-txt-faint">No favorite tickers yet</span>
        <span className="text-[9px] text-txt-faint">· Star a pair to pin it here</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto bg-[#060810] border-b border-border-default h-8 scrollbar-none">
      <span className="text-[9px] text-txt-faint uppercase tracking-wider font-semibold px-3 shrink-0">Watchlist</span>
      <div className="h-3 w-px bg-border-default shrink-0" />
      {tickers.map((t) => {
        const isUp = t.change24h >= 0;
        return (
          <button
            key={t.symbol}
            onClick={() => onSelectTicker?.(t.symbol)}
            className="inline-flex items-center gap-1.5 px-3 h-full shrink-0 hover:bg-[#ffffff04] transition-colors"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="var(--color-hold)" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[10px] font-semibold text-txt-secondary">{t.pair}</span>
            <span className="text-[10px] text-txt-primary font-mono tabular-nums">
              {t.price > 0 ? t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
            </span>
            <span className={`text-[10px] font-mono font-semibold tabular-nums ${isUp ? "text-buy" : "text-sell"}`}>
              {isUp ? "+" : ""}{t.change24h.toFixed(2)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

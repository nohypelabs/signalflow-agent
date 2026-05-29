"use client";

import type { SoDEXTicker } from "@/lib/sodex-types";
import { sodexSymbolToBase } from "@/lib/pair-map";

interface TickerItem {
  symbol: string;    // "BTC/USDC"
  base: string;      // "BTC"
  price: string;
  changePct: number;
}


function formatPrice(px: number): string {
  if (px >= 10000) return px.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (px >= 1) return px.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return px.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function resolveTickers(tickerMap?: Map<string, SoDEXTicker>): TickerItem[] {
  if (!tickerMap || tickerMap.size === 0) return [];

  const items: TickerItem[] = [];
  for (const [symbol, t] of tickerMap) {
    const base = sodexSymbolToBase(symbol);
    const price = parseFloat(t.lastPx);
    if (isNaN(price) || price <= 0) continue;
    items.push({
      symbol: `${base}/USDC`,
      base,
      price: formatPrice(price),
      changePct: typeof t.changePct === "number" && !isNaN(t.changePct) ? t.changePct : 0,
    });
  }
  return items;
}

function TokenIcon({ base }: { base: string }) {
  const src = `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`;
  return (
    <img
      src={src}
      alt={base}
      width={14}
      height={14}
      className="rounded-full shrink-0"
      loading="lazy"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function TickerItemChip({
  item,
  isFav,
  onToggleFav,
}: {
  item: TickerItem;
  isFav: boolean;
  onToggleFav?: (base: string) => void;
}) {
  const isUp = item.changePct >= 0;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 shrink-0">
      {onToggleFav && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(item.base);
          }}
          className="shrink-0 hover:scale-110 transition-transform"
          title={isFav ? "Remove from watchlist" : "Add to watchlist"}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill={isFav ? "var(--color-hold)" : "none"}
            stroke={isFav ? "var(--color-hold)" : "var(--text-dim)"}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      )}
      <TokenIcon base={item.base} />
      <span className="text-txt-secondary font-semibold text-[10px]">{item.symbol}</span>
      <span className="text-txt-primary font-mono text-[10px] tabular-nums">{item.price}</span>
      <span className={`font-mono text-[10px] font-semibold tabular-nums ${isUp ? "text-buy" : "text-sell"}`}>
        {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
      </span>
      <span className={`text-[8px] ${isUp ? "text-buy" : "text-sell"}`}>
        {isUp ? "▲" : "▼"}
      </span>
    </span>
  );
}

interface Props {
  tickerMap?: Map<string, SoDEXTicker>;
  isFavorite?: (base: string) => boolean;
  onToggleFavorite?: (base: string) => void;
  /** When true, skip outer wrapper styling (bg, border) — parent provides container styles */
  embedded?: boolean;
}

export default function MarketTickerTape({ tickerMap, isFavorite, onToggleFavorite, embedded }: Props) {
  const tickers = resolveTickers(tickerMap);

  if (tickers.length === 0) return null;

  // Duplicate for seamless loop
  const doubled = [...tickers, ...tickers];

  const content = (
    <div className="ticker-tape-scroll flex items-center h-7 whitespace-nowrap">
      {doubled.map((item, i) => (
        <TickerItemChip
          key={`${item.symbol}-${i}`}
          item={item}
          isFav={isFavorite?.(item.base) ?? false}
          onToggleFav={onToggleFavorite}
        />
      ))}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="w-full bg-[#060810] border-b border-border-default overflow-hidden group">
      {content}
    </div>
  );
}

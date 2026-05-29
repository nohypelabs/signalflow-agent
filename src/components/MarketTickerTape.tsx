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

function TickerItemChip({ item, onClick }: { item: TickerItem; onClick?: (symbol: string) => void }) {
  const isUp = item.changePct >= 0;
  return (
    <button
      type="button"
      onClick={() => onClick?.(item.symbol)}
      className={`inline-flex items-center gap-1.5 px-3 shrink-0 transition-colors ${
        onClick ? "cursor-pointer hover:bg-elevated/40 rounded" : ""
      }`}
    >
      <TokenIcon base={item.base} />
      <span className="text-txt-secondary font-semibold text-[10px]">{item.symbol}</span>
      <span className="text-txt-primary font-mono text-[10px] tabular-nums">{item.price}</span>
      <span className={`font-mono text-[10px] font-semibold tabular-nums ${isUp ? "text-buy" : "text-sell"}`}>
        {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
      </span>
      <span className={`text-[8px] ${isUp ? "text-buy" : "text-sell"}`}>
        {isUp ? "▲" : "▼"}
      </span>
    </button>
  );
}

interface Props {
  tickerMap?: Map<string, SoDEXTicker>;
  /** When true, skip outer wrapper styling (bg, border) — parent provides container styles */
  embedded?: boolean;
  /** Called when a ticker is clicked — SoDEX symbol (e.g. "BTC/USDC") */
  onTickerClick?: (symbol: string) => void;
}

export default function MarketTickerTape({ tickerMap, embedded, onTickerClick }: Props) {
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
          onClick={onTickerClick}
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

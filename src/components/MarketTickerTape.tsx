"use client";

import type { SoDEXTicker } from "@/lib/sodex-types";
import { sodexSymbolToBase } from "@/lib/pair-map";

interface TickerItem {
  symbol: string;
  price: string;
  changePct: number;
}

const MOCK_TICKERS: TickerItem[] = [
  { symbol: "BTC/USDC", price: "104,285.40", changePct: 0.42 },
  { symbol: "ETH/USDC", price: "2,538.15", changePct: -0.18 },
  { symbol: "SOL/USDC", price: "172.83", changePct: 1.25 },
  { symbol: "LINK/USDC", price: "15.67", changePct: 0.67 },
  { symbol: "DOGE/USDC", price: "0.2284", changePct: -0.91 },
  { symbol: "AVAX/USDC", price: "22.45", changePct: 2.14 },
  { symbol: "ADA/USDC", price: "0.7612", changePct: -0.33 },
  { symbol: "XRP/USDC", price: "2.34", changePct: 0.88 },
  { symbol: "BNB/USDC", price: "658.20", changePct: -0.52 },
];

function formatPrice(px: number): string {
  if (px >= 10000) return px.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (px >= 1) return px.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return px.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function resolveTickers(tickerMap?: Map<string, SoDEXTicker>): TickerItem[] {
  if (!tickerMap || tickerMap.size === 0) return MOCK_TICKERS;

  const items: TickerItem[] = [];
  for (const [symbol, t] of tickerMap) {
    const base = sodexSymbolToBase(symbol);
    const price = parseFloat(t.lastPx);
    if (isNaN(price) || price <= 0) continue;
    items.push({
      symbol: `${base}/USDC`,
      price: formatPrice(price),
      changePct: typeof t.changePct === "number" && !isNaN(t.changePct) ? t.changePct : 0,
    });
  }
  return items.length > 0 ? items : MOCK_TICKERS;
}

function TickerItemChip({ item }: { item: TickerItem }) {
  const isUp = item.changePct >= 0;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 shrink-0">
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
}

export default function MarketTickerTape({ tickerMap }: Props) {
  const tickers = resolveTickers(tickerMap);

  // Duplicate for seamless loop
  const doubled = [...tickers, ...tickers];

  return (
    <div className="w-full bg-[#060810] border-b border-border-default overflow-hidden group">
      <div className="ticker-tape-scroll flex items-center h-7 whitespace-nowrap">
        {doubled.map((item, i) => (
          <TickerItemChip key={`${item.symbol}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

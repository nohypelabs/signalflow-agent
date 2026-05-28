"use client";

import { useMemo } from "react";

interface Props {
  symbol: string;
  theme?: "dark" | "light";
  interval?: string;
}

/**
 * Maps our pair format (BTC/USDC) to TradingView symbol format.
 * SoDEX pairs map to Binance spot symbols as closest proxy for charting.
 */
function toTVSymbol(pair: string): string {
  const base = pair.split("/")[0].toUpperCase();
  // Map to Binance spot pairs (most liquid, best charting data)
  const map: Record<string, string> = {
    BTC: "BINANCE:BTCUSDT",
    ETH: "BINANCE:ETHUSDT",
    SOL: "BINANCE:SOLUSDT",
    BNB: "BINANCE:BNBUSDT",
    XRP: "BINANCE:XRPUSDT",
    DOGE: "BINANCE:DOGEUSDT",
    ADA: "BINANCE:ADAUSDT",
    AVAX: "BINANCE:AVAXUSDT",
    LINK: "BINANCE:LINKUSDT",
    DOT: "BINANCE:DOTUSDT",
    MATIC: "BINANCE:MATICUSDT",
    UNI: "BINANCE:UNIUSDT",
    LTC: "BINANCE:LTCUSDT",
    AAVE: "BINANCE:AAVEUSDT",
    SUI: "BINANCE:SUIUSDT",
    ARB: "BINANCE:ARBUSDT",
    TON: "BINANCE:TONUSDT",
    PEPE: "BINANCE:PEPEUSDT",
    SHIB: "BINANCE:SHIBUSDT",
    XLM: "BINANCE:XLMUSDT",
    // Stocks — use NASDAQ/NYSE
    AAPL: "NASDAQ:AAPL",
    MSFT: "NASDAQ:MSFT",
    TSLA: "NASDAQ:TSLA",
    GOOGL: "NASDAQ:GOOGL",
    AMZN: "NASDAQ:AMZN",
    META: "NASDAQ:META",
    NVDA: "NASDAQ:NVDA",
    // Commodities
    XAUT: "TVC:GOLD",
    GOLD: "TVC:GOLD",
    SILVER: "TVC:SILVER",
  };
  return map[base] || `BINANCE:${base}USDT`;
}

export default function TradingViewWidget({ symbol, theme = "dark", interval = "60" }: Props) {
  const tvSymbol = useMemo(() => toTVSymbol(symbol), [symbol]);

  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval,
      theme,
      style: "1",
      locale: "en",
      toolbar_bg: "#0B1020",
      enable_publishing: "false",
      hide_top_toolbar: "false",
      hide_legend: "false",
      save_image: "false",
      backgroundColor: "#05070D",
      gridColor: "#1a2035",
      hide_volume: "false",
      container_id: "tradingview_chart",
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol, interval, theme]);

  return (
    <div className="w-full h-full relative bg-[#05070D]">
      <iframe
        src={src}
        className="w-full h-full border-0"
        title={`TradingView Chart — ${symbol}`}
        allow="clipboard-write"
        loading="lazy"
      />
      {/* Branding overlay — subtle */}
      <div className="absolute bottom-1 right-2 text-[7px] text-txt-faint/40 pointer-events-none">
        Powered by TradingView
      </div>
    </div>
  );
}

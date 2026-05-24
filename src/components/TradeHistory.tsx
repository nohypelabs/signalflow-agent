"use client";

import { signals } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";

interface Props {
  tickers?: SoDEXTicker[] | null;
}

export default function TradeHistory({ tickers }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  const trades = signals.map((s) => {
    const sodSym = pairToSodexSymbol(s.pair);
    const live = sodSym ? tickerMap.get(sodSym) : undefined;
    const livePrice = live ? parseFloat(live.lastPx) : s.price;
    const isBuy = s.action === "BUY";
    const pnlPct = isBuy
      ? ((livePrice - s.price) / s.price) * 100
      : ((s.price - livePrice) / s.price) * 100;
    const pnlUsd = (pnlPct / 100) * 5000; // assume $5k position

    return {
      pair: s.pair,
      action: s.action,
      entry: s.price,
      exit: livePrice,
      pnlPct,
      pnlUsd,
      date: s.timeAgo,
      status: live ? "Live" : "Stale",
      confidence: s.confidence,
    };
  });

  const wins = trades.filter((t) => t.pnlPct > 0).length;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnlUsd, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Trade History</h2>
        {tickers && tickers.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-[#00ff8820] text-[#00ff88] border border-[#00ff8830] rounded">
            LIVE PRICES
          </span>
        )}
      </div>
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a2e] text-[#666677] text-xs">
              <th className="text-left p-3 font-medium">Pair</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-right p-3 font-medium">Entry</th>
              <th className="text-right p-3 font-medium">Current</th>
              <th className="text-right p-3 font-medium">P&L %</th>
              <th className="text-right p-3 font-medium">P&L ($)</th>
              <th className="text-center p-3 font-medium">Confidence</th>
              <th className="text-right p-3 font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e40] transition-colors">
                <td className="p-3 font-semibold text-white">{t.pair}</td>
                <td className="p-3">
                  <span className={`text-xs font-bold ${t.action === "BUY" ? "text-[#00ff88]" : t.action === "SELL" ? "text-[#ff4444]" : "text-[#ff8800]"}`}>
                    {t.action}
                  </span>
                </td>
                <td className="p-3 text-right text-[#aaaaaa]">${t.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-white">${t.exit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`p-3 text-right font-semibold ${t.pnlPct >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                </td>
                <td className={`p-3 text-right font-semibold ${t.pnlUsd >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {t.pnlUsd >= 0 ? "+" : "-"}${Math.abs(t.pnlUsd).toFixed(0)}
                </td>
                <td className="p-3 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    t.confidence >= 80 ? "bg-[#00ff8820] text-[#00ff88]" : t.confidence >= 60 ? "bg-[#ff880020] text-[#ff8800]" : "bg-[#ff444420] text-[#ff4444]"
                  }`}>
                    {t.confidence}%
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.status === "Live" ? "bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830]" : "bg-[#ffffff08] text-[#666677] border border-[#333355]"}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-xs text-[#666677]">
        <span>Signals: {trades.length}</span>
        <span>Winning: <span className="text-[#00ff88]">{wins}/{trades.length}</span></span>
        <span>Total P&L: <span className={totalPnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}>{totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(0)}</span></span>
        <span className="ml-auto text-[10px]">P&L based on live SoDEX prices vs signal entry</span>
      </div>
    </div>
  );
}

"use client";

import { usePerformance } from "@/lib/use-performance";
import { useSignals } from "@/lib/use-signals";

const COIN_COLORS: Record<string, string> = {
  BTC: "#ff8800",
  ETH: "#00d4ff",
  SOL: "#7b2fff",
};

export default function PerformancePage() {
  const { coins, loading, error } = usePerformance();
  const { data: signalsData } = useSignals();

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Performance Analytics</h2>
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <p className="text-xs text-[#666677]">Loading real market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Performance Analytics</h2>
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <p className="text-xs text-[#ff4444]">Failed to load: {error}</p>
        </div>
      </div>
    );
  }

  // Aggregate metrics across coins
  const avgChange24h = coins.length ? coins.reduce((s, c) => s + c.change24h, 0) / coins.length : 0;
  const avgChange30d = coins.length ? coins.reduce((s, c) => s + c.change30d, 0) / coins.length : 0;
  const avgVolatility = coins.length ? coins.reduce((s, c) => s + c.volatility30d, 0) / coins.length : 0;

  const metrics = [
    { label: "Avg 24H Change", value: `${avgChange24h >= 0 ? "+" : ""}${avgChange24h.toFixed(1)}%`, color: avgChange24h >= 0 ? "#00ff88" : "#ff4444" },
    { label: "Avg 30D Return", value: `${avgChange30d >= 0 ? "+" : ""}${avgChange30d.toFixed(1)}%`, color: avgChange30d >= 0 ? "#00ff88" : "#ff4444" },
    { label: "Avg Volatility", value: `${avgVolatility.toFixed(1)}%`, color: "#7b2fff" },
    { label: "Tracked Coins", value: String(coins.length), color: "#00d4ff" },
  ];

  // Monthly returns from klines
  const monthlyBars = coins.map((coin) => {
    const color = COIN_COLORS[coin.symbol] || "#ffffff";
    return {
      label: coin.symbol,
      change30d: coin.change30d,
      change7d: coin.change7d,
      color,
      price: coin.price,
      high30d: coin.high30d,
      low30d: coin.low30d,
    };
  });

  const maxAbsChange = Math.max(...monthlyBars.map((b) => Math.abs(b.change30d)), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Performance Analytics</h2>
        <span className="text-[10px] px-1.5 py-0.5 bg-[#7b2fff20] text-[#7b2fff] border border-[#7b2fff30] rounded">LIVE DATA</span>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4">
            <p className="text-[10px] text-[#666677] mb-1">{m.label}</p>
            <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Per-coin performance cards */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">30-Day Returns (SoSoValue)</h3>
        <div className="flex items-end gap-8 h-48">
          {monthlyBars.map((b) => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#666677]">${b.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className={`text-xs font-bold ${b.change30d >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                {b.change30d >= 0 ? "+" : ""}{b.change30d.toFixed(1)}%
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${(Math.abs(b.change30d) / maxAbsChange) * 100}%`,
                  backgroundColor: b.color,
                  opacity: 0.7,
                  minHeight: "8px",
                }}
              />
              <span className="text-xs font-semibold" style={{ color: b.color }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-coin detail table */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl overflow-hidden">
        <div className="p-4 pb-0">
          <h3 className="font-semibold text-sm mb-3">Coin Details</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-t border-[#1a1a2e] text-[#666677] text-xs">
              <th className="text-left p-3 font-medium">Coin</th>
              <th className="text-right p-3 font-medium">Price</th>
              <th className="text-right p-3 font-medium">24H</th>
              <th className="text-right p-3 font-medium">7D</th>
              <th className="text-right p-3 font-medium">30D</th>
              <th className="text-right p-3 font-medium">30D High</th>
              <th className="text-right p-3 font-medium">30D Low</th>
              <th className="text-right p-3 font-medium">Volatility</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((c) => (
              <tr key={c.symbol} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e40]">
                <td className="p-3 font-bold" style={{ color: COIN_COLORS[c.symbol] }}>{c.symbol}</td>
                <td className="p-3 text-right text-white">${c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`p-3 text-right font-semibold ${c.change24h >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {c.change24h >= 0 ? "+" : ""}{c.change24h.toFixed(1)}%
                </td>
                <td className={`p-3 text-right font-semibold ${c.change7d >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {c.change7d >= 0 ? "+" : ""}{c.change7d.toFixed(1)}%
                </td>
                <td className={`p-3 text-right font-semibold ${c.change30d >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {c.change30d >= 0 ? "+" : ""}{c.change30d.toFixed(1)}%
                </td>
                <td className="p-3 text-right text-[#aaaaaa]">${c.high30d.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-[#aaaaaa]">${c.low30d.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-[#7b2fff]">{c.volatility30d.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signal dimension accuracy (live from SoSoValue) */}
      {signalsData?.dimensions?.BTC && (
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Live Signal Dimensions (BTC)</h3>
          <div className="flex flex-col gap-2">
            {[
              { key: "etfFlow" as const, label: "ETF Flow", color: "#00d4ff" },
              { key: "sentiment" as const, label: "Sentiment", color: "#7b2fff" },
              { key: "macro" as const, label: "Macro", color: "#00ff88" },
              { key: "momentum" as const, label: "Momentum", color: "#ff8800" },
              { key: "treasury" as const, label: "Treasury", color: "#ff4488" },
            ].map((d) => {
              const dim = signalsData.dimensions.BTC[d.key];
              return (
                <div key={d.key}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-28 shrink-0" style={{ color: d.color }}>{d.label}</span>
                    <div className="flex-1 h-3 bg-[#1a1a2e] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${dim.score}%`, backgroundColor: d.color }} />
                    </div>
                    <span className="text-xs w-8 text-right font-semibold" style={{ color: d.color }}>{dim.score}%</span>
                  </div>
                  <p className="text-[10px] text-[#444455] mt-0.5 ml-[8rem]">{dim.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

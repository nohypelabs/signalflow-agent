"use client";

const trades = [
  { pair: "BTC/USDT", action: "BUY", entry: 65200, exit: 68420, pnl: "+4.94%", pnlUsd: "+$494", date: "Apr 27", status: "Closed" },
  { pair: "ETH/USDT", action: "BUY", entry: 3580, exit: 3842, pnl: "+7.32%", pnlUsd: "+$293", date: "Apr 26", status: "Closed" },
  { pair: "SOL/USDT", action: "SELL", entry: 185.0, exit: 178.5, pnl: "+3.51%", pnlUsd: "+$105", date: "Apr 26", status: "Open" },
  { pair: "LINK/USDT", action: "BUY", entry: 17.8, exit: 18.92, pnl: "+6.29%", pnlUsd: "+$189", date: "Apr 25", status: "Closed" },
  { pair: "AVAX/USDT", action: "BUY", entry: 44.2, exit: 42.8, pnl: "-3.17%", pnlUsd: "-$95", date: "Apr 25", status: "Closed" },
  { pair: "BTC/USDT", action: "BUY", entry: 62800, exit: 65200, pnl: "+3.82%", pnlUsd: "+$382", date: "Apr 24", status: "Closed" },
  { pair: "ETH/USDT", action: "SELL", entry: 3720, exit: 3580, pnl: "+3.76%", pnlUsd: "+$150", date: "Apr 23", status: "Closed" },
  { pair: "SOL/USDT", action: "BUY", entry: 168.0, exit: 185.0, pnl: "+10.12%", pnlUsd: "+$304", date: "Apr 22", status: "Closed" },
];

export default function TradeHistory() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Trade History</h2>
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a2e] text-[#666677] text-xs">
              <th className="text-left p-3 font-medium">Pair</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-right p-3 font-medium">Entry</th>
              <th className="text-right p-3 font-medium">Exit</th>
              <th className="text-right p-3 font-medium">P&L</th>
              <th className="text-right p-3 font-medium">P&L ($)</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e40] transition-colors">
                <td className="p-3 font-semibold text-white">{t.pair}</td>
                <td className="p-3">
                  <span className={`text-xs font-bold ${t.action === "BUY" ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                    {t.action}
                  </span>
                </td>
                <td className="p-3 text-right text-[#aaaaaa]">${t.entry.toLocaleString()}</td>
                <td className="p-3 text-right text-[#aaaaaa]">${t.exit.toLocaleString()}</td>
                <td className={`p-3 text-right font-semibold ${t.pnl.startsWith("+") ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {t.pnl}
                </td>
                <td className={`p-3 text-right font-semibold ${t.pnlUsd.startsWith("+") ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {t.pnlUsd}
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 text-[10px] rounded-full ${t.status === "Open" ? "bg-[#ff880020] text-[#ff8800] border border-[#ff880040]" : "bg-[#ffffff08] text-[#666677] border border-[#333355]"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-3 text-right text-[#666677] text-xs">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-xs text-[#666677]">
        <span>Total trades: {trades.length}</span>
        <span>Win rate: <span className="text-[#00ff88]">87.5%</span></span>
        <span>Total P&L: <span className="text-[#00ff88]">+$1,822</span></span>
      </div>
    </div>
  );
}

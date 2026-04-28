"use client";

const metrics = [
  { label: "Total Return", value: "+38.4%", color: "#00ff88" },
  { label: "Sharpe Ratio", value: "2.14", color: "#00d4ff" },
  { label: "Max Drawdown", value: "-8.2%", color: "#ff4444" },
  { label: "Avg Trade Duration", value: "18h", color: "#7b2fff" },
  { label: "Profit Factor", value: "3.42", color: "#00ff88" },
  { label: "Avg Win", value: "+5.1%", color: "#00ff88" },
  { label: "Avg Loss", value: "-2.8%", color: "#ff4444" },
  { label: "Best Trade", value: "+12.4%", color: "#00ff88" },
];

const monthly = [
  { month: "Jan", pnl: 12.3 },
  { month: "Feb", pnl: 8.7 },
  { month: "Mar", pnl: -3.2 },
  { month: "Apr", pnl: 18.6 },
];

export default function PerformancePage() {
  const maxPnl = Math.max(...monthly.map((m) => Math.abs(m.pnl)));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Performance Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4">
            <p className="text-[10px] text-[#666677] mb-1">{m.label}</p>
            <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">Monthly Returns</h3>
        <div className="flex items-end gap-4 h-40">
          {monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <span className={`text-xs font-semibold ${m.pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                {m.pnl >= 0 ? "+" : ""}{m.pnl}%
              </span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${(Math.abs(m.pnl) / maxPnl) * 100}%`,
                  backgroundColor: m.pnl >= 0 ? "#00ff88" : "#ff4444",
                  opacity: 0.7,
                  minHeight: "8px",
                }}
              />
              <span className="text-[10px] text-[#666677]">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-3">Signal Accuracy by Dimension</h3>
        <div className="flex flex-col gap-2">
          {[
            { dim: "ETF Flow signals", accuracy: 91, color: "#00d4ff" },
            { dim: "Sentiment signals", accuracy: 84, color: "#7b2fff" },
            { dim: "Macro signals", accuracy: 79, color: "#00ff88" },
            { dim: "Momentum signals", accuracy: 76, color: "#ff8800" },
            { dim: "Treasury signals", accuracy: 88, color: "#ff4488" },
          ].map((d) => (
            <div key={d.dim} className="flex items-center gap-3">
              <span className="text-xs w-36 shrink-0 text-[#aaaaaa]">{d.dim}</span>
              <div className="flex-1 h-3 bg-[#1a1a2e] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${d.accuracy}%`, backgroundColor: d.color }} />
              </div>
              <span className="text-xs w-8 text-right font-semibold" style={{ color: d.color }}>{d.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

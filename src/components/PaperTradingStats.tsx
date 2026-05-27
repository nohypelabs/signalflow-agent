"use client";

import Card from "@/components/ui/Card";
import type { PaperStats, PaperBalance, PaperTrade } from "@/lib/hooks/usePaperTrading";

interface Props {
  stats: PaperStats;
  balance: PaperBalance;
  trades: PaperTrade[];
  onReset: () => void;
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function PaperTradingStats({ stats, balance, trades, onReset }: Props) {
  const pnlColor = stats.totalPnl >= 0 ? "#00ff88" : "#ff4444";
  const openTrades = trades.filter((t) => t.status === "OPEN");

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <h3 className="text-sm font-semibold text-txt-primary">Paper Trading</h3>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold">DEMO</span>
          </div>
          <button
            onClick={onReset}
            className="text-[9px] text-txt-faint hover:text-sell transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="px-4 py-3 bg-elevated/20 border-b border-border-default">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">Balance</p>
            <p className="text-base font-bold font-mono text-txt-primary">{fmtUSD(balance.total)}</p>
          </div>
          <div>
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">Available</p>
            <p className="text-sm font-mono text-txt-secondary">{fmtUSD(balance.available)}</p>
          </div>
          <div>
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">Total P&L</p>
            <p className={`text-sm font-bold font-mono ${stats.totalPnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}{fmtUSD(stats.totalPnl)}
              <span className="text-[9px] ml-1 opacity-70">
                ({stats.totalPnlPercent >= 0 ? "+" : ""}{stats.totalPnlPercent.toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 py-3 grid grid-cols-4 gap-2 border-b border-border-default">
        {[
          { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate > 55 ? "#00ff88" : stats.winRate > 45 ? "#ff8800" : "#ff4444" },
          { label: "Trades", value: `${stats.closedTrades}`, color: "var(--text-secondary)" },
          { label: "W / L", value: `${stats.winCount}/${stats.lossCount}`, color: "var(--text-secondary)" },
          { label: "Profit Factor", value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2), color: stats.profitFactor > 1.5 ? "#00ff88" : stats.profitFactor > 1 ? "#ff8800" : "#ff4444" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">{item.label}</p>
            <p className="text-xs font-bold font-mono mt-0.5" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Additional stats */}
      <div className="px-4 py-2 grid grid-cols-2 gap-2 border-b border-border-default">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Best Trade</span>
          <span className="text-[10px] font-mono text-[#00ff88]">+{fmtUSD(stats.bestTrade)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Worst Trade</span>
          <span className="text-[10px] font-mono text-[#ff4444]">{fmtUSD(stats.worstTrade)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Avg P&L</span>
          <span className={`text-[10px] font-mono ${stats.avgPnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
            {fmtUSD(stats.avgPnl)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Avg Hold</span>
          <span className="text-[10px] font-mono text-txt-secondary">{fmtTime(stats.avgHoldTime)}</span>
        </div>
      </div>

      {/* Open positions */}
      {openTrades.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[9px] text-txt-faint uppercase tracking-wider mb-2">Open Positions ({openTrades.length})</p>
          <div className="space-y-1.5">
            {openTrades.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={`font-bold ${t.side === "BUY" ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {t.side}
                </span>
                <span className="text-txt-primary">{t.pair}</span>
                <span className="text-txt-faint">@</span>
                <span className="text-txt-secondary">${t.entryPrice.toLocaleString()}</span>
                <span className="text-txt-faint">x{t.quantity}</span>
                {t.confidence > 0 && (
                  <span className="text-[8px] text-accent ml-auto">{t.confidence}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.totalTrades === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-txt-muted">No paper trades yet</p>
          <p className="text-[10px] text-txt-faint mt-1">Execute a trade to start paper trading</p>
        </div>
      )}
    </Card>
  );
}

"use client";

import Card from "@/components/ui/Card";
import type { PaperStats, PaperBalance, PaperTrade } from "@/lib/hooks/usePaperTrading";

interface Props {
  stats: PaperStats;
  balance: PaperBalance;
  trades: PaperTrade[];
  currentPrices?: Map<string, number>;
  onClose?: (tradeId: string, currentPrice: number) => void;
  onReset: () => void;
}

function fmtUSD(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${n < 0 ? "-" : ""}$${abs.toFixed(2)}`;
}

function fmtTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function fmtPrice(p: number): string {
  if (p >= 10000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

function PositionRow({ trade, currentPrice, onClose }: { trade: PaperTrade; currentPrice?: number; onClose?: (id: string, price: number) => void }) {
  const price = currentPrice ?? trade.entryPrice;
  const priceChange = trade.side === "LONG"
    ? price - trade.entryPrice
    : trade.entryPrice - price;
  const pnl = priceChange * trade.quantity;
  const pnlPct = (pnl / trade.margin) * 100;
  const isProfit = pnl >= 0;

  // Distance to liquidation
  const liqDist = trade.side === "LONG"
    ? ((price - trade.liquidationPrice) / price) * 100
    : ((trade.liquidationPrice - price) / price) * 100;

  // Distance to TP/SL
  const tpDist = trade.takeProfit > 0
    ? trade.side === "LONG"
      ? ((trade.takeProfit - price) / price) * 100
      : ((price - trade.takeProfit) / price) * 100
    : null;

  const slDist = trade.stopLoss > 0
    ? trade.side === "LONG"
      ? ((price - trade.stopLoss) / price) * 100
      : ((trade.stopLoss - price) / price) * 100
    : null;

  return (
    <div className="px-4 py-2.5 border-b border-border-default hover:bg-elevated/20 transition-colors">
      {/* Row 1: Side + Pair + Leverage + PnL */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            trade.side === "LONG"
              ? "bg-[#00ff88]/15 text-[#00ff88]"
              : "bg-[#ff4444]/15 text-[#ff4444]"
          }`}>
            {trade.side}
          </span>
          <span className="text-xs font-bold text-txt-primary">{trade.pair}</span>
          <span className="text-[9px] text-accent font-mono">{trade.leverage}x</span>
          {trade.tradingType && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-elevated text-txt-dim capitalize">
              {trade.tradingType}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className={`text-xs font-bold font-mono ${isProfit ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
            {isProfit ? "+" : ""}{fmtUSD(pnl)}
          </span>
          <span className={`text-[9px] font-mono ml-1 ${isProfit ? "text-[#00ff88]/70" : "text-[#ff4444]/70"}`}>
            ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Row 2: Entry + Current + Liq */}
      <div className="flex items-center gap-3 text-[9px] font-mono text-txt-faint mb-1.5">
        <span>Entry <span className="text-txt-secondary">${fmtPrice(trade.entryPrice)}</span></span>
        <span>Size <span className="text-txt-secondary">{trade.quantity.toFixed(4)}</span></span>
        <span>Margin <span className="text-txt-secondary">${trade.margin.toFixed(0)}</span></span>
        <span>Notional <span className="text-txt-secondary">${(trade.notional).toFixed(0)}</span></span>
      </div>

      {/* Row 3: TP/SL/Liq bars */}
      <div className="flex items-center gap-2 text-[8px]">
        {slDist !== null && (
          <span className={`px-1.5 py-0.5 rounded ${slDist < 5 ? "bg-[#ff4444]/20 text-[#ff4444]" : "text-txt-faint"}`}>
            SL {slDist.toFixed(1)}% → ${fmtPrice(trade.stopLoss)}
          </span>
        )}
        <span className={`px-1.5 py-0.5 rounded ${liqDist < 10 ? "bg-[#ff4444]/30 text-[#ff4444] font-bold" : "text-txt-faint"}`}>
          LIQ {liqDist.toFixed(1)}% → ${fmtPrice(trade.liquidationPrice)}
        </span>
        {tpDist !== null && (
          <span className="px-1.5 py-0.5 rounded text-txt-faint">
            TP {tpDist.toFixed(1)}% → ${fmtPrice(trade.takeProfit)}
          </span>
        )}
        {onClose && currentPrice && (
          <button
            onClick={() => onClose(trade.id, currentPrice)}
            className="ml-auto text-[9px] text-sell hover:text-sell/80 font-semibold cursor-pointer"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default function PaperTradingStats({ stats, balance, trades, currentPrices, onClose, onReset }: Props) {
  const openTrades = trades.filter((t) => t.status === "OPEN");

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <h3 className="text-sm font-semibold text-txt-primary">Paper Futures</h3>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold">DEMO</span>
          </div>
          <button onClick={onReset} className="text-[9px] text-txt-faint hover:text-sell transition-colors cursor-pointer">
            Reset
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="px-4 py-3 bg-elevated/20 border-b border-border-default">
        <div className="grid grid-cols-4 gap-2">
          <div>
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">Balance</p>
            <p className="text-sm font-bold font-mono text-txt-primary">{fmtUSD(balance.total)}</p>
          </div>
          <div>
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">Available</p>
            <p className="text-xs font-mono text-txt-secondary">{fmtUSD(balance.available)}</p>
          </div>
          <div>
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">Margin</p>
            <p className="text-xs font-mono text-[#ff8800]">{fmtUSD(balance.marginUsed)}</p>
          </div>
          <div>
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">Total P&L</p>
            <p className={`text-sm font-bold font-mono ${stats.totalPnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}{fmtUSD(stats.totalPnl)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-4 gap-2 border-b border-border-default">
        {[
          { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate > 55 ? "#00ff88" : stats.winRate > 45 ? "#ff8800" : "#ff4444" },
          { label: "Trades", value: `${stats.closedTrades}`, color: "var(--text-secondary)" },
          { label: "L/S", value: `${stats.longCount}/${stats.shortCount}`, color: "var(--text-secondary)" },
          { label: "Avg Lev", value: `${stats.avgLeverage.toFixed(1)}x`, color: "var(--text-secondary)" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[8px] text-txt-faint uppercase tracking-wider">{item.label}</p>
            <p className="text-xs font-bold font-mono mt-0.5" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* More stats */}
      <div className="px-4 py-2 grid grid-cols-2 gap-2 border-b border-border-default">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Profit Factor</span>
          <span className={`text-[10px] font-mono ${stats.profitFactor > 1.5 ? "text-[#00ff88]" : stats.profitFactor > 1 ? "text-[#ff8800]" : "text-[#ff4444]"}`}>
            {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Liquidations</span>
          <span className={`text-[10px] font-mono ${stats.liqCount > 0 ? "text-[#ff4444]" : "text-txt-secondary"}`}>
            {stats.liqCount}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Best Trade</span>
          <span className="text-[10px] font-mono text-[#00ff88]">+{fmtUSD(stats.bestTrade)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint">Worst Trade</span>
          <span className="text-[10px] font-mono text-[#ff4444]">{fmtUSD(stats.worstTrade)}</span>
        </div>
      </div>

      {/* Per-Type Breakdown */}
      {stats.perType && Object.keys(stats.perType).length > 0 && (
        <div className="px-4 py-3 border-b border-border-default">
          <p className="text-[9px] text-txt-faint uppercase tracking-wider mb-2">By Trading Type</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.perType).map(([type, typeStats]) => {
              const icons: Record<string, string> = { scalping: "⚡", intraday: "📊", swing: "📈", position: "🏦" };
              const colors: Record<string, string> = { scalping: "#F59E0B", intraday: "#3B82F6", swing: "#10B981", position: "#8B5CF6" };
              return (
                <div key={type} className="flex items-center gap-2 p-2 rounded-lg bg-elevated/20">
                  <span className="text-sm">{icons[type] ?? "📊"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold capitalize" style={{ color: colors[type] }}>{type}</span>
                      <span className="text-[8px] text-txt-faint">{typeStats.trades} trades</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono" style={{ color: typeStats.winRate >= 55 ? "#00ff88" : typeStats.winRate >= 45 ? "#ff8800" : "#ff4444" }}>
                        {typeStats.winRate}% WR
                      </span>
                      <span className={`text-[9px] font-mono ${typeStats.totalPnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                        {typeStats.totalPnl >= 0 ? "+" : ""}{fmtUSD(typeStats.totalPnl)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open positions */}
      {openTrades.length > 0 && (
        <div>
          <div className="px-4 py-2 border-b border-border-default">
            <p className="text-[9px] text-txt-faint uppercase tracking-wider">
              Open Positions ({openTrades.length}) · Margin: {fmtUSD(balance.marginUsed)}
            </p>
          </div>
          {openTrades.map((t) => {
            const base = t.pair.split("/")[0];
            const price = currentPrices?.get(base) ?? currentPrices?.get(t.pair);
            return <PositionRow key={t.id} trade={t} currentPrice={price} onClose={onClose} />;
          })}
        </div>
      )}

      {/* Empty state */}
      {stats.totalTrades === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-txt-muted">No paper trades yet</p>
          <p className="text-[10px] text-txt-faint mt-1">Open a LONG or SHORT position to start</p>
        </div>
      )}
    </Card>
  );
}

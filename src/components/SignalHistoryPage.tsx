"use client";

import { useState, useEffect, useMemo } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/ui/PageHeader";

interface SignalRecord {
  id: string;
  pair: string;
  action: "LONG" | "SHORT" | "HOLD";
  confidence: number;
  price: number;
  change24h: number;
  reasoning: string;
  timestamp: number;
  outcome?: "win" | "loss" | "pending";
  entryPrice?: number;
  exitPrice?: number;
  pnlPercent?: number;
}

interface BacktestStats {
  totalSignals: number;
  winRate: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number;
  profitFactor: number;
}

function fmtPrice(p: number): string {
  if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 100) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

function fmtTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function BacktestPanel({ stats }: { stats: BacktestStats }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default">
        <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Backtest Performance</h3>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate > 55 ? "#00ff88" : stats.winRate > 45 ? "#ff8800" : "#ff4444" },
          { label: "Avg PnL", value: `${stats.avgPnl > 0 ? "+" : ""}${stats.avgPnl.toFixed(2)}%`, color: stats.avgPnl > 0 ? "#00ff88" : "#ff4444" },
          { label: "Sharpe", value: stats.sharpeRatio.toFixed(2), color: stats.sharpeRatio > 1 ? "#00ff88" : stats.sharpeRatio > 0.5 ? "#ff8800" : "#ff4444" },
          { label: "Profit Factor", value: stats.profitFactor.toFixed(2), color: stats.profitFactor > 1.5 ? "#00ff88" : stats.profitFactor > 1 ? "#ff8800" : "#ff4444" },
        ].map((item) => (
          <div key={item.label} className="bg-elevated/30 rounded-lg p-3 text-center">
            <p className="text-[9px] text-txt-faint uppercase tracking-wider">{item.label}</p>
            <p className="text-lg font-bold font-mono mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        {[
          { label: "Total Signals", value: stats.totalSignals.toString() },
          { label: "Best Trade", value: `+${stats.bestTrade.toFixed(1)}%`, color: "#00ff88" },
          { label: "Worst Trade", value: `${stats.worstTrade.toFixed(1)}%`, color: "#ff4444" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between px-2 py-1.5 bg-elevated/20 rounded">
            <span className="text-[9px] text-txt-faint">{item.label}</span>
            <span className="text-[10px] font-mono font-semibold" style={{ color: item.color ?? "var(--text-secondary)" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SignalRow({ signal }: { signal: SignalRecord }) {
  const actionColor = signal.action === "LONG" ? "#00ff88" : signal.action === "SHORT" ? "#ff4444" : "#ff8800";
  const outcomeColor = signal.outcome === "win" ? "#00ff88" : signal.outcome === "loss" ? "#ff4444" : "#64748b";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/20 transition-colors">
      {/* Action badge */}
      <span
        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded min-w-[40px] text-center"
        style={{ backgroundColor: `${actionColor}15`, color: actionColor, border: `1px solid ${actionColor}30` }}
      >
        {signal.action}
      </span>

      {/* Pair + price */}
      <div className="min-w-[80px]">
        <p className="text-xs font-semibold text-txt-primary">{signal.pair}</p>
        <p className="text-[10px] text-txt-muted font-mono">{fmtPrice(signal.price)}</p>
      </div>

      {/* Confidence */}
      <div className="min-w-[50px]">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${signal.confidence}%`,
                backgroundColor: signal.confidence > 80 ? "#00d4ff" : signal.confidence > 60 ? "#00ff88" : signal.confidence > 40 ? "#ff8800" : "#64748b",
              }}
            />
          </div>
          <span className="text-[9px] font-mono text-txt-muted w-6 text-right">{signal.confidence}</span>
        </div>
      </div>

      {/* PnL */}
      <div className="min-w-[60px] text-right">
        {signal.pnlPercent !== undefined ? (
          <span className={`text-[10px] font-mono font-semibold ${signal.pnlPercent >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
            {signal.pnlPercent >= 0 ? "+" : ""}{signal.pnlPercent.toFixed(2)}%
          </span>
        ) : (
          <span className="text-[10px] text-txt-faint">—</span>
        )}
      </div>

      {/* Outcome */}
      <div className="min-w-[50px]">
        <span
          className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${outcomeColor}15`, color: outcomeColor }}
        >
          {signal.outcome ?? "pending"}
        </span>
      </div>

      {/* Time */}
      <span className="text-[9px] text-txt-faint ml-auto">{fmtTimeAgo(signal.timestamp)}</span>
    </div>
  );
}

export default function SignalHistoryPage() {
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "LONG" | "SHORT" | "HOLD">("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "win" | "loss" | "pending">("all");

  useEffect(() => {
    // Generate mock signal history from current signals
    async function fetchHistory() {
      try {
        const res = await fetch("/api/signals");
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Convert current signals to history format + generate synthetic history
        const currentSignals: SignalRecord[] = (data.signals ?? []).map((s: SignalRecord) => ({
          ...s,
          timestamp: Date.now() - Math.random() * 3600000,
          outcome: "pending" as const,
        }));

        // Generate synthetic historical signals for backtest demo
        const historicalSignals: SignalRecord[] = [];
        const pairs = ["BTC/USDC", "ETH/USDC", "SOL/USDC"];
        const actions = ["LONG", "SHORT", "HOLD"] as const;
        const outcomes = ["win", "loss"] as const;

        for (let i = 0; i < 50; i++) {
          const pair = pairs[Math.floor(Math.random() * pairs.length)];
          const action = actions[Math.floor(Math.random() * 3)];
          const confidence = 40 + Math.floor(Math.random() * 55);
          const basePrice = pair.startsWith("BTC") ? 105000 : pair.startsWith("ETH") ? 2500 : 165;
          const outcome = outcomes[Math.floor(Math.random() * 2)];
          const pnl = outcome === "win" ? Math.random() * 8 + 0.5 : -(Math.random() * 5 + 0.5);

          historicalSignals.push({
            id: `hist-${i}`,
            pair,
            action,
            confidence,
            price: basePrice * (0.95 + Math.random() * 0.1),
            change24h: (Math.random() - 0.5) * 10,
            reasoning: `Historical signal #${i + 1}`,
            timestamp: Date.now() - (i + 1) * 3600000 * (1 + Math.random() * 4),
            outcome,
            pnlPercent: parseFloat(pnl.toFixed(2)),
          });
        }

        setSignals([...currentSignals, ...historicalSignals]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load signal history");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  // Compute backtest stats
  const backtestStats = useMemo<BacktestStats>(() => {
    const completed = signals.filter((s) => s.outcome === "win" || s.outcome === "loss");
    const wins = completed.filter((s) => s.outcome === "win");
    const losses = completed.filter((s) => s.outcome === "loss");
    const pnls = completed.map((s) => s.pnlPercent ?? 0);

    const avgPnl = pnls.length > 0 ? pnls.reduce((s, p) => s + p, 0) / pnls.length : 0;
    const variance = pnls.length > 1
      ? pnls.reduce((s, p) => s + (p - avgPnl) ** 2, 0) / (pnls.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);

    const grossProfit = wins.reduce((s, w) => s + (w.pnlPercent ?? 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, l) => s + (l.pnlPercent ?? 0), 0));

    return {
      totalSignals: signals.length,
      winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
      avgPnl,
      bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
      worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
      sharpeRatio: stdDev > 0 ? avgPnl / stdDev : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    };
  }, [signals]);

  // Filter signals
  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (filter !== "all" && s.action !== filter) return false;
      if (outcomeFilter !== "all" && s.outcome !== outcomeFilter) return false;
      return true;
    });
  }, [signals, filter, outcomeFilter]);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Signal History" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Signal History" />
        <Card padding="sm"><p className="text-xs text-sell">{error}</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Signal History"
      />

      {/* Backtest Panel */}
      <BacktestPanel stats={backtestStats} />

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-txt-faint uppercase tracking-wider">Signal:</span>
            {(["all", "LONG", "SHORT", "HOLD"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${
                  filter === f
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "text-txt-muted hover:text-txt-secondary"
                }`}
              >
                {f === "all" ? "All" : f === "HOLD" ? "NO TRADE" : f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-txt-faint uppercase tracking-wider">Outcome:</span>
            {(["all", "win", "loss", "pending"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setOutcomeFilter(f)}
                className={`text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${
                  outcomeFilter === f
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "text-txt-muted hover:text-txt-secondary"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Signal List */}
      <Card padding="none" className="overflow-hidden">
        <div className="hidden md:flex px-4 py-2.5 border-b border-border-default items-center gap-3">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider min-w-[40px]">Type</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider min-w-[80px]">Pair</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider min-w-[50px]">Confidence</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider min-w-[60px] text-right">PnL</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider min-w-[50px]">Status</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider ml-auto">Time</span>
        </div>
        <div className="divide-y divide-border-default max-h-[500px] overflow-y-auto">
          <div className="md:hidden">
            {filteredSignals.slice(0, 50).map((s) => (
              <div key={s.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      s.action === "LONG" ? "bg-[#00ff88]/15 text-[#00ff88]" : s.action === "SHORT" ? "bg-[#ff4444]/15 text-[#ff4444]" : "bg-[#ff8800]/15 text-[#ff8800]"
                    }`}>{s.action}</span>
                    <span className="text-xs font-semibold text-txt-primary">{s.pair}</span>
                  </div>
                  <span className="text-[9px] text-txt-faint">{fmtTimeAgo(s.timestamp)}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px]">
                  <div><span className="text-txt-faint">Conf</span><p className="font-mono text-txt-secondary">{s.confidence}%</p></div>
                  <div><span className="text-txt-faint">Price</span><p className="font-mono text-txt-secondary">{fmtPrice(s.price)}</p></div>
                  <div><span className="text-txt-faint">PnL</span><p className={`font-mono ${(s.pnlPercent ?? 0) >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>{s.pnlPercent !== undefined ? `${s.pnlPercent >= 0 ? "+" : ""}${s.pnlPercent.toFixed(2)}%` : "—"}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            {filteredSignals.slice(0, 50).map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </div>
        </div>
        {filteredSignals.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-txt-muted">No signals match the selected filters</p>
          </div>
        )}
      </Card>
    </div>
  );
}

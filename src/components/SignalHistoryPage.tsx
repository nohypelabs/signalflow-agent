"use client";

import { useState, useEffect, useMemo } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/ui/PageHeader";
import { parseApiResponse } from "@/lib/api/client";

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

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
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

function SignalRow({ signal }: { signal: SignalRecord }) {
  const actionColor = signal.action === "LONG" ? "#00ff88" : signal.action === "SHORT" ? "#ff4444" : "#ff8800";
  const outcomeColor = signal.outcome === "win" ? "#00ff88" : signal.outcome === "loss" ? "#ff4444" : "#64748b";
  const borderHoverClass = signal.action === "LONG" ? "hover:border-l-[#00ff88]" : signal.action === "SHORT" ? "hover:border-l-[#ff4444]" : "hover:border-l-[#ff8800]";

  return (
    <div className={`hidden md:grid grid-cols-[55px_95px_125px_75px_75px_1fr] items-center gap-4 px-4 py-2.5 border-b border-border-default/30 border-l-2 border-l-transparent hover:bg-elevated/20 transition-all duration-150 cursor-default ${borderHoverClass}`}>
      {/* Action badge */}
      <span
        className="rounded px-1.5 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider border"
        style={{ backgroundColor: `${actionColor}15`, color: actionColor, borderColor: `${actionColor}30` }}
      >
        {signal.action}
      </span>

      {/* Pair + price */}
      <div className="border-r border-border-default/20 pr-3">
        <p className="text-xs font-semibold text-txt-primary">{signal.pair}</p>
        <p className="text-[10px] text-txt-muted font-mono">{fmtPrice(signal.price)}</p>
      </div>

      {/* Confidence */}
      <div className="border-r border-border-default/20 pr-3">
        <div className="flex items-center gap-1.5">
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
      <div className="text-right border-r border-border-default/20 pr-3">
        {signal.pnlPercent !== undefined ? (
          <span className={`text-[10px] font-mono font-semibold ${signal.pnlPercent >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
            {signal.pnlPercent >= 0 ? "+" : ""}{signal.pnlPercent.toFixed(2)}%
          </span>
        ) : (
          <span className="text-[10px] text-txt-faint">—</span>
        )}
      </div>

      {/* Outcome */}
      <div className="pl-2 border-r border-border-default/20 pr-3">
        <span
          className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${outcomeColor}15`, color: outcomeColor }}
        >
          {signal.outcome ?? "pending"}
        </span>
      </div>

      {/* Time */}
      <span className="text-[9px] text-txt-faint text-right">{fmtTimeAgo(signal.timestamp)}</span>
    </div>
  );
}

function SignalHistoryHero({
  stats,
  visibleCount,
  filter,
  setFilter,
  outcomeFilter,
  setOutcomeFilter,
}: {
  stats: BacktestStats;
  visibleCount: number;
  filter: "all" | "LONG" | "SHORT" | "HOLD";
  setFilter: (value: "all" | "LONG" | "SHORT" | "HOLD") => void;
  outcomeFilter: "all" | "win" | "loss" | "pending";
  setOutcomeFilter: (value: "all" | "win" | "loss" | "pending") => void;
}) {
  const winTone = stats.winRate >= 55 ? "text-buy" : stats.winRate >= 45 ? "text-hold" : "text-sell";
  const pnlTone = stats.avgPnl >= 0 ? "text-buy" : "text-sell";

  return (
    <section data-tour="history-hero" className="neu-card p-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-secondary">Signal History</p>
          <div className="mt-1 flex items-end gap-3">
            <div className={cx("font-mono text-5xl font-bold leading-none tracking-tight", winTone)}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="pb-1">
              <div className="text-sm font-semibold text-txt-primary">resolved win rate</div>
              <div className="text-[11px] text-txt-tertiary">
                {visibleCount} visible / {stats.totalSignals} total signals
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: "Avg PnL", value: `${stats.avgPnl >= 0 ? "+" : ""}${stats.avgPnl.toFixed(2)}%`, tone: pnlTone },
            { label: "Profit Factor", value: stats.profitFactor == null ? "—" : stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2), tone: "text-info" },
            { label: "Sharpe", value: stats.sharpeRatio.toFixed(2), tone: stats.sharpeRatio >= 1 ? "text-buy" : "text-txt-primary" },
            { label: "Best / Worst", value: `+${stats.bestTrade.toFixed(1)} / ${stats.worstTrade.toFixed(1)}%`, tone: "text-txt-primary" },
          ].map((item) => (
            <div key={item.label} className="neu-card rounded-xl p-3 hover:bg-elevated/20 hover:shadow-md transition-all duration-200 cursor-default text-center">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-txt-faint">{item.label}</div>
              <div className={cx("mt-1 font-mono text-sm font-bold", item.tone)}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div data-tour="history-filters" className="mt-4 flex flex-col gap-3 border-t border-border-default pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider mr-1">Signal</span>
          {(["all", "LONG", "SHORT", "HOLD"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded px-2.5 py-1 text-[10px] transition-all border ${
                filter === f
                  ? "border-accent/40 bg-accent/12 text-accent font-semibold shadow-sm"
                  : "border-transparent text-txt-muted hover:text-txt-secondary hover:bg-elevated/45"
              }`}
            >
              {f === "all" ? "All" : f === "HOLD" ? "NO TRADE" : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider mr-1">Outcome</span>
          {(["all", "win", "loss", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setOutcomeFilter(f)}
              className={`cursor-pointer rounded px-2.5 py-1 text-[10px] capitalize transition-all border ${
                outcomeFilter === f
                  ? "border-accent/40 bg-accent/12 text-accent font-semibold shadow-sm"
                  : "border-transparent text-txt-muted hover:text-txt-secondary hover:bg-elevated/45"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </section>
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
        const data = await parseApiResponse<{ signals?: SignalRecord[] }>(res);

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
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <Card padding="sm"><p className="text-xs text-sell">{error}</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SignalHistoryHero
        stats={backtestStats}
        visibleCount={filteredSignals.length}
        filter={filter}
        setFilter={setFilter}
        outcomeFilter={outcomeFilter}
        setOutcomeFilter={setOutcomeFilter}
      />

      {/* Signal List */}
      <div data-tour="history-list"><Card padding="none" className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[55px_95px_125px_75px_75px_1fr] px-4 py-2 bg-elevated/10 border-b border-border-default items-center gap-4 text-txt-secondary font-semibold">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider">Type</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider">Pair</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider">Confidence</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider text-right">PnL</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider pl-2">Status</span>
          <span className="text-[9px] text-txt-faint uppercase tracking-wider text-right">Time</span>
        </div>
        <div className="divide-y divide-border-default max-h-[500px] overflow-y-auto">
          <div className="md:hidden">
            {filteredSignals.slice(0, 50).map((s) => (
              <div key={s.id} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      s.action === "LONG" ? "bg-[#00ff88]/15 text-[#00ff88]" : s.action === "SHORT" ? "bg-[#ff4444]/15 text-[#ff4444]" : "bg-[#ff8800]/15 text-[#ff8800]"
                    }`}>{s.action}</span>
                    <span className="text-xs font-semibold text-txt-primary">{s.pair}</span>
                  </div>
                  <span className="text-[9px] text-txt-faint">{fmtTimeAgo(s.timestamp)}</span>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1.5 text-[10px]">
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
      </Card></div>
    </div>
  );
}

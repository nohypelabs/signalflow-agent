"use client";

import { useState, useMemo, useCallback } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { PaperTrade, PaperStats, PaperBalance } from "@/lib/hooks/usePaperTrading";
import type { Signal } from "@/lib/types/signal";
import { TRADING_TYPES, TRADING_TYPE_LIST } from "@/lib/types/trading-type";
import type { TradingType } from "@/lib/types/trading-type";
import TradingTypeIcon from "@/components/TradingTypeIcon";

interface Props {
  trades: PaperTrade[];
  stats: PaperStats;
  balance: PaperBalance;
  currentPrices?: Map<string, number>;
  onClose?: (tradeId: string, currentPrice: number) => void;
  onReset: () => void;
  signals?: Signal[];
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

export default function PortfolioPage({ trades, stats, balance, currentPrices, onClose, onReset, signals }: Props) {
  const [activeTab, setActiveTab] = useState<"positions" | "history" | "types">("positions");
  const [typeFilter, setTypeFilter] = useState<TradingType | "ALL">("ALL");
  const [sortField, setSortField] = useState<"date" | "pnl" | "pair" | "hold">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pairSearch, setPairSearch] = useState("");

  const openTrades = useMemo(() => trades.filter((t) => t.status === "OPEN"), [trades]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status !== "OPEN"), [trades]);

  // Signal lookup map for cross-reference
  const signalMap = useMemo(() => {
    if (!signals) return new Map<string, Signal>();
    const map = new Map<string, Signal>();
    for (const s of signals) map.set(s.id, s);
    return map;
  }, [signals]);

  // Signal performance summary
  const signalPerf = useMemo(() => {
    const withSignal = closedTrades.filter((t) => t.signalId);
    const withoutSignal = closedTrades.filter((t) => !t.signalId);
    const signalWins = withSignal.filter((t) => (t.pnl ?? 0) > 0);
    const signalLosses = withSignal.filter((t) => (t.pnl ?? 0) <= 0);
    const avgWinConf = signalWins.length > 0
      ? signalWins.reduce((s, t) => s + t.confidence, 0) / signalWins.length
      : 0;
    const avgLossConf = signalLosses.length > 0
      ? signalLosses.reduce((s, t) => s + t.confidence, 0) / signalLosses.length
      : 0;

    // By signal action
    const longTrades = withSignal.filter((t) => t.side === "LONG");
    const shortTrades = withSignal.filter((t) => t.side === "SHORT");
    const longWinRate = longTrades.length > 0
      ? (longTrades.filter((t) => (t.pnl ?? 0) > 0).length / longTrades.length) * 100
      : 0;
    const shortWinRate = shortTrades.length > 0
      ? (shortTrades.filter((t) => (t.pnl ?? 0) > 0).length / shortTrades.length) * 100
      : 0;

    return {
      total: withSignal.length,
      manual: withoutSignal.length,
      winRate: withSignal.length > 0 ? (signalWins.length / withSignal.length) * 100 : 0,
      avgWinConf: parseFloat(avgWinConf.toFixed(1)),
      avgLossConf: parseFloat(avgLossConf.toFixed(1)),
      longTrades: longTrades.length,
      shortTrades: shortTrades.length,
      longWinRate: parseFloat(longWinRate.toFixed(1)),
      shortWinRate: parseFloat(shortWinRate.toFixed(1)),
      signalPnl: withSignal.reduce((s, t) => s + (t.pnl ?? 0), 0),
      manualPnl: withoutSignal.reduce((s, t) => s + (t.pnl ?? 0), 0),
    };
  }, [closedTrades]);

  // Filter by type + pair search + sorting
  const filteredClosed = useMemo(() => {
    let result = closedTrades;

    // Type filter
    if (typeFilter !== "ALL") {
      result = result.filter((t) => t.tradingType === typeFilter);
    }

    // Pair search
    if (pairSearch.trim()) {
      const q = pairSearch.toUpperCase().trim();
      result = result.filter((t) => t.pair.toUpperCase().includes(q));
    }

    // Sorting
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = (a.closedAt ?? 0) - (b.closedAt ?? 0);
          break;
        case "pnl":
          cmp = (a.pnl ?? 0) - (b.pnl ?? 0);
          break;
        case "pair":
          cmp = a.pair.localeCompare(b.pair);
          break;
        case "hold":
          const holdA = (a.closedAt ?? 0) - a.openedAt;
          const holdB = (b.closedAt ?? 0) - b.openedAt;
          cmp = holdA - holdB;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [closedTrades, typeFilter, pairSearch, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Export helpers
  const exportCSV = useCallback(() => {
    const rows = filteredClosed.map((t) => ({
      Pair: t.pair,
      Side: t.side,
      Type: t.tradingType ?? "",
      Leverage: t.leverage,
      Entry: t.entryPrice,
      Exit: t.exitPrice ?? 0,
      PnL: t.pnl ?? 0,
      PnLPercent: t.pnlPercent ?? 0,
      Status: t.status,
      Confidence: t.confidence,
      SignalId: t.signalId ?? "",
      OpenedAt: new Date(t.openedAt).toISOString(),
      ClosedAt: t.closedAt ? new Date(t.closedAt).toISOString() : "",
      HoldMinutes: Math.round(((t.closedAt ?? Date.now()) - t.openedAt) / 60000),
    }));
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => String(r[h as keyof typeof r])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signalflow-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredClosed]);

  const exportJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      stats: {
        totalTrades: stats.totalTrades,
        winRate: stats.winRate,
        totalPnl: stats.totalPnl,
        profitFactor: stats.profitFactor,
      },
      trades: filteredClosed.map((t) => ({
        pair: t.pair,
        side: t.side,
        tradingType: t.tradingType,
        leverage: t.leverage,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        pnl: t.pnl,
        pnlPercent: t.pnlPercent,
        status: t.status,
        confidence: t.confidence,
        signalId: t.signalId,
        openedAt: t.openedAt,
        closedAt: t.closedAt,
        holdMinutes: Math.round(((t.closedAt ?? Date.now()) - t.openedAt) / 60000),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signalflow-trades-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredClosed, stats]);

  // Equity curve from closed trades
  const equityCurve = useMemo(() => {
    const points: { x: number; y: number; label: string }[] = [];
    let equity = balance.initialBalance;
    points.push({ x: 0, y: equity, label: "Start" });
    const sorted = [...closedTrades].sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0));
    sorted.forEach((t, i) => {
      equity += t.pnl ?? 0;
      points.push({ x: i + 1, y: equity, label: `${t.pair} ${t.side}` });
    });
    return points;
  }, [closedTrades, balance.initialBalance]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Paper Portfolio</h2>
          <p className="text-xs text-txt-muted mt-0.5">Track your paper futures trading performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">DEMO</Badge>
          <button onClick={onReset} className="text-[9px] text-txt-faint hover:text-sell transition-colors cursor-pointer">
            Reset All
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BalanceCard label="Total Balance" value={fmtUSD(balance.total)} color={balance.total >= balance.initialBalance ? "#00E5A8" : "#EF4444"} />
        <BalanceCard label="Available" value={fmtUSD(balance.available)} color="#3B82F6" />
        <BalanceCard label="Margin Used" value={fmtUSD(balance.marginUsed)} color="#F59E0B" />
        <BalanceCard label="Total P&L" value={`${stats.totalPnl >= 0 ? "+" : ""}${fmtUSD(stats.totalPnl)}`} color={stats.totalPnl >= 0 ? "#00E5A8" : "#EF4444"} sub={`${stats.totalPnlPercent >= 0 ? "+" : ""}${stats.totalPnlPercent.toFixed(2)}%`} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 55 ? "#00E5A8" : stats.winRate >= 45 ? "#F59E0B" : "#EF4444"} />
        <MetricCard label="Trades" value={`${stats.totalTrades}`} color="#94A3B8" />
        <MetricCard label="Profit Factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} color={stats.profitFactor >= 1.5 ? "#00E5A8" : stats.profitFactor >= 1 ? "#F59E0B" : "#EF4444"} />
        <MetricCard label="Avg Leverage" value={`${stats.avgLeverage.toFixed(1)}x`} color="#94A3B8" />
        <MetricCard label="Best Trade" value={`+${fmtUSD(stats.bestTrade)}`} color="#00E5A8" />
        <MetricCard label="Worst Trade" value={fmtUSD(stats.worstTrade)} color="#EF4444" />
      </div>

      {/* Per-Type Breakdown */}
      {stats.perType && Object.keys(stats.perType).length > 0 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Performance by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TRADING_TYPE_LIST.map((type) => {
              const ts = stats.perType?.[type.id];
              if (!ts) return null;
              return (
                <div key={type.id} className="p-3 rounded-xl border bg-inset/20" style={{ borderColor: `${type.color}25` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded bg-elevated/30 border border-border-default flex items-center justify-center text-txt-secondary">
                      <TradingTypeIcon type={type.id} size={11} />
                    </span>
                    <span className="text-xs font-bold" style={{ color: type.color }}>{type.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[9px] text-txt-dim">Trades</span>
                      <span className="text-[10px] font-mono text-txt-secondary">{ts.trades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] text-txt-dim">Win Rate</span>
                      <span className="text-[10px] font-mono" style={{ color: ts.winRate >= 55 ? "#00E5A8" : ts.winRate >= 45 ? "#F59E0B" : "#EF4444" }}>{ts.winRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] text-txt-dim">P&L</span>
                      <span className={`text-[10px] font-mono ${ts.totalPnl >= 0 ? "text-[#00E5A8]" : "text-[#EF4444]"}`}>
                        {ts.totalPnl >= 0 ? "+" : ""}{fmtUSD(ts.totalPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] text-txt-dim">Avg Lev</span>
                      <span className="text-[10px] font-mono text-txt-secondary">{ts.avgLeverage}x</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Equity Curve */}
      {equityCurve.length > 2 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Equity Curve</h3>
          <EquityCurveSVG points={equityCurve} />
        </Card>
      )}

      {/* Signal Performance Summary */}
      {closedTrades.length > 0 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Signal Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-inset/30 border border-border-default text-center">
              <p className="text-[8px] text-txt-faint uppercase tracking-wider">Signal Trades</p>
              <p className="text-sm font-bold font-mono mt-0.5 text-accent">{signalPerf.total}</p>
              <p className="text-[9px] text-txt-dim">{signalPerf.manual} manual</p>
            </div>
            <div className="p-2.5 rounded-lg bg-inset/30 border border-border-default text-center">
              <p className="text-[8px] text-txt-faint uppercase tracking-wider">Signal Win Rate</p>
              <p className="text-sm font-bold font-mono mt-0.5" style={{ color: signalPerf.winRate >= 55 ? "#00E5A8" : signalPerf.winRate >= 45 ? "#F59E0B" : "#EF4444" }}>
                {signalPerf.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-inset/30 border border-border-default text-center">
              <p className="text-[8px] text-txt-faint uppercase tracking-wider">Avg Win Conf</p>
              <p className="text-sm font-bold font-mono mt-0.5 text-[#00E5A8]">{signalPerf.avgWinConf}%</p>
              <p className="text-[9px] text-txt-dim">Loss: {signalPerf.avgLossConf}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-inset/30 border border-border-default text-center">
              <p className="text-[8px] text-txt-faint uppercase tracking-wider">Signal P&L</p>
              <p className="text-sm font-bold font-mono mt-0.5" style={{ color: signalPerf.signalPnl >= 0 ? "#00E5A8" : "#EF4444" }}>
                {signalPerf.signalPnl >= 0 ? "+" : ""}{fmtUSD(signalPerf.signalPnl)}
              </p>
              <p className="text-[9px] text-txt-dim">Manual: {signalPerf.manualPnl >= 0 ? "+" : ""}{fmtUSD(signalPerf.manualPnl)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#00ff88] font-bold">LONG</span>
              <span className="text-txt-secondary">{signalPerf.longTrades} trades</span>
              <span className="font-mono" style={{ color: signalPerf.longWinRate >= 55 ? "#00E5A8" : "#F59E0B" }}>{signalPerf.longWinRate}% WR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#ff4444] font-bold">SHORT</span>
              <span className="text-txt-secondary">{signalPerf.shortTrades} trades</span>
              <span className="font-mono" style={{ color: signalPerf.shortWinRate >= 55 ? "#00E5A8" : "#F59E0B" }}>{signalPerf.shortWinRate}% WR</span>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-inset rounded-lg p-0.5 w-fit">
        {(["positions", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs rounded transition-colors cursor-pointer capitalize ${
              activeTab === tab ? "bg-elevated text-txt-primary font-semibold border border-border-muted" : "text-txt-dim hover:text-txt-secondary"
            }`}
          >
            {tab === "positions" ? `Open Positions (${openTrades.length})` : `History (${closedTrades.length})`}
          </button>
        ))}
      </div>

      {/* Type filter + pair search + sort for history */}
      {activeTab === "history" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-txt-dim uppercase tracking-wider">Type:</span>
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${typeFilter === "ALL" ? "bg-elevated text-txt-primary border border-border-muted" : "text-txt-dim hover:text-txt-secondary"}`}
            >
              All
            </button>
            {TRADING_TYPE_LIST.map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${typeFilter === t.id ? "font-semibold bg-elevated text-txt-primary border border-border-muted" : "text-txt-dim hover:text-txt-secondary"}`}
                style={typeFilter === t.id ? { backgroundColor: `${t.color}15`, color: t.color } : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  <TradingTypeIcon type={t.id} size={11} />
                  {t.label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-txt-dim uppercase tracking-wider">Pair:</span>
              <input
                type="text"
                value={pairSearch}
                onChange={(e) => setPairSearch(e.target.value)}
                placeholder="BTC, ETH..."
                className="bg-inset border border-border-default rounded px-2 py-0.5 text-[10px] text-txt-primary w-24 placeholder:text-txt-faint focus:outline-none focus:border-accent/40"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-txt-dim uppercase tracking-wider">Sort:</span>
              {([
                { field: "date" as const, label: "Date" },
                { field: "pnl" as const, label: "P&L" },
                { field: "pair" as const, label: "Pair" },
                { field: "hold" as const, label: "Hold" },
              ]).map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                    sortField === field ? "bg-elevated text-txt-primary font-semibold border border-border-muted" : "text-txt-dim hover:text-txt-secondary"
                  }`}
                >
                  {label}{sortField === field ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                </button>
              ))}
            </div>
            {filteredClosed.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[9px] text-txt-dim uppercase tracking-wider">Export:</span>
                <button onClick={exportCSV} className="text-[10px] px-2 py-0.5 rounded bg-inset border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-muted cursor-pointer transition-colors">
                  CSV
                </button>
                <button onClick={exportJSON} className="text-[10px] px-2 py-0.5 rounded bg-inset border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-muted cursor-pointer transition-colors">
                  { } JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open Positions */}
      {activeTab === "positions" && (
        <Card padding="none">
          {openTrades.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-txt-dim">No open positions</p>
              <p className="text-[10px] text-txt-faint mt-1">Execute a signal from the /signals page to open a trade</p>
            </div>
          ) : (
            <div>
              {openTrades.map((t) => {
                const base = t.pair.split("/")[0];
                const price = currentPrices?.get(base) ?? currentPrices?.get(t.pair) ?? t.entryPrice;
                return <PositionRow key={t.id} trade={t} currentPrice={price} onClose={onClose} />;
              })}
            </div>
          )}
        </Card>
      )}

      {/* Trade History */}
      {activeTab === "history" && (
        <Card padding="none">
          {filteredClosed.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-txt-dim">No closed trades yet</p>
              <p className="text-[10px] text-txt-faint mt-1">Trades will appear here after TP, SL, liquidation, or manual close</p>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-border-default">
                {filteredClosed.map((t) => (
                  <div key={t.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          t.side === "LONG" ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-[#ff4444]/15 text-[#ff4444]"
                        }`}>{t.side}</span>
                        <span className="text-xs font-bold text-txt-primary">{t.pair}</span>
                        <span className="text-[9px] text-accent font-mono">{t.leverage}x</span>
                      </div>
                      <span className={`text-[11px] font-bold font-mono ${(t.pnl ?? 0) >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                        {(t.pnl ?? 0) >= 0 ? "+" : ""}{fmtUSD(t.pnl ?? 0)}
                      </span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-2 text-[10px]">
                      <div><p className="text-txt-faint">Entry</p><p className="font-mono text-txt-secondary">${fmtPrice(t.entryPrice)}</p></div>
                      <div><p className="text-txt-faint">Exit</p><p className="font-mono text-txt-secondary">${fmtPrice(t.exitPrice ?? 0)}</p></div>
                      <div><p className="text-txt-faint">Hold</p><p className="font-mono text-txt-secondary">{fmtTime((t.closedAt ?? Date.now()) - t.openedAt)}</p></div>
                      <div><p className="text-txt-faint">Type</p><p className="font-mono text-txt-secondary">{t.tradingType ?? "—"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[720px]">
                {/* Table header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-2 text-[9px] text-txt-dim uppercase tracking-wider font-semibold border-b border-border-default">
                  <span>Side</span>
                  <span>Pair</span>
                  <span>Type</span>
                  <span>Lev</span>
                  <span>Entry</span>
                  <span>Exit</span>
                  <span>Hold</span>
                  <span>P&L</span>
                </div>
                {filteredClosed.map((t) => (
                  <HistoryRow key={t.id} trade={t} signalMap={signalMap} />
                ))}
              </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Balance Card ────────────────────────────────────────────

function BalanceCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <Card padding="md">
      <p className="text-[8px] text-txt-faint uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] font-mono mt-0.5" style={{ color }}>{sub}</p>}
    </Card>
  );
}

// ── Metric Card ────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-inset/30 border border-border-default text-center">
      <p className="text-[8px] text-txt-faint uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold font-mono mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Position Row ────────────────────────────────────────────

function PositionRow({ trade, currentPrice, onClose }: { trade: PaperTrade; currentPrice: number; onClose?: (id: string, price: number) => void }) {
  const priceChange = trade.side === "LONG"
    ? currentPrice - trade.entryPrice
    : trade.entryPrice - currentPrice;
  // Use trade.currentPnl if available (updated by checkTpSl), otherwise calculate
  const pnl = trade.currentPnl !== undefined && trade.currentPnl !== 0
    ? trade.currentPnl
    : priceChange * trade.quantity;
  const pnlPct = (pnl / trade.margin) * 100;
  const isProfit = pnl >= 0;

  const liqDist = trade.side === "LONG"
    ? ((currentPrice - trade.liquidationPrice) / currentPrice) * 100
    : ((trade.liquidationPrice - currentPrice) / currentPrice) * 100;

  const typeConfig = trade.tradingType ? TRADING_TYPES[trade.tradingType as TradingType] : null;

  return (
    <div className="px-4 py-3 border-b border-border-default hover:bg-elevated/20 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            trade.side === "LONG" ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-[#ff4444]/15 text-[#ff4444]"
          }`}>
            {trade.side}
          </span>
          <span className="text-sm font-bold text-txt-primary">{trade.pair}</span>
          <span className="text-[9px] text-accent font-mono">{trade.leverage}x</span>
          {typeConfig && (
            <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${typeConfig.color}15`, color: typeConfig.color }}>
              <span className="inline-flex items-center gap-1">
                <TradingTypeIcon type={typeConfig.id} size={11} />
                {typeConfig.label}
              </span>
            </span>
          )}
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold font-mono ${isProfit ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
            {isProfit ? "+" : ""}{fmtUSD(pnl)}
          </span>
          <span className={`text-[10px] font-mono ml-2 ${isProfit ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
            ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap text-[9px] text-txt-dim font-mono">
          <span>Entry: ${fmtPrice(trade.entryPrice)}</span>
          <span>Current: ${fmtPrice(currentPrice)}</span>
          <span>Margin: {fmtUSD(trade.margin)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono ${liqDist < 5 ? "text-[#ff4444]" : liqDist < 15 ? "text-[#ff8800]" : "text-txt-dim"}`}>
            Liq: {liqDist.toFixed(1)}%
          </span>
          {onClose && (
            <button
              onClick={() => onClose(trade.id, currentPrice)}
              className="text-[9px] text-sell hover:underline cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── History Row ────────────────────────────────────────────

function HistoryRow({ trade, signalMap }: { trade: PaperTrade; signalMap?: Map<string, Signal> }) {
  const isProfit = (trade.pnl ?? 0) >= 0;
  const typeConfig = trade.tradingType ? TRADING_TYPES[trade.tradingType as TradingType] : null;
  const holdMs = (trade.closedAt ?? Date.now()) - trade.openedAt;
  const signal = signalMap?.get(trade.signalId ?? "");
  const hasSignal = !!trade.signalId;

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-2 border-b border-border-default hover:bg-elevated/20 transition-colors">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
        trade.side === "LONG" ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-[#ff4444]/15 text-[#ff4444]"
      }`}>
        {trade.side}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold text-txt-primary">{trade.pair}</span>
        {typeConfig && (
          <span className="text-[8px] px-1 py-0.5 rounded" style={{ backgroundColor: `${typeConfig.color}15`, color: typeConfig.color }}>
            <TradingTypeIcon type={typeConfig.id} size={10} />
          </span>
        )}
        <span className={`text-[8px] px-1 py-0.5 rounded ${
          trade.status === "CLOSED_TP" ? "bg-[#00ff88]/15 text-[#00ff88]"
          : trade.status === "CLOSED_SL" ? "bg-[#ff4444]/15 text-[#ff4444]"
          : trade.status === "CLOSED_LIQ" ? "bg-[#ff4444]/20 text-[#ff4444]"
          : "bg-elevated text-txt-dim"
        }`}>
          {trade.status.replace("CLOSED_", "")}
        </span>
        {hasSignal && (
          <span className="text-[7px] px-1 py-0.5 rounded bg-accent/10 text-accent" title={signal ? `Signal: ${signal.action} ${signal.confidence}%` : `Signal ID: ${trade.signalId}`}>
            C {trade.confidence}%
          </span>
        )}
      </div>
      {typeConfig ? (
        <span className="text-[9px] font-mono" style={{ color: typeConfig.color }}>{trade.tradingType}</span>
      ) : (
        <span className="text-[9px] text-txt-faint">—</span>
      )}
      <span className="text-[10px] font-mono text-txt-secondary">{trade.leverage}x</span>
      <span className="text-[10px] font-mono text-txt-secondary">${fmtPrice(trade.entryPrice)}</span>
      <span className="text-[10px] font-mono text-txt-secondary">${fmtPrice(trade.exitPrice ?? 0)}</span>
      <span className="text-[10px] font-mono text-txt-dim">{fmtTime(holdMs)}</span>
      <span className={`text-[10px] font-bold font-mono ${isProfit ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
        {isProfit ? "+" : ""}{fmtUSD(trade.pnl ?? 0)}
      </span>
    </div>
  );
}

// ── Equity Curve SVG ────────────────────────────────────────

function EquityCurveSVG({ points }: { points: { x: number; y: number; label: string }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length < 2) return null;

  const values = points.map((p) => p.y);
  const min = Math.min(...values) * 0.99;
  const max = Math.max(...values) * 1.01;
  const range = max - min || 1;

  const vbW = 600, vbH = 140, padL = 50, padR = 12, padT = 8, padB = 20;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  const scaleX = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const scaleY = (v: number) => padT + plotH - ((v - min) / range) * plotH;

  const startVal = values[0];
  const endVal = values[values.length - 1];
  const isUp = endVal >= startVal;
  const lineColor = isUp ? "#00E5A8" : "#EF4444";

  let path = `M${scaleX(0)},${scaleY(values[0])}`;
  for (let i = 1; i < values.length; i++) {
    path += ` L${scaleX(i)},${scaleY(values[i])}`;
  }
  const areaPath = `${path} L${scaleX(values.length - 1)},${vbH - padB} L${scaleX(0)},${vbH - padB} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * vbW;
    // Find closest point
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(scaleX(i) - mouseX);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    setHoverIdx(closest);
  };

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-txt-dim">Initial: {fmtUSD(startVal)}</span>
        <span className="text-xs font-bold font-mono" style={{ color: lineColor }}>
          {fmtUSD(endVal)} ({isUp ? "+" : ""}{((endVal - startVal) / startVal * 100).toFixed(2)}%)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full h-28 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="eqGradPortfolio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#eqGradPortfolio)" />
        <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Hover crosshair + dot */}
        {hoverIdx !== null && (
          <>
            <line x1={scaleX(hoverIdx)} y1={padT} x2={scaleX(hoverIdx)} y2={vbH - padB} stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="2,2" />
            <circle cx={scaleX(hoverIdx)} cy={scaleY(values[hoverIdx])} r="3" fill={lineColor} stroke="#05070D" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {/* Tooltip */}
      {hovered && hoverIdx !== null && (
        <div
          className="absolute top-0 bg-[#0B1020] border border-border-default rounded-lg px-2.5 py-1.5 text-[10px] shadow-lg pointer-events-none z-10"
          style={{ left: `${(scaleX(hoverIdx) / vbW) * 100}%`, transform: "translateX(-50%)" }}
        >
          <p className="text-txt-secondary font-semibold">{hovered.label}</p>
          <p className="font-mono" style={{ color: hovered.y >= startVal ? "#00E5A8" : "#EF4444" }}>
            {fmtUSD(hovered.y)} ({hovered.y >= startVal ? "+" : ""}{((hovered.y - startVal) / startVal * 100).toFixed(2)}%)
          </p>
        </div>
      )}
    </div>
  );
}

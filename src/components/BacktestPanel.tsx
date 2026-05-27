"use client";

import { useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { TradingType } from "@/lib/types/trading-type";
import { TRADING_TYPES, TRADING_TYPE_LIST } from "@/lib/types/trading-type";

interface BacktestData {
  pair: string;
  tradingType?: TradingType;
  lookback: number;
  resolution: number;
  totalBars: number;
  totalSignals: number;
  wins: number;
  losses: number;
  neutrals: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalPnl: number;
  maxDrawdown: number;
  maxWinStreak: number;
  maxLossStreak: number;
  longSignals: number;
  shortSignals: number;
  longWinRate: number;
  shortWinRate: number;
  regimeAccuracy: Record<string, { total: number; wins: number; accuracy: number }>;
  equityCurve: { index: number; value: number }[];
}

const PAIRS = ["BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC", "LINK/USDC"];

export default function BacktestPanel() {
  const [pair, setPair] = useState("BTC/USDC");
  const [tradingType, setTradingType] = useState<TradingType | null>(null);
  const [resolution, setResolution] = useState(12);
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pair, resolution: String(resolution) });
      if (tradingType) params.set("type", tradingType);
      const res = await fetch(`/api/backtest?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  }, [pair, tradingType, resolution]);

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-txt-primary">Signal Backtest</h3>
          <p className="text-[10px] text-txt-dim mt-0.5">
            Replay historical signals and measure accuracy
          </p>
        </div>
        {data && (
          <Badge variant="accent" size="sm">
            {data.totalSignals} signals
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-[9px] text-txt-faint uppercase tracking-wider block mb-1">Pair</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="w-full bg-inset border border-border-default rounded-lg px-2 py-1.5 text-xs text-txt-primary outline-none"
          >
            {PAIRS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-txt-faint uppercase tracking-wider block mb-1">Type</label>
          <select
            value={tradingType ?? ""}
            onChange={(e) => setTradingType(e.target.value ? e.target.value as TradingType : null)}
            className="w-full bg-inset border border-border-default rounded-lg px-2 py-1.5 text-xs text-txt-primary outline-none"
          >
            <option value="">All Types</option>
            {TRADING_TYPE_LIST.map((t) => (
              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-txt-faint uppercase tracking-wider block mb-1">
            Resolution (bars)
          </label>
          <select
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            className="w-full bg-inset border border-border-default rounded-lg px-2 py-1.5 text-xs text-txt-primary outline-none"
          >
            <option value={6}>6H (fast)</option>
            <option value={12}>12H (default)</option>
            <option value={24}>24H (swing)</option>
            <option value={48}>48H (position)</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={runTest}
            disabled={loading}
            className="w-full py-1.5 px-3 text-xs font-bold rounded-lg bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-sell/10 border border-sell/20 text-xs text-sell mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {data && data.totalSignals > 0 && (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard label="Win Rate" value={`${data.winRate}%`} color={data.winRate >= 60 ? "#00E5A8" : data.winRate >= 50 ? "#F59E0B" : "#EF4444"} />
            <MetricCard label="Profit Factor" value={data.profitFactor === Infinity ? "∞" : data.profitFactor.toFixed(2)} color={data.profitFactor >= 1.5 ? "#00E5A8" : data.profitFactor >= 1 ? "#F59E0B" : "#EF4444"} />
            <MetricCard label="Total PnL" value={`${data.totalPnl > 0 ? "+" : ""}${data.totalPnl}%`} color={data.totalPnl >= 0 ? "#00E5A8" : "#EF4444"} />
            <MetricCard label="Max Drawdown" value={`${data.maxDrawdown}%`} color="#EF4444" />
            <MetricCard label="Avg Win" value={`+${data.avgWin.toFixed(2)}%`} color="#00E5A8" />
            <MetricCard label="Avg Loss" value={`-${data.avgLoss.toFixed(2)}%`} color="#EF4444" />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Win/Loss */}
            <div className="p-3 rounded-lg bg-inset/30 border border-border-default">
              <p className="text-[9px] text-txt-faint uppercase tracking-wider mb-2">Win / Loss</p>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-buy">{data.wins}W</span>
                <span className="text-sm font-bold text-sell">{data.losses}L</span>
                <span className="text-sm font-bold text-txt-dim">{data.neutrals}N</span>
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden flex bg-elevated">
                <div className="h-full bg-buy" style={{ width: `${data.winRate}%` }} />
                <div className="h-full bg-sell" style={{ width: `${100 - data.winRate}%` }} />
              </div>
            </div>

            {/* Long/Short */}
            <div className="p-3 rounded-lg bg-inset/30 border border-border-default">
              <p className="text-[9px] text-txt-faint uppercase tracking-wider mb-2">Long vs Short</p>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-buy">L: {data.longSignals} ({data.longWinRate}%)</span>
                <span className="text-sm font-bold text-sell">S: {data.shortSignals} ({data.shortWinRate}%)</span>
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden flex bg-elevated">
                <div className="h-full bg-buy" style={{ width: `${data.longSignals / data.totalSignals * 100}%` }} />
                <div className="h-full bg-sell" style={{ width: `${data.shortSignals / data.totalSignals * 100}%` }} />
              </div>
            </div>

            {/* Streaks */}
            <div className="p-3 rounded-lg bg-inset/30 border border-border-default">
              <p className="text-[9px] text-txt-faint uppercase tracking-wider mb-2">Streaks</p>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-buy">🔥 {data.maxWinStreak}W</span>
                <span className="text-sm font-bold text-sell">❄️ {data.maxLossStreak}L</span>
              </div>
            </div>
          </div>

          {/* Regime accuracy */}
          {Object.keys(data.regimeAccuracy).length > 0 && (
            <div className="p-3 rounded-lg bg-inset/30 border border-border-default">
              <p className="text-[9px] text-txt-faint uppercase tracking-wider mb-2">Accuracy by Regime</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(data.regimeAccuracy).map(([regime, stats]) => (
                  <div key={regime} className="text-center">
                    <p className="text-[9px] text-txt-dim font-mono">{regime.replace("_", " ")}</p>
                    <p className={`text-sm font-bold ${stats.accuracy >= 60 ? "text-buy" : stats.accuracy >= 50 ? "text-hold" : "text-sell"}`}>
                      {stats.accuracy}%
                    </p>
                    <p className="text-[8px] text-txt-faint">{stats.total} signals</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini equity curve */}
          {data.equityCurve.length > 2 && (
            <EquityCurveMini curve={data.equityCurve} />
          )}
        </div>
      )}

      {/* No results */}
      {data && data.totalSignals === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-txt-dim">No signals generated in backtest period</p>
          <p className="text-[10px] text-txt-faint mt-1">Try a different pair or resolution</p>
        </div>
      )}
    </Card>
  );
}

// ── Metric Card ────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-inset/30 border border-border-default text-center">
      <p className="text-[8px] text-txt-faint uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Mini Equity Curve ──────────────────────────────────────

function EquityCurveMini({ curve }: { curve: { index: number; value: number }[] }) {
  if (curve.length < 2) return null;

  const values = curve.map((p) => p.value);
  const min = Math.min(...values) * 0.99;
  const max = Math.max(...values) * 1.01;
  const range = max - min || 1;

  const vbW = 400, vbH = 80, pad = 4;
  const plotW = vbW - pad * 2;
  const plotH = vbH - pad * 2;

  const startVal = values[0];
  const endVal = values[values.length - 1];
  const isUp = endVal >= startVal;
  const lineColor = isUp ? "#00E5A8" : "#EF4444";

  let path = `M${pad},${pad + plotH - ((values[0] - min) / range) * plotH}`;
  for (let i = 1; i < values.length; i++) {
    const x = pad + (i / (values.length - 1)) * plotW;
    const y = pad + plotH - ((values[i] - min) / range) * plotH;
    path += ` L${x},${y}`;
  }

  const areaPath = `${path} L${pad + plotW},${vbH - pad} L${pad},${vbH - pad} Z`;

  return (
    <div className="p-3 rounded-lg bg-inset/30 border border-border-default">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] text-txt-faint uppercase tracking-wider">Equity Curve</p>
        <span className="text-[10px] font-mono font-bold" style={{ color: lineColor }}>
          ${endVal.toFixed(0)} ({isUp ? "+" : ""}{((endVal - startVal) / startVal * 100).toFixed(1)}%)
        </span>
      </div>
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-16">
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#eqGrad)" />
        <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

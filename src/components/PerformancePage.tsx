"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { RecordedSignal, ResolutionWindow, CalibrationBucket, EquityPoint, DrawdownResult, StreakInfo, CoinAccuracy, FrequencyStats } from "@/lib/hooks/useSignalHistory";
import type { SoDEXTicker } from "@/lib/types/trade";
import { usePerformance } from "@/lib/hooks/usePerformance";
import { useSignals } from "@/lib/hooks/useSignals";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import ProgressBar from "@/components/ui/ProgressBar";

/* ── Helpers ── */

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function fmtPrice(v: number): string {
  if (v >= 10000) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${v.toFixed(4)}`;
}

const COIN_COLORS: Record<string, string> = {
  BTC: "#ff8800",
  ETH: "#00d4ff",
  SOL: "#22D3EE",
};

const RES_WINDOW_LABELS: Record<ResolutionWindow, string> = {
  "1h": "1 Hour",
  "4h": "4 Hours",
  "24h": "24 Hours",
  "7d": "7 Days",
};

/* ── Props ── */

interface Props {
  signalHistory?: RecordedSignal[];
  signalStats?: { totalResolved: number; totalCorrect: number; accuracy: number | null };
  historyHydrated?: boolean;
  calibration?: CalibrationBucket[];
  equityCurve?: EquityPoint[];
  drawdown?: DrawdownResult;
  streaks?: StreakInfo;
  perCoin?: CoinAccuracy[];
  frequency?: FrequencyStats;
  resolutionWindow?: ResolutionWindow;
  setResolutionWindow?: (w: ResolutionWindow) => void;
  exportCSV?: () => void;
}

/* ── Equity Curve SVG Chart ── */

function EquityCurveChart({ points }: { points: EquityPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ idx: number; x: number } | null>(null);

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values) * 0.99;
  const max = Math.max(...values) * 1.01;
  const range = max - min || 1;

  const vbW = 640, vbH = 180, padL = 52, padR = 12, padT = 8, padB = 24;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  const scaleX = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const scaleY = (v: number) => padT + plotH - ((v - min) / range) * plotH;

  const startVal = values[0];
  const endVal = values[values.length - 1];
  const isUp = endVal >= startVal;
  const lineColor = isUp ? "#00E5A8" : "#EF4444";

  // Build path
  let path = `M${scaleX(0)},${scaleY(values[0])}`;
  for (let i = 1; i < values.length; i++) {
    path += ` L${scaleX(i)},${scaleY(values[i])}`;
  }
  const areaPath = `${path} L${scaleX(values.length - 1)},${vbH - padB} L${scaleX(0)},${vbH - padB} Z`;

  const hIdx = hover?.idx ?? -1;
  const hVal = hIdx >= 0 ? values[hIdx] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-40 cursor-crosshair"
      onMouseMove={(e) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = (e.clientX - rect.left) / rect.width;
        const idx = Math.round(relX * (points.length - 1));
        setHover({ idx: Math.max(0, Math.min(points.length - 1, idx)), x: 0 });
      }}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.12" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {Array.from({ length: 4 }, (_, i) => {
        const y = padT + (i / 3) * plotH;
        const val = max - (i / 3) * range;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={vbW - padR} y2={y} stroke="#ffffff" strokeWidth="0.3" opacity="0.05" />
            <text x={padL - 4} y={y + 3} fill="#475569" fontSize="8" textAnchor="end" fontFamily="monospace">
              ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#eqGrad)" />
      <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" />
      {/* Hover */}
      {hIdx >= 0 && hVal != null && (
        <>
          <line x1={scaleX(hIdx)} y1={padT} x2={scaleX(hIdx)} y2={vbH - padB} stroke="#ffffff" strokeWidth="0.5" opacity="0.1" strokeDasharray="2 2" />
          <circle cx={scaleX(hIdx)} cy={scaleY(hVal)} r="3" fill={lineColor} />
          <text x={scaleX(hIdx)} y={vbH - 6} fill="#64748B" fontSize="7" textAnchor="middle" fontFamily="monospace">
            {new Date(points[hIdx].timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        </>
      )}
    </svg>
  );
}

/* ── Calibration Bar Chart ── */

function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <div className="space-y-2">
      {buckets.map((b) => (
        <div key={b.range} className="flex items-center gap-3">
          <span className="text-[10px] text-txt-muted w-16 text-right font-mono">{b.range}</span>
          <div className="flex-1 h-5 bg-inset rounded overflow-hidden relative">
            {b.total > 0 && (
              <>
                <div
                  className="absolute inset-y-0 left-0 bg-accent/15 rounded"
                  style={{ width: `${(b.total / maxTotal) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded"
                  style={{
                    width: `${b.accuracy != null ? (b.accuracy / 100) * (b.total / maxTotal) * 100 : 0}%`,
                    backgroundColor: b.accuracy != null && b.accuracy >= 70 ? "#00E5A860" : b.accuracy != null && b.accuracy >= 50 ? "#ff880040" : "#EF444430",
                  }}
                />
              </>
            )}
            <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-txt-secondary">
              {b.accuracy != null ? `${Math.round(b.accuracy)}% (${b.total})` : b.total > 0 ? `${b.total}` : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ── */

export default function PerformancePage({
  signalHistory = [],
  signalStats,
  historyHydrated = true,
  calibration = [],
  equityCurve = [],
  drawdown,
  streaks,
  perCoin = [],
  frequency,
  resolutionWindow = "24h",
  setResolutionWindow,
  exportCSV,
}: Props) {
  const { coins, loading, error } = usePerformance();
  const { data: signalsData } = useSignals();

  // Market metrics
  const avgChange24h = coins.length ? coins.reduce((s, c) => s + c.change24h, 0) / coins.length : 0;
  const avgChange30d = coins.length ? coins.reduce((s, c) => s + c.change30d, 0) / coins.length : 0;
  const avgVolatility = coins.length ? coins.reduce((s, c) => s + c.volatility30d, 0) / coins.length : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-txt-primary">Performance Analytics</h2>
          <Badge variant="accent" size="md">LIVE DATA</Badge>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="lg"><Skeleton variant="table-row" /></Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-txt-primary">Performance Analytics</h2>
        <Card padding="lg"><p className="text-sm text-sell">{error}</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Performance Analytics</h2>
          <p className="text-xs text-txt-muted mt-0.5">Market performance, signal accuracy, and risk metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="md">LIVE DATA</Badge>
          {exportCSV && (
            <button onClick={exportCSV} className="text-[10px] text-accent border border-accent/20 px-2 py-1 rounded hover:bg-accent/10 transition-colors">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Section 1: Market Performance ── */}
      <div>
        <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Market Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Avg 24H", value: fmtPct(avgChange24h), color: avgChange24h >= 0 ? "#00ff88" : "#ff4444" },
            { label: "Avg 30D", value: fmtPct(avgChange30d), color: avgChange30d >= 0 ? "#00ff88" : "#ff4444" },
            { label: "Avg Volatility", value: `${avgVolatility.toFixed(1)}%`, color: "#00E5A8" },
            { label: "Tracked", value: `${coins.length} coins`, color: "#00d4ff" },
          ].map((m) => (
            <Card key={m.label} padding="sm" accent={m.color}>
              <p className="text-[10px] text-txt-muted uppercase tracking-wider">{m.label}</p>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: m.color }}>{m.value}</p>
            </Card>
          ))}
        </div>

        {/* 30D returns bar chart */}
        <Card padding="lg">
          <h4 className="text-xs font-semibold text-txt-secondary mb-3">30-Day Returns</h4>
          <div className="flex items-end gap-6 h-40">
            {coins.map((coin) => {
              const maxAbs = Math.max(...coins.map((c) => Math.abs(c.change30d)), 1);
              const color = COIN_COLORS[coin.symbol] || "#ffffff";
              return (
                <div key={coin.symbol} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-txt-muted font-mono">{fmtPrice(coin.price)}</span>
                  <span className={`text-xs font-bold tabular-nums ${coin.change30d >= 0 ? "text-buy" : "text-sell"}`}>
                    {fmtPct(coin.change30d)}
                  </span>
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{ height: `${(Math.abs(coin.change30d) / maxAbs) * 100}%`, backgroundColor: color, opacity: 0.7, minHeight: "6px" }}
                  />
                  <span className="text-xs font-semibold" style={{ color }}>{coin.symbol}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Coin detail table */}
        <Card padding="none" className="overflow-hidden mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-default text-txt-muted">
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
                  <tr key={c.symbol} className="border-b border-border-default hover:bg-elevated">
                    <td className="p-3 font-bold" style={{ color: COIN_COLORS[c.symbol] }}>{c.symbol}</td>
                    <td className="p-3 text-right font-mono text-txt-primary">{fmtPrice(c.price)}</td>
                    <td className={`p-3 text-right font-semibold tabular-nums ${c.change24h >= 0 ? "text-buy" : "text-sell"}`}>{fmtPct(c.change24h)}</td>
                    <td className={`p-3 text-right font-semibold tabular-nums ${c.change7d >= 0 ? "text-buy" : "text-sell"}`}>{fmtPct(c.change7d)}</td>
                    <td className={`p-3 text-right font-semibold tabular-nums ${c.change30d >= 0 ? "text-buy" : "text-sell"}`}>{fmtPct(c.change30d)}</td>
                    <td className="p-3 text-right font-mono text-txt-secondary">{fmtPrice(c.high30d)}</td>
                    <td className="p-3 text-right font-mono text-txt-secondary">{fmtPrice(c.low30d)}</td>
                    <td className="p-3 text-right text-accent tabular-nums">{c.volatility30d.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Section 2: Signal Accuracy ── */}
      {historyHydrated && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Signal Accuracy Tracking</h3>
            <div className="flex items-center gap-2">
              {/* Resolution window selector */}
              <span className="text-[9px] text-txt-dim">Resolve after:</span>
              <div className="flex items-center gap-0.5 bg-inset border border-border-default rounded-lg p-0.5">
                {(Object.keys(RES_WINDOW_LABELS) as ResolutionWindow[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => setResolutionWindow?.(w)}
                    className={`text-[9px] px-2 py-0.5 rounded transition-colors ${
                      resolutionWindow === w ? "bg-elevated text-accent" : "text-txt-dim hover:text-txt-secondary"
                    }`}
                  >
                    {RES_WINDOW_LABELS[w]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Signal summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            <Card padding="sm" accent="#00E5A8">
              <p className="text-[10px] text-txt-muted">Tracked</p>
              <p className="text-lg font-bold font-mono text-txt-primary">{signalHistory.length}</p>
            </Card>
            <Card padding="sm" accent="#00d4ff">
              <p className="text-[10px] text-txt-muted">Resolved</p>
              <p className="text-lg font-bold font-mono text-info">{signalStats?.totalResolved ?? 0}</p>
            </Card>
            <Card padding="sm" accent="#00ff88">
              <p className="text-[10px] text-txt-muted">Correct</p>
              <p className="text-lg font-bold font-mono text-buy">{signalStats?.totalCorrect ?? 0}</p>
            </Card>
            <Card padding="sm" accent={signalStats?.accuracy != null && signalStats.accuracy >= 60 ? "#00ff88" : signalStats?.accuracy != null && signalStats.accuracy >= 40 ? "#ff8800" : "#ff4444"}>
              <p className="text-[10px] text-txt-muted">Accuracy</p>
              <p className="text-lg font-bold font-mono" style={{ color: signalStats?.accuracy != null && signalStats.accuracy >= 60 ? "#00ff88" : signalStats?.accuracy != null && signalStats.accuracy >= 40 ? "#ff8800" : "#ff4444" }}>
                {signalStats?.accuracy != null ? `${Math.round(signalStats.accuracy)}%` : "—"}
              </p>
            </Card>
            <Card padding="sm" accent="#A78BFA">
              <p className="text-[10px] text-txt-muted">Signals/Day</p>
              <p className="text-lg font-bold font-mono text-txt-primary">{frequency?.signalsPerDay ?? 0}</p>
            </Card>
            <Card padding="sm" accent="#22D3EE">
              <p className="text-[10px] text-txt-muted">Last 24H</p>
              <p className="text-lg font-bold font-mono text-txt-primary">{frequency?.last24h ?? 0}</p>
            </Card>
          </div>

          {/* Win/Loss Streaks */}
          {streaks && signalHistory.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Card padding="sm">
                <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1.5">Current Streak</p>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold font-mono ${streaks.current.type === "win" ? "text-buy" : streaks.current.type === "loss" ? "text-sell" : "text-txt-dim"}`}>
                    {streaks.current.count}
                  </span>
                  <span className={`text-xs ${streaks.current.type === "win" ? "text-buy" : streaks.current.type === "loss" ? "text-sell" : "text-txt-dim"}`}>
                    {streaks.current.type === "win" ? "wins" : streaks.current.type === "loss" ? "losses" : "—"}
                  </span>
                </div>
                {/* Last 10 dots */}
                <div className="flex gap-1 mt-2">
                  {streaks.last10.map((r, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-sm ${r === "win" ? "bg-buy" : "bg-sell"}`}
                      title={r}
                    />
                  ))}
                  {Array.from({ length: Math.max(0, 10 - streaks.last10.length) }).map((_, i) => (
                    <div key={`e-${i}`} className="w-3 h-3 rounded-sm bg-inset border border-border-default" />
                  ))}
                </div>
              </Card>
              <Card padding="sm">
                <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1">Best Win Streak</p>
                <span className="text-lg font-bold font-mono text-buy">{streaks.bestWinStreak}</span>
                <span className="text-xs text-txt-dim ml-1">consecutive</span>
              </Card>
              <Card padding="sm">
                <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1">Worst Loss Streak</p>
                <span className="text-lg font-bold font-mono text-sell">{streaks.worstLossStreak}</span>
                <span className="text-xs text-txt-dim ml-1">consecutive</span>
              </Card>
            </div>
          )}

          {/* Equity Curve */}
          {equityCurve.length > 2 && (
            <Card padding="lg" className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-txt-secondary">Simulated Equity Curve</h4>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-txt-dim">Start: <span className="text-txt-secondary font-mono">$10,000</span></span>
                  <span className="text-txt-dim">End: <span className="text-txt-primary font-mono font-bold">${equityCurve[equityCurve.length - 1].value.toLocaleString()}</span></span>
                  {drawdown && (
                    <span className="text-txt-dim">Max DD: <span className="text-sell font-mono">{drawdown.maxDrawdown.toFixed(1)}%</span></span>
                  )}
                </div>
              </div>
              <EquityCurveChart points={equityCurve} />
              <p className="text-[9px] text-txt-dim mt-2">Simulated P&L assuming 5% position per signal, correct = +2%, wrong = -1%.</p>
            </Card>
          )}

          {/* Max Drawdown */}
          {drawdown && drawdown.maxDrawdown > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card padding="sm">
                <p className="text-[10px] text-txt-muted">Max Drawdown</p>
                <p className="text-lg font-bold font-mono text-sell">{drawdown.maxDrawdown.toFixed(1)}%</p>
              </Card>
              <Card padding="sm">
                <p className="text-[10px] text-txt-muted">Peak Value</p>
                <p className="text-sm font-bold font-mono text-txt-primary">{fmtPrice(drawdown.peakValue)}</p>
              </Card>
              <Card padding="sm">
                <p className="text-[10px] text-txt-muted">Trough Value</p>
                <p className="text-sm font-bold font-mono text-sell">{fmtPrice(drawdown.troughValue)}</p>
              </Card>
              <Card padding="sm">
                <p className="text-[10px] text-txt-muted">Recovery Signals</p>
                <p className="text-sm font-bold font-mono text-txt-primary">{drawdown.recoverySignals}</p>
              </Card>
            </div>
          )}

          {/* Confidence Calibration */}
          {calibration.some((b) => b.total > 0) && (
            <Card padding="lg" className="mb-4">
              <h4 className="text-xs font-semibold text-txt-secondary mb-3">Confidence Calibration</h4>
              <p className="text-[9px] text-txt-dim mb-3">Does confidence predict accuracy? Ideally, 80% confidence signals should be ~80% accurate.</p>
              <CalibrationChart buckets={calibration} />
            </Card>
          )}

          {/* Per-Coin Breakdown */}
          {perCoin.length > 0 && (
            <Card padding="lg" className="mb-4">
              <h4 className="text-xs font-semibold text-txt-secondary mb-3">Per-Coin Accuracy</h4>
              <div className="space-y-2">
                {perCoin.map((c) => (
                  <div key={c.coin} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-10" style={{ color: COIN_COLORS[c.coin] || "#CBD5E1" }}>{c.coin}</span>
                    <div className="flex-1">
                      <ProgressBar
                        value={c.accuracy ?? 0}
                        color={COIN_COLORS[c.coin] || "#00E5A8"}
                        height="sm"
                        showValue
                      />
                    </div>
                    <span className="text-[10px] text-txt-dim w-20 text-right">
                      {c.correct}/{c.resolved} correct
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Signals Table */}
          {signalHistory.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <div className="p-3 border-b border-border-default flex items-center justify-between">
                <h4 className="text-xs font-semibold text-txt-secondary">Recent Signals</h4>
                <span className="text-[9px] text-txt-dim">Resolves after {RES_WINDOW_LABELS[resolutionWindow]}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-default text-txt-muted">
                      <th className="text-left p-2 font-medium">Time</th>
                      <th className="text-left p-2 font-medium">Coin</th>
                      <th className="text-left p-2 font-medium">Action</th>
                      <th className="text-right p-2 font-medium">Confidence</th>
                      <th className="text-right p-2 font-medium">Entry</th>
                      <th className="text-right p-2 font-medium">Current</th>
                      <th className="text-center p-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signalHistory.slice(0, 15).map((s) => (
                      <tr key={s.id} className="border-b border-border-default hover:bg-elevated">
                        <td className="p-2 text-txt-tertiary">
                          {new Date(s.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-2 font-semibold" style={{ color: COIN_COLORS[s.coin] || "#CBD5E1" }}>{s.coin}</td>
                        <td className="p-2">
                          <Badge variant={s.action.toLowerCase()} size="sm">{s.action}</Badge>
                        </td>
                        <td className="p-2 text-right tabular-nums">{s.confidence}%</td>
                        <td className="p-2 text-right font-mono">{fmtPrice(s.price)}</td>
                        <td className="p-2 text-right font-mono">
                          {s.resolved ? fmtPrice(s.resolved.finalPrice) : <span className="text-txt-dim">Pending</span>}
                        </td>
                        <td className="p-2 text-center">
                          {s.resolved ? (
                            s.resolved.correct ? <Badge variant="live" size="sm">&#10003;</Badge> : <Badge variant="error" size="sm">&#10007;</Badge>
                          ) : (
                            <span className="text-txt-dim">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {signalHistory.length > 15 && (
                <div className="p-2 border-t border-border-default">
                  <p className="text-[9px] text-txt-dim">Showing last 15 of {signalHistory.length} signals</p>
                </div>
              )}
            </Card>
          )}

          {/* Most Active Pair */}
          {frequency?.mostActivePair && (
            <div className="mt-3 text-[10px] text-txt-dim">
              Most active pair: <span className="text-txt-secondary font-semibold">{frequency.mostActivePair}</span>
              {" · "}Last 7 days: <span className="text-txt-secondary">{frequency.last7d} signals</span>
            </div>
          )}
        </div>
      )}

      {/* Live Dimensions (BTC) */}
      {signalsData?.dimensions?.BTC && (
        <div>
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Live Signal Dimensions (BTC)</h3>
          <Card padding="lg">
            <div className="flex flex-col gap-2">
              {[
                { key: "etfFlow" as const, label: "ETF Flow", color: "#00d4ff" },
                { key: "sentiment" as const, label: "Sentiment", color: "#8B5CF6" },
                { key: "macro" as const, label: "Macro", color: "#00ff88" },
                { key: "momentum" as const, label: "Momentum", color: "#ff8800" },
                { key: "treasury" as const, label: "Treasury", color: "#ff4488" },
              ].map((d) => {
                const dim = signalsData.dimensions.BTC[d.key];
                return (
                  <div key={d.key}>
                    <ProgressBar value={dim.score} color={d.color} height="md" label={d.label} showValue />
                    <p className="text-[9px] text-txt-dim mt-0.5 ml-[7rem]">{dim.detail}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

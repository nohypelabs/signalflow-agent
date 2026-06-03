"use client";

import { useState, useRef } from "react";
import type { RecordedSignal, ResolutionWindow, CalibrationBucket, EquityPoint, DrawdownResult, StreakInfo, CoinAccuracy, FrequencyStats } from "@/lib/hooks/useSignalHistory";
import { usePerformance } from "@/lib/hooks/usePerformance";
import { useSignals } from "@/lib/hooks/useSignals";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import ProgressBar from "@/components/ui/ProgressBar";
import BacktestPanel from "@/components/BacktestPanel";
import { ChevronDown, Download } from "lucide-react";

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

/* ── Collapsible Section ── */

function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card padding="none" className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 cursor-pointer hover:bg-elevated/20 transition-colors"
      >
        <h4 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">{title}</h4>
        <ChevronDown size={14} className={`text-txt-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border-default">{children}</div>}
    </Card>
  );
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
      {Array.from({ length: 4 }, (_, i) => {
        const y = padT + (i / 3) * plotH;
        const val = max - (i / 3) * range;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={vbW - padR} y2={y} stroke="#ffffff" strokeWidth="0.3" opacity="0.05" />
            <text x={padL - 4} y={y + 3} fill="#7C8DA3" fontSize="8" textAnchor="end" fontFamily="monospace">
              ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#eqGrad)" />
      <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" />
      {hIdx >= 0 && hVal != null && (
        <>
          <line x1={scaleX(hIdx)} y1={padT} x2={scaleX(hIdx)} y2={vbH - padB} stroke="#ffffff" strokeWidth="0.5" opacity="0.1" strokeDasharray="2 2" />
          <circle cx={scaleX(hIdx)} cy={scaleY(hVal)} r="3" fill={lineColor} />
          <text x={scaleX(hIdx)} y={vbH - 6} fill="#94A3B8" fontSize="7" textAnchor="middle" fontFamily="monospace">
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
    <div className="p-4 space-y-2">
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

  const avgChange24h = coins.length ? coins.reduce((s, c) => s + c.change24h, 0) / coins.length : 0;
  const avgChange30d = coins.length ? coins.reduce((s, c) => s + c.change30d, 0) / coins.length : 0;
  const avgVolatility = coins.length ? coins.reduce((s, c) => s + c.volatility30d, 0) / coins.length : 0;

  // Win rate from streaks
  const winRate = signalStats?.accuracy ?? null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-txt-primary">Performance Analytics</h2>
          <Badge variant="muted" size="md">LIVE DATA</Badge>
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
    <div className="space-y-4">
      {/* ── Hero: Big stat + 4 key metrics ── */}
      <section className="rounded-xl border border-border-default bg-inset/70 p-5">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1.4fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-secondary">Performance Analytics</p>
              <Badge variant="muted" size="sm">LIVE DATA</Badge>
            </div>
            <div className="mt-1.5 flex items-end gap-3">
              <div className={`font-mono text-5xl font-bold leading-none tracking-tight ${avgChange30d >= 0 ? "text-buy" : "text-sell"}`}>
                {fmtPct(avgChange30d)}
              </div>
              <div className="pb-1">
                <div className="text-sm font-semibold text-txt-primary">30-day market basket</div>
                <div className="text-[11px] text-txt-tertiary">{coins.length} assets tracked</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Accuracy", value: winRate != null ? `${Math.round(winRate)}%` : "—", tone: winRate != null && winRate >= 60 ? "text-buy" : winRate != null ? "text-hold" : "text-txt-muted" },
              { label: "Signals/Day", value: `${frequency?.signalsPerDay ?? 0}`, tone: "text-info" },
              { label: "Max Drawdown", value: drawdown ? `${drawdown.maxDrawdown.toFixed(1)}%` : "—", tone: "text-sell" },
              { label: "Volatility", value: `${avgVolatility.toFixed(1)}%`, tone: "text-txt-primary" },
            ].map((item) => (
              <div key={item.label} className="border-l border-border-default px-3">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-txt-tertiary">{item.label}</div>
                <div className={`mt-1 font-mono text-sm font-bold ${item.tone}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {exportCSV && (
          <div className="mt-3 border-t border-border-default pt-3 text-right">
            <button onClick={exportCSV} className="cursor-pointer flex items-center gap-1.5 ml-auto rounded border border-border-default px-2.5 py-1 text-[10px] text-txt-secondary transition-colors hover:bg-elevated/30 hover:text-txt-primary">
              <Download size={11} />
              Export CSV
            </button>
          </div>
        )}
      </section>

      {/* ── Backtest CTA — right below hero ── */}
      <BacktestPanel />

      {/* ── Equity Curve + Streak/Drawdown (2-column) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Equity Curve */}
        {equityCurve.length > 2 && (
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h4 className="text-xs font-semibold text-txt-primary">Simulated Equity Curve</h4>
              <div className="flex items-center gap-3 flex-wrap text-[10px]">
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

        {/* Streak + Drawdown compact */}
        <div className="space-y-4">
          {streaks && signalHistory.length > 0 && (
            <Card padding="sm">
              <p className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider mb-2">Win/Loss Streaks</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[8px] font-semibold text-txt-tertiary uppercase">Current</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-lg font-bold font-mono ${streaks.current.type === "win" ? "text-buy" : streaks.current.type === "loss" ? "text-sell" : "text-txt-dim"}`}>
                      {streaks.current.count}
                    </span>
                    <span className={`text-[9px] ${streaks.current.type === "win" ? "text-buy" : streaks.current.type === "loss" ? "text-sell" : "text-txt-dim"}`}>
                      {streaks.current.type === "win" ? "W" : streaks.current.type === "loss" ? "L" : "—"}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mt-1.5">
                    {streaks.last10.map((r, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-sm ${r === "win" ? "bg-buy" : "bg-sell"}`} />
                    ))}
                    {Array.from({ length: Math.max(0, 10 - streaks.last10.length) }).map((_, i) => (
                      <div key={`e-${i}`} className="w-2.5 h-2.5 rounded-sm bg-inset border border-border-default" />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-semibold text-txt-tertiary uppercase">Best Win</p>
                  <span className="text-lg font-bold font-mono text-buy">{streaks.bestWinStreak}</span>
                </div>
                <div>
                  <p className="text-[8px] font-semibold text-txt-tertiary uppercase">Worst Loss</p>
                  <span className="text-lg font-bold font-mono text-sell">{streaks.worstLossStreak}</span>
                </div>
              </div>
            </Card>
          )}

          {drawdown && drawdown.maxDrawdown > 0 && (
            <Card padding="sm">
              <p className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider mb-2">Drawdown</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[8px] font-semibold text-txt-tertiary uppercase">Peak</p>
                  <p className="text-sm font-bold font-mono text-txt-primary">{fmtPrice(drawdown.peakValue)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-semibold text-txt-tertiary uppercase">Trough</p>
                  <p className="text-sm font-bold font-mono text-sell">{fmtPrice(drawdown.troughValue)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-semibold text-txt-tertiary uppercase">Max DD</p>
                  <p className="text-sm font-bold font-mono text-sell">{drawdown.maxDrawdown.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[8px] font-semibold text-txt-tertiary uppercase">Recovery</p>
                  <p className="text-sm font-bold font-mono text-txt-primary">{drawdown.recoverySignals} signals</p>
                </div>
              </div>
            </Card>
          )}

          {/* Quick stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <Card padding="sm">
              <p className="text-[9px] font-semibold text-txt-tertiary uppercase">Tracked</p>
              <p className="text-lg font-bold font-mono text-txt-primary">{signalHistory.length}</p>
            </Card>
            <Card padding="sm">
              <p className="text-[9px] font-semibold text-txt-tertiary uppercase">Resolved</p>
              <p className="text-lg font-bold font-mono text-info">{signalStats?.totalResolved ?? 0}</p>
            </Card>
          </div>
        </div>
      </div>

      {/* ── 30D Returns + Coin Table ── */}
      <div>
        <Card padding="lg">
          <h4 className="text-xs font-semibold text-txt-primary mb-3">30-Day Returns</h4>
          <div className="flex items-end gap-3 md:gap-6 h-40 overflow-x-auto scrollbar-none">
            {coins.map((coin) => {
              const maxAbs = Math.max(...coins.map((c) => Math.abs(c.change30d)), 1);
              const color = COIN_COLORS[coin.symbol] || "#ffffff";
              return (
                <div key={coin.symbol} className="min-w-[56px] md:min-w-0 flex-1 flex flex-col items-center gap-1">
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
                    <td className="p-3 text-right text-txt-secondary tabular-nums">{c.volatility30d.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Collapsible Details ── */}
      {historyHydrated && (
        <div className="space-y-3">
          {/* Resolution window selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-txt-dim">Resolve signals after:</span>
            <div className="flex items-center gap-0.5 bg-inset border border-border-default rounded-lg p-0.5">
              {(Object.keys(RES_WINDOW_LABELS) as ResolutionWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setResolutionWindow?.(w)}
                  className={`text-[9px] px-2 py-0.5 rounded transition-colors ${
                    resolutionWindow === w ? "bg-elevated text-txt-primary" : "text-txt-dim hover:text-txt-secondary"
                  }`}
                >
                  {RES_WINDOW_LABELS[w]}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Calibration */}
          {calibration.some((b) => b.total > 0) && (
            <Collapsible title="Confidence Calibration">
              <p className="text-[9px] text-txt-dim px-4 pt-3">Does confidence predict accuracy? Ideally, 80% confidence signals should be ~80% accurate.</p>
              <CalibrationChart buckets={calibration} />
            </Collapsible>
          )}

          {/* Per-Coin Breakdown */}
          {perCoin.length > 0 && (
            <Collapsible title="Per-Coin Accuracy">
              <div className="p-4 space-y-2">
                {perCoin.map((c) => (
                  <div key={c.coin} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-10" style={{ color: COIN_COLORS[c.coin] || "#CBD5E1" }}>{c.coin}</span>
                    <div className="flex-1">
                      <ProgressBar value={c.accuracy ?? 0} color={COIN_COLORS[c.coin] || "#00E5A8"} height="sm" showValue />
                    </div>
                    <span className="text-[10px] text-txt-dim w-20 text-right">
                      {c.correct}/{c.resolved} correct
                    </span>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Recent Signals Table */}
          {signalHistory.length > 0 && (
            <Collapsible title="Recent Signals" defaultOpen>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-[9px] text-txt-dim">Resolves after {RES_WINDOW_LABELS[resolutionWindow]}</span>
                <span className="text-[9px] text-txt-dim">Last 15 of {signalHistory.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-default text-txt-muted">
                      <th className="text-left p-2 font-medium">Time</th>
                      <th className="text-left p-2 font-medium">Coin</th>
                      <th className="text-left p-2 font-medium">Action</th>
                      <th className="text-right p-2 font-medium">Conf</th>
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
            </Collapsible>
          )}

          {/* Live Dimensions (BTC) */}
          {signalsData?.dimensions?.BTC && (
            <Collapsible title="Live Signal Dimensions (BTC)">
              <div className="p-4 flex flex-col gap-2">
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
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

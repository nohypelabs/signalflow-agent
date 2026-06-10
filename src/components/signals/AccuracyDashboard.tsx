"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AccuracyReport,
  AccuracyStats,
  CalibrationBucket,
} from "@/lib/strategy/accuracy-tracker";
import type { MarketRegime, SignalActionV2 } from "@/lib/strategy/signal-engine-v2/types";

// ── Stat Card ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  suffix,
  color,
  subtext,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="bg-surface-1 border border-border rounded-lg p-3">
      <div className="text-[10px] text-txt-dim uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-mono font-bold" style={{ color: color || "var(--accent-primary)" }}>
          {value}
        </span>
        {suffix && <span className="text-xs text-txt-dim">{suffix}</span>}
      </div>
      {subtext && <div className="text-[9px] text-txt-dim mt-1">{subtext}</div>}
    </div>
  );
}

// ── Win Rate Bar ─────────────────────────────────────────────

function WinRateBar({ winRate, total }: { winRate: number; total: number }) {
  const pct = Math.round(winRate * 100);
  const color = pct >= 60 ? "#00E5A8" : pct >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono w-12 text-right" style={{ color }}>
        {pct}%
      </span>
      <span className="text-[9px] text-txt-dim w-10 text-right">
        ({total})
      </span>
    </div>
  );
}

// ── Regime Badge ─────────────────────────────────────────────

const REGIME_COLORS: Record<MarketRegime, string> = {
  TRENDING_UP: "#00E5A8",
  TRENDING_DOWN: "#EF4444",
  RANGING: "#F59E0B",
  VOLATILE: "#F97316",
  BREAKOUT: "#8B5CF6",
};

const REGIME_ICONS: Record<MarketRegime, string> = {
  TRENDING_UP: "↗",
  TRENDING_DOWN: "↘",
  RANGING: "↔",
  VOLATILE: "⚡",
  BREAKOUT: "💥",
};

// ── Main Component ───────────────────────────────────────────

interface Props {
  report?: AccuracyReport | null;
  loading?: boolean;
}

export default function AccuracyDashboard({ report, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-txt-dim">
        <div className="animate-pulse">Loading accuracy data...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-txt-dim gap-2">
        <span className="text-2xl">📊</span>
        <span className="text-sm">No signal history yet</span>
        <span className="text-xs">Signals will be tracked as they generate</span>
      </div>
    );
  }

  const { overall, byRegime, bySetup, byAction, rolling30d } = report;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-txt-primary">Signal Accuracy</h3>
        <span className="text-[9px] text-txt-dim">
          Updated {new Date(report.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      {/* ── Overall Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          label="Win Rate"
          value={Math.round(overall.winRate * 100)}
          suffix="%"
          color={overall.winRate >= 0.6 ? "#00E5A8" : overall.winRate >= 0.5 ? "#F59E0B" : "#EF4444"}
          subtext={`${overall.wins}W / ${overall.losses}L of ${overall.resolved} resolved`}
        />
        <StatCard
          label="Profit Factor"
          value={overall.profitFactor === Infinity ? "∞" : overall.profitFactor.toFixed(2)}
          color={overall.profitFactor >= 1.5 ? "#00E5A8" : overall.profitFactor >= 1 ? "#F59E0B" : "#EF4444"}
          subtext={`Avg win: +${overall.avgWinPnl.toFixed(2)}% / Avg loss: -${overall.avgLossPnl.toFixed(2)}%`}
        />
        <StatCard
          label="Expectancy"
          value={`${overall.expectancy >= 0 ? "+" : ""}${overall.expectancy.toFixed(2)}`}
          suffix="%"
          color={overall.expectancy >= 0 ? "#00E5A8" : "#EF4444"}
          subtext="Expected PnL per signal"
        />
        <StatCard
          label="Total Signals"
          value={overall.totalSignals}
          subtext={`${overall.resolved} resolved, ${overall.timeouts} timeouts`}
        />
      </div>

      {/* ── Rolling 30-Day ── */}
      <div className="bg-surface-1 border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-txt-secondary">Rolling 30-Day Performance</span>
          <span className="text-[9px] text-txt-dim">{rolling30d.totalSignals} signals</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] text-txt-dim">Win Rate</div>
            <div className="text-lg font-mono font-bold" style={{
              color: rolling30d.winRate >= 0.6 ? "#00E5A8" : rolling30d.winRate >= 0.5 ? "#F59E0B" : "#EF4444"
            }}>
              {Math.round(rolling30d.winRate * 100)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-txt-dim">Profit Factor</div>
            <div className="text-lg font-mono font-bold text-txt-primary">
              {rolling30d.profitFactor === Infinity ? "∞" : rolling30d.profitFactor.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-txt-dim">Expectancy</div>
            <div className="text-lg font-mono font-bold" style={{
              color: rolling30d.expectancy >= 0 ? "#00E5A8" : "#EF4444"
            }}>
              {rolling30d.expectancy >= 0 ? "+" : ""}{rolling30d.expectancy.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* ── By Regime ── */}
      <div className="bg-surface-1 border border-border rounded-lg p-3">
        <div className="text-xs font-semibold text-txt-secondary mb-2">Accuracy by Market Regime</div>
        <div className="flex flex-col gap-1.5">
          {byRegime.filter((r) => r.stats.totalSignals > 0).map((r) => (
            <div key={r.regime} className="flex items-center gap-2">
              <div className="w-24 flex items-center gap-1">
                <span style={{ color: REGIME_COLORS[r.regime] }}>{REGIME_ICONS[r.regime]}</span>
                <span className="text-[10px] font-mono text-txt-secondary">
                  {r.regime.replace("_", " ")}
                </span>
              </div>
              <WinRateBar winRate={r.stats.winRate} total={r.stats.resolved} />
            </div>
          ))}
        </div>
      </div>

      {/* ── By Setup Type ── */}
      <div className="bg-surface-1 border border-border rounded-lg p-3">
        <div className="text-xs font-semibold text-txt-secondary mb-2">Accuracy by Setup Type</div>
        <div className="flex flex-col gap-1.5">
          {bySetup.filter((s) => s.stats.totalSignals > 0).map((s) => (
            <div key={s.setupType} className="flex items-center gap-2">
              <div className="w-28 text-[10px] font-mono text-txt-secondary truncate">
                {s.setupType.replace("_", " ")}
              </div>
              <WinRateBar winRate={s.stats.winRate} total={s.stats.resolved} />
            </div>
          ))}
        </div>
      </div>

      {/* ── By Action ── */}
      <div className="bg-surface-1 border border-border rounded-lg p-3">
        <div className="text-xs font-semibold text-txt-secondary mb-2">Accuracy by Signal Action</div>
        <div className="flex flex-col gap-1.5">
          {(["STRONG_LONG", "LONG", "WEAK_LONG", "WEAK_SHORT", "SHORT", "STRONG_SHORT"] as SignalActionV2[])
            .filter((a) => byAction[a]?.totalSignals > 0)
            .map((action) => (
              <div key={action} className="flex items-center gap-2">
                <div className="w-20 text-[10px] font-mono text-txt-secondary">
                  {action.replace("_", " ")}
                </div>
                <WinRateBar winRate={byAction[action].winRate} total={byAction[action].resolved} />
              </div>
            ))}
        </div>
      </div>

      {/* ── Streak Info ── */}
      <div className="flex gap-2">
        <div className="flex-1 bg-surface-1 border border-border rounded-lg p-2 text-center">
          <div className="text-[10px] text-txt-dim">Max Win Streak</div>
          <div className="text-lg font-mono font-bold text-green-400">
            {overall.maxConsecutiveWins}
          </div>
        </div>
        <div className="flex-1 bg-surface-1 border border-border rounded-lg p-2 text-center">
          <div className="text-[10px] text-txt-dim">Max Loss Streak</div>
          <div className="text-lg font-mono font-bold text-red-400">
            {overall.maxConsecutiveLosses}
          </div>
        </div>
      </div>
    </div>
  );
}

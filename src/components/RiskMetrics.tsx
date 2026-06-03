"use client";

import type { AnalyticsSummary } from "@/lib/utils/analytics";
import { TRADING_TYPES } from "@/lib/types/trading-type";

interface Props {
  analytics: AnalyticsSummary;
}

function MetricCard({
  label,
  value,
  suffix,
  color,
  tooltip,
}: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  tooltip?: string;
}) {
  return (
    <div
      className="rounded-xl border border-border-default bg-card px-4 py-3"
      title={tooltip}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-1">
        {label}
      </p>
      <p className={`text-lg font-mono font-bold ${color ?? "text-txt-primary"}`}>
        {value}
        {suffix && <span className="text-xs font-normal text-txt-muted ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

export default function RiskMetrics({ analytics }: Props) {
  const {
    totalTrades,
    winRate,
    sharpe,
    sortino,
    maxDrawdownPct,
    calmar,
    expectancy: exp,
    kellyFraction,
    profitFactorValue,
    avgHoldHours,
    consecutive,
    byType,
    byPair,
  } = analytics;

  const formatNum = (n: number, decimals = 2) => {
    if (!isFinite(n)) return "∞";
    if (isNaN(n)) return "—";
    return n.toFixed(decimals);
  };

  const streakColor =
    consecutive.streakType === "win"
      ? "text-buy"
      : consecutive.streakType === "loss"
        ? "text-sell"
        : "text-txt-muted";

  return (
    <div className="space-y-4">
      {/* Top KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Sharpe Ratio"
          value={formatNum(sharpe)}
          color={sharpe > 1 ? "text-buy" : sharpe < 0 ? "text-sell" : "text-txt-primary"}
          tooltip="Risk-adjusted return (>1 is good)"
        />
        <MetricCard
          label="Sortino Ratio"
          value={formatNum(sortino)}
          color={sortino > 1.5 ? "text-buy" : sortino < 0 ? "text-sell" : "text-txt-primary"}
          tooltip="Downside risk-adjusted return"
        />
        <MetricCard
          label="Max Drawdown"
          value={`${(maxDrawdownPct * 100).toFixed(1)}%`}
          color="text-sell"
          tooltip="Largest peak-to-trough decline"
        />
        <MetricCard
          label="Calmar Ratio"
          value={formatNum(calmar)}
          color={calmar > 1 ? "text-buy" : calmar < 0 ? "text-sell" : "text-txt-primary"}
          tooltip="Annualized return / max drawdown"
        />
      </div>

      {/* Second KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Expectancy"
          value={`$${formatNum(exp)}`}
          color={exp > 0 ? "text-buy" : "text-sell"}
          tooltip="Expected profit per trade"
        />
        <MetricCard
          label="Kelly Fraction"
          value={`${(kellyFraction * 100).toFixed(1)}%`}
          color={kellyFraction > 0 ? "text-accent" : "text-txt-muted"}
          tooltip="Optimal bet size (fraction of bankroll)"
        />
        <MetricCard
          label="Profit Factor"
          value={formatNum(profitFactorValue)}
          color={profitFactorValue > 1.5 ? "text-buy" : profitFactorValue < 1 ? "text-sell" : "text-txt-primary"}
          tooltip="Gross profit / gross loss"
        />
        <MetricCard
          label="Avg Hold Time"
          value={avgHoldHours < 1 ? `${(avgHoldHours * 60).toFixed(0)}` : formatNum(avgHoldHours, 1)}
          suffix={avgHoldHours < 1 ? "min" : "hrs"}
          tooltip="Average trade duration"
        />
      </div>

      {/* Streak + Win Rate */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border-default bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-2">
            Current Streak
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-bold ${streakColor}`}>
              {consecutive.currentStreak}
            </span>
            <span className={`text-xs font-medium ${streakColor}`}>
              {consecutive.streakType === "win"
                ? "wins"
                : consecutive.streakType === "loss"
                  ? "losses"
                  : "—"}
            </span>
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-txt-muted">
            <span>Best win streak: <b className="text-buy">{consecutive.maxWins}</b></span>
            <span>Worst loss streak: <b className="text-sell">{consecutive.maxLosses}</b></span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-2">
            Win Rate
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-txt-primary">
              {(winRate * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-txt-muted">of {totalTrades} trades</span>
          </div>
          {/* Win rate bar */}
          <div className="mt-2 h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-buy transition-all duration-500"
              style={{ width: `${winRate * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* By Trading Type */}
      {Object.keys(byType).length > 0 && (
        <div className="rounded-xl border border-border-default bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-3">
            Performance by Type
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(byType).map(([type, stats]) => {
              const config = TRADING_TYPES[type as keyof typeof TRADING_TYPES];
              return (
                <div
                  key={type}
                  className="rounded-lg bg-elevated/50 px-3 py-2"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {config?.icon && <config.icon size={12} className="text-txt-muted" />}
                    <span className="text-[11px] font-semibold text-txt-primary capitalize">
                      {type}
                    </span>
                  </div>
                  <p className="text-[11px] text-txt-muted">
                    {stats.wins + stats.losses} trades · {(stats.rate * 100).toFixed(0)}% win
                  </p>
                  <p
                    className={`text-xs font-mono font-semibold ${
                      stats.pnl >= 0 ? "text-buy" : "text-sell"
                    }`}
                  >
                    {stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Pair */}
      {Object.keys(byPair).length > 1 && (
        <div className="rounded-xl border border-border-default bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-3">
            Performance by Pair
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(byPair)
              .sort(([, a], [, b]) => b.pnl - a.pnl)
              .map(([pair, stats]) => (
                <div key={pair} className="rounded-lg bg-elevated/50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-txt-primary mb-1">{pair}</p>
                  <p className="text-[11px] text-txt-muted">
                    {stats.wins + stats.losses} trades · {(stats.rate * 100).toFixed(0)}% win
                  </p>
                  <p
                    className={`text-xs font-mono font-semibold ${
                      stats.pnl >= 0 ? "text-buy" : "text-sell"
                    }`}
                  >
                    {stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

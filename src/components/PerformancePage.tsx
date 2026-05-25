"use client";

import { usePerformance } from "@/lib/use-performance";
import { useSignals } from "@/lib/use-signals";
import type { RecordedSignal } from "@/lib/use-signal-history";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/ui/PageHeader";
import ProgressBar from "@/components/ui/ProgressBar";

const COIN_COLORS: Record<string, string> = {
  BTC: "var(--color-hold)",
  ETH: "var(--color-info)",
  SOL: "var(--accent-primary)",
};

const COIN_HEX: Record<string, string> = {
  BTC: "#ff8800",
  ETH: "#00d4ff",
  SOL: "#7b2fff",
};

interface Props {
  signalHistory?: RecordedSignal[];
  signalStats?: { totalResolved: number; totalCorrect: number; accuracy: number | null };
  historyHydrated?: boolean;
}

export default function PerformancePage({ signalHistory = [], signalStats, historyHydrated = true }: Props) {
  const { coins, loading, error } = usePerformance();
  const { data: signalsData } = useSignals();

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Performance Analytics" badge={{ variant: "accent", label: "LIVE DATA" }} />
        <Card padding="lg">
          <div className="space-y-3">
            <Skeleton variant="table-row" />
            <Skeleton variant="table-row" />
            <Skeleton variant="table-row" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Performance Analytics" badge={{ variant: "accent", label: "LIVE DATA" }} />
        <Card padding="lg">
          <p className="text-sm text-error">{error}</p>
        </Card>
      </div>
    );
  }

  const avgChange24h = coins.length ? coins.reduce((s, c) => s + c.change24h, 0) / coins.length : 0;
  const avgChange30d = coins.length ? coins.reduce((s, c) => s + c.change30d, 0) / coins.length : 0;
  const avgVolatility = coins.length ? coins.reduce((s, c) => s + c.volatility30d, 0) / coins.length : 0;

  const metrics = [
    { label: "Avg 24H Change", value: `${avgChange24h >= 0 ? "+" : ""}${avgChange24h.toFixed(1)}%`, color: avgChange24h >= 0 ? "var(--color-buy)" : "var(--color-sell)" },
    { label: "Avg 30D Return", value: `${avgChange30d >= 0 ? "+" : ""}${avgChange30d.toFixed(1)}%`, color: avgChange30d >= 0 ? "var(--color-buy)" : "var(--color-sell)" },
    { label: "Avg Volatility", value: `${avgVolatility.toFixed(1)}%`, color: "var(--accent-primary)" },
    { label: "Tracked Coins", value: String(coins.length), color: "var(--color-info)" },
  ];

  const monthlyBars = coins.map((coin) => {
    const color = COIN_HEX[coin.symbol] || "#ffffff";
    return {
      label: coin.symbol,
      change30d: coin.change30d,
      change7d: coin.change7d,
      color,
      price: coin.price,
      high30d: coin.high30d,
      low30d: coin.low30d,
    };
  });

  const maxAbsChange = Math.max(...monthlyBars.map((b) => Math.abs(b.change30d)), 1);

  return (
    <div className="space-y-4">
      <PageHeader title="Performance Analytics" badge={{ variant: "accent", label: "LIVE DATA" }} />

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} padding="sm" accent={m.color}>
            <p className="text-[10px] text-txt-muted mb-1 uppercase tracking-wider">{m.label}</p>
            <p className="text-xl font-bold font-mono tabular-nums" style={{ color: m.color }}>{m.value}</p>
          </Card>
        ))}
      </div>

      {/* Signal Accuracy */}
      {historyHydrated && signalHistory.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-sm">Signal Accuracy</h3>
            <Badge variant="live" size="sm">LOCAL TRACKING</Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card variant="inset" padding="sm">
              <p className="text-[10px] text-txt-muted">Signals Tracked</p>
              <p className="text-lg font-bold font-mono text-txt-primary">{signalHistory.length}</p>
            </Card>
            <Card variant="inset" padding="sm">
              <p className="text-[10px] text-txt-muted">Resolved</p>
              <p className="text-lg font-bold font-mono text-info">{signalStats?.totalResolved ?? 0}</p>
            </Card>
            <Card variant="inset" padding="sm">
              <p className="text-[10px] text-txt-muted">Correct</p>
              <p className="text-lg font-bold font-mono text-buy">{signalStats?.totalCorrect ?? 0}</p>
            </Card>
            <Card variant="inset" padding="sm">
              <p className="text-[10px] text-txt-muted">Accuracy</p>
              <p className="text-lg font-bold font-mono" style={{
                color: (signalStats?.accuracy ?? 0) >= 60 ? "var(--color-buy)" : (signalStats?.accuracy ?? 0) >= 40 ? "var(--color-hold)" : "var(--color-sell)"
              }}>
                {signalStats?.accuracy != null ? `${signalStats.accuracy.toFixed(0)}%` : "—"}
              </p>
            </Card>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-default text-txt-muted">
                  <th className="text-left p-2 font-medium">Time</th>
                  <th className="text-left p-2 font-medium">Coin</th>
                  <th className="text-left p-2 font-medium">Action</th>
                  <th className="text-right p-2 font-medium">Confidence</th>
                  <th className="text-right p-2 font-medium">Entry Price</th>
                  <th className="text-right p-2 font-medium">Current</th>
                  <th className="text-center p-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {signalHistory.slice(0, 20).map((s) => (
                  <tr key={s.id} className="border-b border-border-default hover:bg-elevated">
                    <td className="p-2 text-txt-tertiary">
                      {new Date(s.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-2 font-semibold" style={{ color: COIN_COLORS[s.coin] || "var(--text-primary)" }}>{s.coin}</td>
                    <td className="p-2">
                      <Badge variant={s.action.toLowerCase()} size="sm">{s.action}</Badge>
                    </td>
                    <td className="p-2 text-right text-txt-primary tabular-nums">{s.confidence}%</td>
                    <td className="p-2 text-right text-txt-secondary font-mono">${s.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right text-txt-secondary font-mono">
                      {s.resolved ? `$${s.resolved.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Pending"}
                    </td>
                    <td className="p-2 text-center">
                      {s.resolved ? (
                        s.resolved.correct ? (
                          <Badge variant="live" size="sm">✓</Badge>
                        ) : (
                          <Badge variant="error" size="sm">✗</Badge>
                        )
                      ) : (
                        <span className="text-[10px] text-txt-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {signalHistory.length > 20 && (
            <p className="text-[10px] text-txt-muted mt-2">Showing last 20 of {signalHistory.length} signals</p>
          )}
          <p className="text-[10px] text-txt-dim mt-3">
            Signals resolve automatically 1 hour after generation — BUY correct if price rises, SELL correct if price falls.
          </p>
        </Card>
      )}

      {/* Per-coin bar chart */}
      <Card padding="lg">
        <h3 className="font-semibold text-sm mb-4">30-Day Returns (SoSoValue)</h3>
        <div className="flex items-end gap-8 h-48">
          {monthlyBars.map((b) => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-txt-muted font-mono">${b.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className={`text-xs font-bold tabular-nums ${b.change30d >= 0 ? "text-buy" : "text-sell"}`}>
                {b.change30d >= 0 ? "+" : ""}{b.change30d.toFixed(1)}%
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${(Math.abs(b.change30d) / maxAbsChange) * 100}%`,
                  backgroundColor: b.color,
                  opacity: 0.7,
                  minHeight: "8px",
                }}
              />
              <span className="text-xs font-semibold" style={{ color: b.color }}>{b.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Coin detail table */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 pb-0">
          <h3 className="font-semibold text-sm mb-3">Coin Details</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-t border-border-default text-txt-muted text-xs">
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
                <td className="p-3 text-right text-txt-primary font-mono">${c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`p-3 text-right font-semibold tabular-nums ${c.change24h >= 0 ? "text-buy" : "text-sell"}`}>
                  {c.change24h >= 0 ? "+" : ""}{c.change24h.toFixed(1)}%
                </td>
                <td className={`p-3 text-right font-semibold tabular-nums ${c.change7d >= 0 ? "text-buy" : "text-sell"}`}>
                  {c.change7d >= 0 ? "+" : ""}{c.change7d.toFixed(1)}%
                </td>
                <td className={`p-3 text-right font-semibold tabular-nums ${c.change30d >= 0 ? "text-buy" : "text-sell"}`}>
                  {c.change30d >= 0 ? "+" : ""}{c.change30d.toFixed(1)}%
                </td>
                <td className="p-3 text-right text-txt-secondary font-mono">${c.high30d.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-txt-secondary font-mono">${c.low30d.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-accent tabular-nums">{c.volatility30d.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Live dimensions */}
      {signalsData?.dimensions?.BTC && (
        <Card padding="lg">
          <h3 className="font-semibold text-sm mb-3">Live Signal Dimensions (BTC)</h3>
          <div className="flex flex-col gap-2">
            {[
              { key: "etfFlow" as const, label: "ETF Flow", color: "var(--dim-etf)" },
              { key: "sentiment" as const, label: "Sentiment", color: "var(--dim-sentiment)" },
              { key: "macro" as const, label: "Macro", color: "var(--dim-macro)" },
              { key: "momentum" as const, label: "Momentum", color: "var(--dim-momentum)" },
              { key: "treasury" as const, label: "Treasury", color: "var(--dim-treasury)" },
            ].map((d) => {
              const dim = signalsData.dimensions.BTC[d.key];
              return (
                <div key={d.key}>
                  <ProgressBar
                    value={dim.score}
                    color={d.color}
                    height="md"
                    label={d.label}
                    showValue
                  />
                  <p className="text-[10px] text-txt-dim mt-0.5 ml-[7.5rem]">{dim.detail}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

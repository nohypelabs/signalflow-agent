"use client";

import { Signal } from "@/lib/mock-data";
import type { SignalDimensions } from "@/lib/use-signals";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import ProgressBar from "@/components/ui/ProgressBar";
import EmptyState from "@/components/ui/EmptyState";

const dimLabels: { key: keyof Signal["dimensions"]; label: string; color: string }[] = [
  { key: "etfFlow", label: "ETF Flow", color: "#00d4ff" },
  { key: "sentiment", label: "Sentiment", color: "#7b2fff" },
  { key: "macro", label: "Macro", color: "#00ff88" },
  { key: "momentum", label: "Momentum", color: "#ff8800" },
  { key: "treasury", label: "Treasury", color: "#ff4488" },
];

interface Props {
  signal: Signal | null;
  liveDims?: SignalDimensions | null;
}

export default function AIReasoning({ signal, liveDims }: Props) {
  if (!signal) {
    return (
      <Card padding="lg">
        <EmptyState title="Select a signal" description="Choose a signal to view AI reasoning and execution plan" />
      </Card>
    );
  }

  const hasLive = liveDims !== undefined && liveDims !== null;

  return (
    <Card padding="lg" className="animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-semibold text-sm">
          {hasLive ? "Live Signal Data" : "AI Reasoning"}
        </h3>
        <Badge variant={signal.action.toLowerCase()} size="md">{signal.action}</Badge>
        <span className="text-sm text-txt-primary">{signal.pair}</span>
        {hasLive && (
          <span className="flex items-center gap-1.5">
            <StatusDot status="live" size="sm" />
            <Badge variant="live" size="sm">LIVE</Badge>
          </span>
        )}
        <Badge variant="accent" size="sm" className="ml-auto">
          {hasLive ? "SoSoValue" : "AI Generated"}
        </Badge>
        <span className="text-xs text-txt-muted">{signal.timeAgo}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-xs text-txt-tertiary mb-1">Signal Thesis</p>
          <Card variant="inset" padding="md" className="border-l-2 border-l-accent">
            <p className="text-sm text-txt-secondary leading-relaxed">
              &ldquo;{signal.reasoning}&rdquo;
            </p>
          </Card>

          <div className="mt-4">
            <p className="text-xs text-txt-tertiary mb-2">
              {hasLive ? "Live Dimensions (SoSoValue)" : "Signal Dimensions"}
            </p>
            <div className="flex flex-col gap-2">
              {dimLabels.map((d) => {
                const score = hasLive ? liveDims[d.key].score : signal.dimensions[d.key];
                const detail =
                  (hasLive ? liveDims[d.key].detail : null) ??
                  signal.dimensionDetails?.[d.key]?.detail ??
                  null;
                return (
                  <div key={d.key}>
                    <ProgressBar
                      value={score}
                      color={d.color}
                      height="md"
                      label={d.label}
                      showValue
                    />
                    {detail && (
                      <p className="text-[10px] text-txt-dim mt-0.5 ml-[5.5rem] leading-relaxed">
                        {detail}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-txt-tertiary mb-2">Trade Execution Plan</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Order Type", value: signal.execution.orderType, color: "text-accent" },
              {
                label: "Entry Price",
                value: `$${signal.execution.entry.toLocaleString()}`,
                color: "text-txt-primary",
              },
              {
                label: "Take Profit",
                value:
                  signal.execution.takeProfit > 0
                    ? `$${signal.execution.takeProfit.toLocaleString()}`
                    : "—",
                color: "text-buy",
              },
              {
                label: "Stop Loss",
                value:
                  signal.execution.stopLoss > 0
                    ? `$${signal.execution.stopLoss.toLocaleString()}`
                    : "—",
                color: "text-sell",
              },
              { label: "Position Size", value: signal.execution.positionSize, color: "text-txt-primary" },
              { label: "Risk/Reward", value: signal.execution.riskReward, color: "text-buy" },
            ].map((item) => (
              <Card key={item.label} variant="inset" padding="sm">
                <p className="text-[10px] text-txt-muted">{item.label}</p>
                <p className={`text-xs font-semibold mt-0.5 ${item.color}`}>
                  {item.value}
                </p>
              </Card>
            ))}
          </div>

          <p className="text-xs text-txt-tertiary mt-4 mb-2">Data Sources Used</p>
          <div className="flex flex-wrap gap-1.5">
            {signal.sources.map((src) => (
              <Badge key={src} variant="muted" size="sm">{src}</Badge>
            ))}
          </div>
        </div>
      </div>

      <Card variant="ghost" padding="sm" className="mt-4 bg-background border border-border-strong">
        <p className="text-[10px] text-txt-muted font-mono">
          Signal generated: {new Date().toISOString().slice(0, 19)}Z | Confidence:{" "}
          {signal.confidence}% | Dimensions: 5 scored | SoSoValue API calls:{" "}
          {signal.sources.length}
        </p>
      </Card>
    </Card>
  );
}

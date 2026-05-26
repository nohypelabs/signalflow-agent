"use client";

import { useState } from "react";
import { signals, Signal } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { SignalDimensions } from "@/lib/hooks/useSignals";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";
import ProgressBar from "@/components/ui/ProgressBar";
import PageHeader from "@/components/ui/PageHeader";

const actionMeta: Record<Signal["action"], { bg: string; border: string; text: string; accent: string; label: string }> = {
  BUY: { bg: "bg-[#0d2a1a]", border: "border-buy-dim", text: "text-buy", accent: "var(--color-buy)", label: "Bullish — Buy" },
  SELL: { bg: "bg-[#2a0d0d]", border: "border-sell-dim", text: "text-sell", accent: "var(--color-sell)", label: "Bearish — Sell" },
  HOLD: { bg: "bg-[#1a1a0d]", border: "border-hold-dim", text: "text-hold", accent: "var(--color-hold)", label: "Neutral — Hold" },
};

const dimLabels = [
  { key: "etfFlow" as const, label: "ETF Flow", color: "var(--dim-etf)", hex: "#00d4ff", icon: "📊" },
  { key: "sentiment" as const, label: "Sentiment", color: "var(--dim-sentiment)", hex: "#7b2fff", icon: "📰" },
  { key: "macro" as const, label: "Macro", color: "var(--dim-macro)", hex: "#00ff88", icon: "🌐" },
  { key: "momentum" as const, label: "Momentum", color: "var(--dim-momentum)", hex: "#ff8800", icon: "📈" },
  { key: "treasury" as const, label: "Treasury", color: "var(--dim-treasury)", hex: "#ff4488", icon: "🏛️" },
];

function actionRationale(signal: Signal): string[] {
  const points: string[] = [];
  const dims = signal.dimensions;
  const details = signal.dimensionDetails;

  if (dims.etfFlow >= 80) points.push(details?.etfFlow?.detail || `ETF inflows strong at score ${dims.etfFlow}/100 — institutional capital rotating in`);
  else if (dims.etfFlow < 50) points.push(details?.etfFlow?.detail || `ETF flows weakening at score ${dims.etfFlow}/100 — institutional demand softening`);

  if (dims.sentiment >= 80) points.push(details?.sentiment?.detail || `News sentiment highly bullish at ${dims.sentiment}/100 — media & social aligned positive`);
  else if (dims.sentiment < 50) points.push(details?.sentiment?.detail || `Sentiment bearish at ${dims.sentiment}/100 — negative headlines dominating`);

  if (dims.momentum >= 80) points.push(details?.momentum?.detail || `Price momentum strong at ${dims.momentum}/100 — trend is your friend`);
  else if (dims.momentum < 45) points.push(details?.momentum?.detail || `Momentum weakening at ${dims.momentum}/100 — price action deteriorating`);

  if (dims.macro >= 75) points.push(details?.macro?.detail || `Macro backdrop supportive at ${dims.macro}/100 — risk-on environment`);
  else if (dims.macro < 50) points.push(details?.macro?.detail || `Macro headwinds at ${dims.macro}/100 — caution warranted`);

  if (dims.treasury >= 70) points.push(details?.treasury?.detail || `Institutional treasury adoption at ${dims.treasury}/100 — smart money accumulating`);
  else if (dims.treasury < 50) points.push(details?.treasury?.detail || `Treasury data muted at ${dims.treasury}/100 — no strong institutional signal`);

  return points;
}

interface Props {
  tickers?: SoDEXTicker[] | null;
  liveDims?: Record<string, SignalDimensions> | null;
  overallScores?: Record<string, number> | null;
  weights?: Record<string, Record<string, number>> | null;
  cappedDims?: Record<string, string[]> | null;
}

export default function SignalsPage({ tickers, liveDims, overallScores, weights, cappedDims }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="All Signals" badge={{ variant: "live", label: "LIVE PRICES" }} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {signals.map((s) => {
          const meta = actionMeta[s.action];
          const sodSym = pairToSodexSymbol(s.pair);
          const live = sodSym ? tickerMap.get(sodSym) : undefined;
          const price = live ? parseFloat(live.lastPx) : s.price;
          const chg = live ? live.changePct : s.change24h;
          const isOpen = expanded.has(s.id);
          const coin = s.pair.split("/")[0];
          const dimDetails = liveDims?.[coin];
          const rationale = actionRationale(s);

          return (
            <div key={s.id} className={`${meta.bg} ${meta.border} border rounded-xl overflow-hidden`}>
              {/* Header */}
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-txt-primary">{s.pair}</span>
                    <Badge variant={s.action.toLowerCase()} size="md">{s.action}</Badge>
                    {live && <Badge variant="live" size="sm">LIVE</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceGauge value={s.confidence} size="sm" />
                    <div className="text-right">
                      <span className="text-sm text-txt-primary font-semibold font-mono">
                        ${typeof price === "number" ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price}
                      </span>
                      <span className={`text-xs ml-2 ${chg >= 0 ? "text-buy" : "text-sell"}`}>
                        {chg >= 0 ? "+" : ""}{typeof chg === "number" ? chg.toFixed(1) : chg}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main reasoning */}
                <p className="text-sm text-txt-secondary leading-relaxed mb-4">{s.reasoning}</p>

                {/* Dimension bars */}
                <div className="flex flex-col gap-1.5 mb-4">
                  {dimLabels.map((d) => {
                    const liveScore = dimDetails?.[d.key]?.score;
                    const liveDetail = dimDetails?.[d.key]?.detail;
                    const score = liveScore ?? s.dimensions[d.key];
                    const detail = liveDetail || s.dimensionDetails?.[d.key]?.detail;
                    const coinWeights = weights?.[coin];
                    const coinCapped = cappedDims?.[coin];
                    const weight = coinWeights?.[d.key];
                    const isCapped = coinCapped?.includes(d.key);

                    return (
                      <div key={d.key} className="flex items-center gap-2">
                        <ProgressBar value={score} color={d.hex} height="sm" label={d.label} showValue />
                        {weight != null && (
                          <span className="text-[10px] w-8 text-right text-txt-muted tabular-nums">{weight}%</span>
                        )}
                        {isCapped && (
                          <Badge variant="error" size="sm" className="text-[8px]">CAP</Badge>
                        )}
                        {detail && (
                          <span className="text-[10px] text-txt-dim hidden lg:block w-48 truncate" title={detail}>
                            {detail}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Confidence + overall + toggle */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-txt-muted">
                      Confidence: <span className="font-bold" style={{ color: meta.accent }}>{s.confidence}%</span>
                    </span>
                    {overallScores?.[coin] != null && (
                      <span className="text-[10px] text-txt-muted">
                        Overall: <span className="font-bold text-info">{overallScores[coin]}/100</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggle(s.id)}
                    className="text-[10px] text-accent hover:opacity-80"
                  >
                    {isOpen ? "Hide Analysis" : "Show Analysis"}
                  </button>
                </div>
              </div>

              {/* Expanded analysis */}
              {isOpen && (
                <div className="border-t border-border-default p-5 space-y-4 bg-[#00000020] animate-fade-in">
                  {/* Why this signal */}
                  <div>
                    <h4 className="text-xs font-semibold text-txt-primary mb-2" style={{ color: meta.accent }}>
                      Why {s.action}?
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dimLabels.map((d) => {
                        const liveScore = dimDetails?.[d.key]?.score;
                        const liveDetail = dimDetails?.[d.key]?.detail;
                        const score = liveScore ?? s.dimensions[d.key];
                        const detail = liveDetail || s.dimensionDetails?.[d.key]?.detail || `Score: ${score}/100`;
                        const coinWeights = weights?.[coin];
                        const coinCapped = cappedDims?.[coin];
                        const weight = coinWeights?.[d.key];
                        const isCapped = coinCapped?.includes(d.key);

                        return (
                          <Card key={d.key} variant="inset" padding="sm">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs">{d.icon}</span>
                              <span className="text-[11px] font-semibold" style={{ color: d.hex }}>{d.label}</span>
                              {weight != null && (
                                <span className="text-[9px] text-txt-muted">wt: {weight}%</span>
                              )}
                              {isCapped && (
                                <Badge variant="error" size="sm" className="text-[8px]">CAP</Badge>
                              )}
                              <span className="text-[10px] font-bold ml-auto" style={{ color: d.hex }}>{score}/100</span>
                            </div>
                            <p className="text-[10px] text-txt-tertiary leading-relaxed">{detail}</p>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key rationales */}
                  {rationale.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-txt-primary mb-2">Key Factors</h4>
                      <ul className="space-y-1">
                        {rationale.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-txt-secondary">
                            <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Execution plan */}
                  {s.execution.orderType !== "No action" && (
                    <div>
                      <h4 className="text-xs font-semibold text-txt-primary mb-2">Execution Plan</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
                        <Card variant="inset" padding="sm">
                          <span className="text-txt-muted">Entry</span>
                          <p className="text-txt-primary font-mono font-semibold">${s.execution.entry.toLocaleString()}</p>
                        </Card>
                        <Card variant="inset" padding="sm">
                          <span className="text-txt-muted">Take Profit</span>
                          <p className="text-buy font-mono font-semibold">
                            {s.execution.takeProfit > 0 ? `$${s.execution.takeProfit.toLocaleString()}` : "—"}
                          </p>
                        </Card>
                        <Card variant="inset" padding="sm">
                          <span className="text-txt-muted">Stop Loss</span>
                          <p className="text-sell font-mono font-semibold">
                            {s.execution.stopLoss > 0 ? `$${s.execution.stopLoss.toLocaleString()}` : "—"}
                          </p>
                        </Card>
                        <Card variant="inset" padding="sm">
                          <span className="text-txt-muted">Position</span>
                          <p className="text-txt-primary font-semibold">{s.execution.positionSize}</p>
                        </Card>
                        <Card variant="inset" padding="sm">
                          <span className="text-txt-muted">Risk/Reward</span>
                          <p className="text-txt-primary font-semibold">{s.execution.riskReward}</p>
                        </Card>
                        <Card variant="inset" padding="sm">
                          <span className="text-txt-muted">Type</span>
                          <p className="text-accent font-semibold">{s.execution.orderType}</p>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-txt-dim">Data sources:</span>
                    {s.sources.map((src) => (
                      <Badge key={src} variant="muted" size="sm">{src}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Time */}
              <div className="px-5 pb-3">
                <span className="text-[10px] text-txt-dim">{s.timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

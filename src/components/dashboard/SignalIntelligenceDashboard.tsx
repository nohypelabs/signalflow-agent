"use client";

import { useState, useMemo } from "react";
import { Target, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Activity, BarChart3, Brain, Zap } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";
import LiveOrderbookFactor from "@/components/signals/LiveOrderbookRow";

// ── Helpers ──────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ── Types ────────────────────────────────────────────────────

interface Props {
  pair: string;
  onTradeSetup?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

function normalizePair(pair: string): string {
  return pair.replace(/^v/, "").replace(/_vUSDC$/, "/USDC").toUpperCase();
}

function actionFromSignal(signal: any): "LONG" | "SHORT" | "NO TRADE" {
  if (!signal) return "NO TRADE";
  const action = signal.actionV2 ?? signal.action ?? "HOLD";
  if (action === "STRONG_LONG" || action === "LONG" || action === "WEAK_LONG") return "LONG";
  if (action === "STRONG_SHORT" || action === "SHORT" || action === "WEAK_SHORT") return "SHORT";
  return "NO TRADE";
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function scoreColor(score: number): string {
  if (score >= 70) return "#00E5A8";
  if (score >= 55) return "#4ADE80";
  if (score >= 45) return "#F59E0B";
  if (score >= 35) return "#F97316";
  return "#EF4444";
}

function scoreStatus(score: number): "bullish" | "caution" | "neutral" | "bearish" {
  if (score >= 70) return "bullish";
  if (score >= 55) return "caution";
  if (score >= 45) return "neutral";
  return "bearish";
}

function statusIcon(status: string): string {
  switch (status) {
    case "bullish": return "✅";
    case "caution": return "⚠️";
    case "neutral": return "→";
    case "bearish": return "❌";
    default: return "→";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "bullish": return "text-buy";
    case "caution": return "text-hold";
    case "neutral": return "text-txt-secondary";
    case "bearish": return "text-sell";
    default: return "text-txt-secondary";
  }
}

// ── Component ────────────────────────────────────────────────

export default function SignalIntelligenceDashboard({ pair, onTradeSetup }: Props) {
  const d = useDashboard();
  const [showDetails, setShowDetails] = useState(false);

  const currentSignal = d.liveSignals.find((s) => normalizePair(s.pair) === normalizePair(pair)) ?? null;
  const aiSignal = d.aiSignal && normalizePair(d.aiSignal.pair) === normalizePair(pair) ? d.aiSignal : null;
  const signal = aiSignal ?? currentSignal;

  const action = actionFromSignal(signal);
  const confidence = signal ? clamp(Math.round(signal.confidence ?? 0), 0, 100) : 0;
  const coin = pair.split("/")[0];

  // Extract factor scores
  const factors = signal?.factors ?? [];
  const taFactors = factors.filter((f: any) => ["TREND", "MOMENTUM", "STRUCTURE"].includes(f.name));
  const microFactors = factors.filter((f: any) => ["ORDER_FLOW", "DEPTH", "FUNDING"].includes(f.name));
  const dimensions = signal?.dimensions;

  // Calculate component averages
  const taAvg = taFactors.length > 0
    ? Math.round(taFactors.reduce((s: number, f: any) => s + f.score, 0) / taFactors.length)
    : 50;
  const microAvg = microFactors.length > 0
    ? Math.round(microFactors.reduce((s: number, f: any) => s + f.score, 0) / microFactors.length)
    : 50;
  const macroAvg = dimensions
    ? Math.round(((dimensions.etfFlow ?? 50) + (dimensions.sentiment ?? 50) + (dimensions.macro ?? 50) + (dimensions.treasury ?? 50)) / 4)
    : 50;

  const taStatus = scoreStatus(taAvg);
  const microStatus = scoreStatus(microAvg);
  const macroStatus = scoreStatus(macroAvg);

  // Decision explanation
  const explanation = useMemo(() => {
    if (action === "NO TRADE") {
      if (taAvg >= 60 && macroAvg < 55) return "TA bullish but macro cooling. Wait for alignment.";
      if (taAvg < 55 && microAvg >= 60) return "Microstructure strong but TA not confirming.";
      if (confidence < 50) return "Insufficient conviction. Wait for clearer setup.";
      return "Factors not aligned enough for entry.";
    }
    if (action === "LONG") {
      return `Bullish confluence at ${confidence}%. Setup valid.`;
    }
    return `Bearish confluence at ${confidence}%. Short setup valid.`;
  }, [action, taAvg, microAvg, macroAvg, confidence]);

  // Win rate from reliability stats
  const accuracy = d.signalStats?.accuracy;
  const totalResolved = d.signalStats?.totalResolved ?? 0;

  return (
    <div className="space-y-3">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* LEVEL 1: DECISION (Always Visible, Prominent)          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card variant="default" padding="none" className="rounded-xl overflow-hidden border-accent/20 bg-inset/60">
        <div className="p-4 lg:p-5">
          {/* Signal header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-txt-primary">{pair} Signal Command</h2>
              <p className="text-xs text-txt-muted mt-0.5">{coin} perpetual on SoDEX</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[#0a2a3a] border border-[#00d4ff] px-2 py-0.5 text-[9px] font-bold text-[#00d4ff]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
              </span>
            </div>
          </div>

          {/* Decision display */}
          <div className="flex items-center gap-4">
            <div
              className={cx(
                "rounded-xl border-2 px-4 py-2 font-bold text-xl",
                action === "LONG" && "border-buy bg-buy/10 text-buy",
                action === "SHORT" && "border-sell bg-sell/10 text-sell",
                action === "NO TRADE" && "border-hold/50 bg-hold/10 text-hold",
              )}
            >
              {action === "NO TRADE" ? "⏸" : action === "LONG" ? "▲" : "▼"} {action}
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-txt-primary tabular-nums">
                {confidence}%
              </div>
              <div className="text-[10px] text-txt-muted uppercase">confidence</div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-txt-secondary">{explanation}</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 mt-4">
            {action !== "NO TRADE" ? (
              <button
                onClick={onTradeSetup}
                className="flex-1 h-11 rounded-lg border border-accent bg-accent text-sm font-bold text-black transition-all hover:bg-accent/90 active:scale-[0.98]"
              >
                Setup Trade →
              </button>
            ) : (
              <>
                <button
                  onClick={onTradeSetup}
                  className="flex-1 h-11 rounded-lg border border-border-default bg-elevated text-sm font-bold text-txt-primary transition-all hover:border-accent/40 hover:bg-accent-muted/20"
                >
                  Analyze Setup
                </button>
                <button
                  onClick={onTradeSetup}
                  className="h-11 px-4 rounded-lg border border-sell/30 bg-sell/5 text-sm font-medium text-sell transition-all hover:bg-sell/10"
                >
                  Setup Anyway
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LEVEL 2: WHY BREAKDOWN (Always Visible, Scannable)     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
        <div className="p-4 lg:p-5">
          <h3 className="text-sm font-semibold text-txt-secondary mb-3">Why {action}?</h3>

          {/* Component summaries */}
          <div className="space-y-3">
            {/* TA Component */}
            <div className="rounded-lg border border-border-default bg-inset/40 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-accent" />
                  <span className="text-xs font-semibold text-txt-primary">TA Component</span>
                </div>
                <span className={cx("text-xs font-mono font-bold", statusColor(taStatus))}>
                  {statusIcon(taStatus)} {taAvg}/100
                </span>
              </div>
              <div className="flex gap-2 text-[10px]">
                {taFactors.map((f: any) => (
                  <div key={f.name} className="flex items-center gap-1">
                    <span className={cx("font-medium", f.score >= 55 ? "text-buy" : f.score < 45 ? "text-sell" : "text-txt-secondary")}>
                      {f.name === "TREND" ? "Trend" : f.name === "MOMENTUM" ? "Momentum" : "Structure"} {f.score}
                    </span>
                    <span className={cx("text-[8px]", f.score >= 55 ? "text-buy" : f.score < 45 ? "text-sell" : "text-txt-dim")}>
                      {f.score >= 55 ? "↑" : f.score < 45 ? "↓" : "→"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Microstructure Component */}
            <div className="rounded-lg border border-border-default bg-inset/40 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-accent" />
                  <span className="text-xs font-semibold text-txt-primary">Microstructure</span>
                </div>
                <span className={cx("text-xs font-mono font-bold", statusColor(microStatus))}>
                  {statusIcon(microStatus)} {microAvg}/100
                </span>
              </div>
              <div className="flex gap-2 text-[10px]">
                {microFactors.map((f: any) => (
                  <div key={f.name} className="flex items-center gap-1">
                    <span className={cx("font-medium", f.score >= 55 ? "text-buy" : f.score < 45 ? "text-sell" : "text-txt-secondary")}>
                      {f.name === "ORDER_FLOW" ? "Flow" : f.name === "DEPTH" ? "Orderbook" : "Funding"} {f.score}
                    </span>
                    <span className={cx("text-[8px]", f.score >= 55 ? "text-buy" : f.score < 45 ? "text-sell" : "text-txt-dim")}>
                      {f.score >= 55 ? "↑" : f.score < 45 ? "↓" : "→"}
                    </span>
                  </div>
                ))}
                <LiveOrderbookFactor pair={pair} />
              </div>
            </div>

            {/* Macro Context */}
            {dimensions && (
              <div className="rounded-lg border border-border-default bg-inset/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-accent" />
                    <span className="text-xs font-semibold text-txt-primary">Macro Context</span>
                    <Badge variant="muted" size="sm">SoSoValue</Badge>
                  </div>
                  <span className={cx("text-xs font-mono font-bold", statusColor(macroStatus))}>
                    {statusIcon(macroStatus)} {macroAvg}/100
                  </span>
                </div>
                <div className="flex gap-2 text-[10px]">
                  {[
                    { key: "etfFlow", label: "ETF" },
                    { key: "sentiment", label: "News" },
                    { key: "macro", label: "Macro" },
                    { key: "treasury", label: "BTC" },
                  ].map(({ key, label }) => {
                    const score = Math.round(dimensions[key as keyof typeof dimensions] ?? 50);
                    return (
                      <div key={key} className="flex items-center gap-1">
                        <span className={cx("font-medium", score >= 55 ? "text-buy" : score < 45 ? "text-sell" : "text-txt-secondary")}>
                          {label} {score}
                        </span>
                        <span className={cx("text-[8px]", score >= 55 ? "text-buy" : score < 45 ? "text-sell" : "text-txt-dim")}>
                          {score >= 55 ? "↑" : score < 45 ? "↓" : "→"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Thesis */}
            {signal?.setup && (
              <div className="rounded-lg border border-border-default bg-inset/40 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="text-accent" />
                    <span className="text-xs font-semibold text-txt-primary">AI Thesis</span>
                    <Badge variant="info" size="sm">{signal.setup.label}</Badge>
                  </div>
                  {accuracy != null && totalResolved > 0 && (
                    <span className="text-[10px] font-mono text-txt-muted">
                      {accuracy.toFixed(0)}% historical win rate
                    </span>
                  )}
                </div>
                {signal.execution && (
                  <div className="flex gap-3 text-[10px] text-txt-secondary">
                    <span>Entry: <span className="font-mono font-bold">${signal.execution.entry?.toLocaleString()}</span></span>
                    <span>TP: <span className="font-mono font-bold text-buy">${signal.execution.takeProfit?.toLocaleString()}</span></span>
                    <span>SL: <span className="font-mono font-bold text-sell">${signal.execution.stopLoss?.toLocaleString()}</span></span>
                    <span>R:R: <span className="font-mono font-bold">{signal.execution.riskReward}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* WHY HOLD Explanation */}
            <div className="rounded-lg border border-hold/30 bg-hold/5 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={12} className="text-hold" />
                <span className="text-xs font-semibold text-hold">WHY {action}?</span>
              </div>
              <p className="text-xs text-txt-secondary">{explanation}</p>
            </div>

            {/* Signal Reliability */}
            {totalResolved > 0 && (
              <div className="flex items-center gap-3 text-[10px]">
                <Target size={10} className="text-accent" />
                <span className="text-txt-muted">Signal Reliability:</span>
                <span className={cx("font-mono font-bold", accuracy != null && accuracy >= 60 ? "text-buy" : accuracy != null && accuracy >= 45 ? "text-hold" : "text-sell")}>
                  {accuracy?.toFixed(1)}%
                </span>
                <span className="text-txt-dim">|</span>
                <span className="font-mono text-txt-secondary">{totalResolved} resolved</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LEVEL 3: DETAILED BREAKDOWN (Collapsed by Default)     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-border-default bg-inset/40 text-sm text-txt-secondary hover:bg-inset/60 transition-colors"
      >
        <span>View Full Breakdown</span>
        {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showDetails && (
        <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
          <div className="p-4 lg:p-5 space-y-4">
            {/* TA Details */}
            <div>
              <h4 className="text-xs font-semibold text-txt-tertiary uppercase tracking-wide mb-2">TA Component Details</h4>
              <div className="space-y-2">
                {taFactors.map((f: any) => (
                  <div key={f.name} className="rounded-lg border border-border-default bg-inset/30 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-txt-primary">
                        {f.name === "TREND" ? "Trend" : f.name === "MOMENTUM" ? "Momentum" : "Structure"}: {f.score}/100 {statusIcon(scoreStatus(f.score))}
                      </span>
                      <div className="flex-1 mx-3 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${f.score}%`, backgroundColor: scoreColor(f.score) }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-txt-dim">{f.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Microstructure Details */}
            <div>
              <h4 className="text-xs font-semibold text-txt-tertiary uppercase tracking-wide mb-2">Microstructure Details</h4>
              <div className="space-y-2">
                {microFactors.map((f: any) => (
                  <div key={f.name} className="rounded-lg border border-border-default bg-inset/30 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-txt-primary">
                        {f.name === "ORDER_FLOW" ? "Order Flow" : f.name === "DEPTH" ? "Bid/Ask Imbalance" : "Funding Rate"}: {f.score}/100 {statusIcon(scoreStatus(f.score))}
                      </span>
                      <div className="flex-1 mx-3 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${f.score}%`, backgroundColor: scoreColor(f.score) }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-txt-dim">{f.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Macro Details */}
            {dimensions && (
              <div>
                <h4 className="text-xs font-semibold text-txt-tertiary uppercase tracking-wide mb-2">Macro Context Details</h4>
                <div className="space-y-2">
                  {[
                    { key: "etfFlow", label: "ETF Flow" },
                    { key: "sentiment", label: "News Sentiment" },
                    { key: "macro", label: "Macro Events" },
                    { key: "treasury", label: "BTC Treasury" },
                  ].map(({ key, label }) => {
                    const score = Math.round(dimensions[key as keyof typeof dimensions] ?? 50);
                    const detail = signal?.dimensionDetails?.[key as keyof typeof signal.dimensionDetails]?.detail;
                    return (
                      <div key={key} className="rounded-lg border border-border-default bg-inset/30 p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-txt-primary">
                            {label}: {score}/100 {statusIcon(scoreStatus(score))}
                          </span>
                          <div className="flex-1 mx-3 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
                            />
                          </div>
                        </div>
                        {detail && <p className="text-[10px] text-txt-dim">{detail}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Thesis Details */}
            {signal?.setup && (
              <div>
                <h4 className="text-xs font-semibold text-txt-tertiary uppercase tracking-wide mb-2">AI Thesis Details</h4>
                <div className="rounded-lg border border-border-default bg-inset/30 p-3 space-y-1">
                  <div className="text-xs"><span className="text-txt-muted">Setup:</span> <span className="font-medium text-txt-primary">{signal.setup.label}</span></div>
                  {signal.setup.thesis && <div className="text-xs"><span className="text-txt-muted">Thesis:</span> <span className="text-txt-secondary">{signal.setup.thesis}</span></div>}
                  {signal.setup.invalidation && <div className="text-xs"><span className="text-txt-muted">Invalidation:</span> <span className="text-txt-secondary">{signal.setup.invalidation}</span></div>}
                  {accuracy != null && <div className="text-xs"><span className="text-txt-muted">Historical Win Rate:</span> <span className="font-mono font-bold text-txt-primary">{accuracy.toFixed(1)}%</span></div>}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

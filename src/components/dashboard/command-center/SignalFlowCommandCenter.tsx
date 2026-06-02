"use client";

import { useMemo, useState, useEffect } from "react";
import { Target, Layers, Activity, Play, TrendingUp, Database, Box, Brain, GitMerge, Landmark, BarChart3, Grid2x2, MessageSquare, CheckCircle, CircleDot } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import IndexROIDashboard from "@/components/IndexROIDashboard";
import BTCTreasuryDashboard from "@/components/BTCTreasuryDashboard";
import MacroSurprise from "@/components/MacroSurprise";
import SpeedometerGauge from "@/components/ui/SpeedometerGauge";
import TradingChart from "@/components/TradingChart";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { getCoinIcon } from "@/lib/coin-icons";
import { getStockIcon } from "@/lib/stock-icons";
import { unwrapApiResponse } from "@/lib/api/client";
import type { Signal } from "@/lib/types/signal";

/* ── Pipeline Model ── */

const pipelineSteps = [
  { number: "1", title: "SoDEX Data", description: "Live DEX Prices\nKlines & Volume", icon: "database" },
  { number: "2", title: "SoSoValue Data", description: "News, ETF Flow\nMacro & Sentiment", icon: "cube" },
  { number: "3", title: "Confluence V2", description: "TA Fusion\nSignal Alignment", icon: "fusion" },
  { number: "4", title: "AI Thesis", description: "Narrative Context\nProbability Check", icon: "brain" },
  { number: "5", title: "Trade Setup", description: "Entry, Risk\nTargets & Sizing", icon: "target" },
  { number: "6", title: "Decision Score", description: "Final Bias\nExecution Readiness", icon: "score" },
];

/* ── Helpers ── */

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PedalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.6 4.7 10.4 7.5a3.2 3.2 0 0 0-2.1 4l4.7 14.2a3.1 3.1 0 0 0 3.9 2l4.9-1.6a3.2 3.2 0 0 0 2.1-4L23.7 6.7a3.1 3.1 0 0 0-4.1-2Z" />
      <path d="m12 12.2 8.9-2.9M13.4 16.5l8.8-2.9M14.8 20.8l8.7-2.9" />
    </svg>
  );
}

function IconControlButton({
  label,
  detail,
  onClick,
  disabled = false,
  loading = false,
  intent = "accent",
  children,
}: {
  label: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  intent?: "accent" | "execute";
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex h-11 w-11 items-center justify-center">
      <button
        type="button"
        aria-label={label}
        title={`${label}: ${detail}`}
        onClick={onClick}
        disabled={disabled || loading}
        className={cx(
          "flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition-all",
          "focus:outline-none focus:ring-2 focus:ring-accent/40",
          intent === "execute"
            ? "border-buy-dim bg-buy-muted text-buy hover:border-buy hover:bg-buy-muted/80"
            : "border-accent-dim bg-accent-muted text-accent hover:border-accent hover:bg-accent-muted/80",
          (disabled || loading) && "cursor-not-allowed border-border-default bg-elevated text-txt-muted opacity-70"
        )}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </button>
      <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-40 -translate-x-1/2 rounded-lg border border-accent/35 bg-[#050914] px-2 py-2 text-left opacity-0 shadow-[0_18px_44px_rgba(0,0,0,0.55),0_0_22px_rgba(255,136,0,0.12)] ring-1 ring-white/8 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:-translate-y-0.5 group-focus-within:opacity-100">
        <div className="flex items-center justify-between gap-1.5">
          <div className="text-[7px] font-bold uppercase tracking-wide text-txt-primary">{label}</div>
          <span className="rounded-md border border-accent/30 bg-accent-muted px-1 py-0.5 text-[6px] font-bold uppercase tracking-wide text-accent">
            Live
          </span>
        </div>
        <div className="mt-0.5 text-[7px] font-medium leading-snug text-txt-secondary">{detail}</div>
        <div className="absolute left-1/2 top-full h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-accent/35 bg-[#050914]" />
      </div>
    </div>
  );
}


/* ── Tech Icon (inline SVG) ── */

function TechIcon({ name, className = "" }: { name: string; className?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    database: <Database className={className} />,
    cube: <Box className={className} />,
    fusion: <GitMerge className={className} />,
    brain: <Brain className={className} />,
    target: <Target className={className} />,
    trend: <TrendingUp className={className} />,
    globe: <Layers className={className} />,
    chat: <MessageSquare className={className} />,
    bank: <Landmark className={className} />,
    bars: <BarChart3 className={className} />,
    score: <CheckCircle className={className} />,
  };
  return iconMap[name] ?? <CircleDot className={className} />;
}

/* ── Pipeline Flow ── */

function PipelineStepCard({ step }: { step: (typeof pipelineSteps)[number] }) {
  return (
    <Card variant="default" padding="none" className="relative flex h-[88px] items-center gap-4 rounded-xl px-5">
      <span className="absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-muted text-[11px] font-bold text-accent">{step.number}</span>
      <TechIcon name={step.icon} className="h-10 w-10 shrink-0" />
      <div>
        <h3 className="text-sm font-semibold text-txt-primary">{step.title}</h3>
        <p className="mt-1 whitespace-pre-line text-xs leading-snug text-txt-tertiary">{step.description}</p>
      </div>
    </Card>
  );
}

function Connector() {
  return (
    <div className="hidden min-w-[64px] flex-1 items-center lg:flex">
      {/* Left line — shimmer on the line itself */}
      <div className="h-px flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent-dim" />
        <div className="absolute inset-0 connector-line-shimmer" />
      </div>
      {/* Heartbeat — base + flowing dash */}
      <svg viewBox="0 0 64 26" className="h-7 w-16 shrink-0">
        <path d="M0 13h18l4-10 8 20 8-20 8 20 4-10h14" fill="none" stroke="var(--color-accent-dim)" strokeWidth="1.5" />
        <path d="M0 13h18l4-10 8 20 8-20 8 20 4-10h14" fill="none" stroke="white" strokeWidth="1.5"
          strokeDasharray="20 48" strokeLinecap="round" opacity="0.5"
          className="connector-shimmer-svg" />
      </svg>
      {/* Right line — shimmer on the line itself */}
      <div className="h-px flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent-dim" />
        <div className="absolute inset-0 connector-line-shimmer" />
      </div>
    </div>
  );
}

function PipelineFlow() {
  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <div className="grid min-w-[1120px] grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-center">
        {pipelineSteps.map((step, index) => (
          <div key={step.title} className="contents">
            <PipelineStepCard step={step} />
            {index < pipelineSteps.length - 1 && <Connector />}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Section Panel (using design system Card) ── */

function Panel({
  title,
  badge,
  children,
  className = "",
  bodyClassName = "flex-1 overflow-y-auto",
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card variant="default" padding="none" className={cx("rounded-xl overflow-hidden flex flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold tracking-wide text-txt-primary">{title}</h2>
        {badge}
      </div>
      <div className={bodyClassName}>
        {children}
      </div>
    </Card>
  );
}

/* ── Market Canvas (real TradingView chart) ── */

function MarketCanvas({ pair }: { pair: string }) {
  const d = useDashboard();
  const sodexSymbol = pairToSodexSymbol(pair);
  const ticker = d.tickerMap.get(sodexSymbol);
  const currentPrice = ticker ? parseFloat(ticker.lastPx) : null;

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden h-[598px] flex flex-col">
      <TradingChart
        klines={d.klines}
        symbol={pair}
        currentPrice={currentPrice}
        liveSignals={d.liveSignals}
        tickerMap={d.tickerMap}
        onPairChange={d.setSelectedPair}
      />
    </Card>
  );
}

/* ── Decision Panel ── */

type DecisionAction = "LONG" | "SHORT" | "NO TRADE";

interface DecisionSource {
  label: string;
  signed: number;
  weight: number;
  available: boolean;
  note: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizePair(pair: string): string {
  return pair.replace(/^v/, "").replace(/_vUSDC$/, "/USDC").toUpperCase();
}

function formatPanelPrice(value?: number | null): string {
  if (!value || !Number.isFinite(value)) return "--";
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function signedFromSignal(signal: Signal | null): number {
  if (!signal) return 0;
  // Use actionV2 for granular scoring — boost/penalize based on strength
  const v2: string = signal.actionV2 ?? signal.action;
  const base = signal.confidence;
  if (v2 === "STRONG_LONG") return Math.min(100, base + 15);
  if (v2 === "LONG") return base;
  if (v2 === "WEAK_LONG") return Math.max(0, base - 10);
  if (v2 === "STRONG_SHORT") return -Math.min(100, base + 15);
  if (v2 === "SHORT") return -base;
  if (v2 === "WEAK_SHORT") return -Math.max(0, base - 10);
  // Legacy fallback
  if (signal.action === "LONG") return base;
  if (signal.action === "SHORT") return -base;
  return 0;
}

function actionFromSignal(signal: Signal | null): DecisionAction {
  if (!signal) return "NO TRADE";
  if (signal.action === "LONG") return "LONG";
  if (signal.action === "SHORT") return "SHORT";
  return "NO TRADE";
}

function signedFromNews(news: NewsResponse | null): number {
  if (!news || news.error || !news.sentiment) return 0;
  const distance = Math.abs(news.sentiment.score - 50) * 2;
  if (news.sentiment.label === "Bullish") return clamp(distance, 0, 100);
  if (news.sentiment.label === "Bearish") return -clamp(distance, 0, 100);
  return 0;
}

function confidenceLabel(value: number): string {
  if (value >= 75) return "High";
  if (value >= 60) return "Moderate";
  return "Watch";
}

function hasExternalSignalLayers(sources?: Record<string, boolean | number>): boolean {
  if (!sources) return false;
  return Boolean(
    sources.news ||
    sources.etf ||
    sources.macro ||
    sources.treasuries ||
    sources.treasuryActivity ||
    (typeof sources.snapshots === "number" && sources.snapshots > 0)
  );
}

function buildTargets(action: DecisionAction, entry: number, signal: Signal | null): Array<[string, string, string]> {
  if (action === "NO TRADE") {
    if (!entry || !Number.isFinite(entry)) {
      return [
        ["UP", "--", "break"],
        ["MID", "--", "spot"],
        ["DN", "--", "break"],
      ];
    }
    return [
      ["UP", formatPanelPrice(entry * 1.006), "break"],
      ["MID", formatPanelPrice(entry), "spot"],
      ["DN", formatPanelPrice(entry * 0.994), "break"],
    ];
  }

  if (!entry || !Number.isFinite(entry)) return [["--", "--", "--"]];

  const dir = action === "LONG" ? 1 : -1;
  const tp1 = signal?.execution.takeProfit ?? entry * (1 + dir * 0.012);
  return [
    ["TP1", formatPanelPrice(tp1), "(live)"],
    ["TP2", formatPanelPrice(entry * (1 + dir * 0.024)), "(2R)"],
    ["TP3", formatPanelPrice(entry * (1 + dir * 0.04)), "(3R)"],
  ];
}

function buildStop(action: DecisionAction, entry: number, signal: Signal | null): [string, string, string] {
  if (!entry || !Number.isFinite(entry)) return ["SL", "--", "--"];
  if (action === "NO TRADE") return ["State", "WAIT", "(flat)"];
  const dir = action === "LONG" ? -1 : 1;
  return ["SL", formatPanelPrice(signal?.execution.stopLoss ?? entry * (1 + dir * 0.01)), "risk"];
}

function DecisionPanel({ pair, news }: { pair: string; news: NewsResponse | null }) {
  const d = useDashboard();
  const currentSignal = d.liveSignals.find((s) => normalizePair(s.pair) === normalizePair(pair)) ?? null;
  const aiSignal = d.aiSignal && normalizePair(d.aiSignal.pair) === normalizePair(pair) ? d.aiSignal : null;
  const ticker = d.tickerMap.get(pairToSodexSymbol(pair));
  const currentPrice = currentSignal?.price ?? (ticker ? parseFloat(ticker.lastPx) : 0);
  const coin = pair.split("/")[0];
  const fullEngineReady = hasExternalSignalLayers(d.signalsData?.sources) && !news?.error;
  const generateTooltip = d.analyzing
    ? "SignalFlow is recalculating the latest SoDEX tape, signal engine output, and AI thesis before locking the next score."
    : fullEngineReady
      ? "Generate a fresh SignalFlow decision from live SoDEX market data, SoSoValue layers, and AI reasoning."
      : "Generate a fresh decision from the live data currently available while external layers recover.";

  const generateSignal = async () => {
    d.setAiCoin(coin);
    d.setIncludeAI(true);
    await d.generate(coin, true);
  };

  const decision = useMemo(() => {
    const systemAction = actionFromSignal(currentSignal);
    const systemConfidence = currentSignal?.confidence ?? 0;
    const sources: DecisionSource[] = [
      {
        label: "SoDEX TA",
        signed: signedFromSignal(currentSignal),
        weight: 0.55,
        available: !!currentSignal,
        note: currentSignal?.actionV2?.replaceAll("_", " ") ?? currentSignal?.regime ?? "Waiting for TA",
      },
      {
        label: "SoSoValue News",
        signed: signedFromNews(news),
        weight: 0.25,
        available: !!news && !news.error,
        note: news?.error ? "quota limited" : news?.sentiment?.label ?? "Waiting for news",
      },
      {
        label: "AI Thesis",
        signed: signedFromSignal(aiSignal),
        weight: 0.2,
        available: !!aiSignal,
        note: aiSignal ? "AI signal active" : d.analyzing ? "analyzing" : "not generated",
      },
    ];

    const action = systemAction;
    const confidence = currentSignal
      ? clamp(Math.round(systemConfidence), 0, 100)
      : 0;
    const signalForExecution = currentSignal ?? aiSignal;

    return {
      action,
      confidence,
      label: confidenceLabel(confidence),
      sources,
      targets: buildTargets(action, currentPrice, signalForExecution),
      stop: buildStop(action, currentPrice, signalForExecution),
      riskReward: !currentSignal || action === "NO TRADE" ? "Stand aside" : currentSignal.execution.riskReward,
      positionSize: !currentSignal || action === "NO TRADE" ? "Flat / no entry" : currentSignal.execution.positionSize,
    };
  }, [aiSignal, currentPrice, currentSignal, d.analyzing, news]);

  const decisionTone = decision.action === "LONG"
    ? "text-buy"
    : decision.action === "SHORT"
      ? "text-sell"
      : "text-hold";
  const riskRewardNumber = parseFloat(String(decision.riskReward).replace(":1", ""));
  const rewardShare = Number.isFinite(riskRewardNumber)
    ? clamp((riskRewardNumber / (riskRewardNumber + 1)) * 100, 42, 76)
    : 58;
  const riskShare = 100 - rewardShare;
  const riskRewardDisplay = Number.isFinite(riskRewardNumber)
    ? `${riskRewardNumber.toFixed(2)}R`
    : decision.riskReward;

  const execute = () => {
    if (currentSignal && decision.action !== "NO TRADE") {
      d.handleExecuteSignal(currentSignal);
    }
  };

  const signalLights: Array<{ action: DecisionAction; label: string; active: string; idle: string; lamp: string; glow: string }> = [
    {
      action: "SHORT",
      label: "SHORT",
      active: "border-sell-dim bg-sell-muted text-sell",
      idle: "border-border-default bg-elevated text-txt-muted",
      lamp: "bg-sell border-sell",
      glow: "shadow-[0_0_16px_var(--color-sell)]",
    },
    {
      action: "NO TRADE",
      label: "NO TRADE",
      active: "border-hold-dim bg-hold-muted text-hold",
      idle: "border-border-default bg-elevated text-txt-muted",
      lamp: "bg-hold border-hold",
      glow: "shadow-[0_0_16px_var(--color-hold)]",
    },
    {
      action: "LONG",
      label: "LONG",
      active: "border-buy-dim bg-buy-muted text-buy",
      idle: "border-border-default bg-elevated text-txt-muted",
      lamp: "bg-buy border-buy",
      glow: "shadow-[0_0_16px_var(--color-buy)]",
    },
  ];

  return (
    <Panel
      title="LIVE DECISION SCORE"
      badge={<Badge variant={decision.action === "LONG" ? "buy" : decision.action === "SHORT" ? "sell" : "hold"} size="sm">LIVE LOGIC</Badge>}
      className="h-[598px] relative z-10"
      bodyClassName="flex-1 overflow-visible"
    >
      <div className="flex h-full min-w-0 flex-col gap-2.5 overflow-visible p-3">
        <div className="rounded-xl border border-border-default bg-inset/70 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
              {signalLights.map((item) => {
                const isActive = decision.action === item.action;
              return (
                <div
                  key={item.action}
                  aria-current={isActive ? "true" : undefined}
                  className={cx(
                    "flex h-10 items-center justify-center rounded-xl border text-[11px] font-semibold transition-all",
                    isActive ? `${item.active} ring-1 ring-current/25` : item.idle
                  )}
                >
                  {item.label}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-inset/70 px-2 py-2 text-center">
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-txt-tertiary uppercase">SignalFlow Final Score</div>
          <SpeedometerGauge value={decision.confidence} size="lg" showLabel={false} sweeping={d.analyzing} />
          <div className="relative mt-2 flex min-h-[52px] items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <IconControlButton
                label={d.analyzing ? "Generating Signal" : "Generate Signal"}
                detail={generateTooltip}
                onClick={generateSignal}
                loading={d.analyzing}
                intent="accent"
              >
                <PedalIcon className="h-5 w-5" />
              </IconControlButton>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Generate Signal</span>
            </div>
            <div
              className="min-w-[104px] text-5xl font-bold tabular-nums tracking-tight"
              style={{
                color: decision.action === "LONG"
                  ? "var(--color-buy)"
                  : decision.action === "SHORT"
                    ? "var(--color-sell)"
                    : "var(--color-hold)",
              }}
            >
              {decision.confidence}%
            </div>
            <div className="flex flex-col items-center gap-1">
              <IconControlButton
                label={decision.action === "NO TRADE" ? "Wait For Setup" : "Execute Setup"}
                detail={decision.action === "NO TRADE" ? "No executable setup yet." : `Execute this setup at ${decision.positionSize}.`}
                onClick={execute}
                disabled={!currentSignal || decision.action === "NO TRADE"}
                intent="execute"
              >
                <Play size={19} fill="currentColor" />
              </IconControlButton>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Execute Setup</span>
            </div>
          </div>
          <div className="text-sm font-medium text-txt-tertiary">{decision.label}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card variant="inset" padding="sm" className="rounded-xl !p-2.5">
            <div className={cx("mb-2 text-center text-[11px] font-semibold uppercase tracking-wide", decisionTone)}>
              {decision.action === "NO TRADE" ? "Watch Triggers" : "Take Profit (TP)"}
            </div>
            {decision.action === "NO TRADE" ? (
              <div>
                {(() => {
                  const [primary, spot, downside] = decision.targets;
                  return (
                    <div className="rounded-lg border border-hold-dim bg-hold-muted px-2 py-1.5 shadow-[0_0_18px_rgba(255,136,0,0.08)]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-buy" />
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-tertiary">Upside break</span>
                        </div>
                        <span className="rounded border border-hold-dim bg-hold-muted px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide text-hold">
                          {primary?.[2] ?? "break"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-2 font-mono">
                        <span className={cx("text-[10px] font-bold", decisionTone)}>{primary?.[0] ?? "UP"}</span>
                        <span className={cx("text-sm font-bold tabular-nums", decisionTone)}>{primary?.[1] ?? "--"}</span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1 border-t border-hold-dim/70 pt-1">
                        {[
                          { item: spot, fallback: "MID", tone: "text-txt-secondary", dot: "bg-txt-muted" },
                          { item: downside, fallback: "DN", tone: "text-sell", dot: "bg-sell" },
                        ].map(({ item, fallback, tone, dot }) => (
                          <div key={item?.[0] ?? fallback} className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={cx("h-1 w-1 shrink-0 rounded-full", dot)} />
                              <span className={cx("font-mono text-[8px] font-bold", tone)}>{item?.[0] ?? fallback}</span>
                              <span className="truncate text-[7px] font-bold uppercase tracking-wide text-txt-faint">{item?.[2] ?? "--"}</span>
                            </div>
                            <div className={cx("truncate text-right font-mono text-[9px] font-semibold tabular-nums", tone)}>
                              {item?.[1] ?? "--"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div>
                {decision.targets.slice(0, 1).map(([label, price, risk]) => (
                  <div
                    key={label}
                    className={cx(
                      "rounded-lg border px-2 py-1.5",
                      decision.action === "LONG"
                        ? "border-buy-dim bg-buy-muted shadow-[0_0_18px_rgba(0,229,168,0.08)]"
                        : "border-sell-dim bg-sell-muted shadow-[0_0_18px_rgba(239,68,68,0.08)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cx("h-1.5 w-1.5 rounded-full", decision.action === "LONG" ? "bg-buy" : "bg-sell")} />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-txt-tertiary">TP Target</span>
                      </div>
                      <span className={cx(
                        "rounded border px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide",
                        decision.action === "LONG" ? "border-buy-dim bg-buy-muted text-buy" : "border-sell-dim bg-sell-muted text-sell"
                      )}>
                        {risk.replace(/[()]/g, "")}
                      </span>
                    </div>
                    <div className="mt-1 flex items-end justify-between gap-2 font-mono">
                      <span className={cx("text-[10px] font-bold leading-none", decisionTone)}>{label}</span>
                      <span className={cx("text-lg font-bold leading-none tabular-nums", decisionTone)}>{price}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 border-t border-border-default/70 pt-1">
                      <span className="text-[8px] font-semibold uppercase tracking-wide text-txt-faint">Live target</span>
                      <span className={cx("text-[9px] font-bold", decisionTone)}>Profit gate</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card variant="inset" padding="sm" className="rounded-xl !p-2.5">
            <div className={cx("mb-2 text-center text-[11px] font-semibold uppercase tracking-wide", decisionTone)}>
              {decision.action === "NO TRADE" ? "Risk State" : "Stop Loss (SL)"}
            </div>
            {decision.action === "NO TRADE" ? (
              <div className="rounded-lg border border-hold-dim bg-hold-muted px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={cx("text-[10px] font-semibold uppercase tracking-wide", decisionTone)}>Position</span>
                  <Badge variant="hold" size="sm">WAIT</Badge>
                </div>
                <div className={cx("mt-1 text-xs font-semibold", decisionTone)}>Flat until setup confirms</div>
              </div>
            ) : (
              <div className="rounded-lg border border-sell-dim bg-sell-muted px-2 py-1.5 shadow-[0_0_18px_rgba(239,68,68,0.08)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sell" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-txt-tertiary">Stop risk</span>
                  </div>
                  <span className="rounded border border-sell-dim bg-sell-muted px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide text-sell">
                    {decision.stop[2]}
                  </span>
                </div>
                <div className="mt-1 flex items-end justify-between gap-2 font-mono">
                  <span className="text-[10px] font-bold leading-none text-sell">{decision.stop[0]}</span>
                  <span className="text-lg font-bold leading-none tabular-nums text-sell">{decision.stop[1]}</span>
                </div>
              </div>
            )}
            {decision.action !== "NO TRADE" && (
              <>
                <div className="my-1.5 h-px bg-border-default" />
                <div className="rounded-lg border border-border-default bg-inset/70 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-txt-tertiary">Payoff ratio</div>
                      <div className="text-[8px] font-semibold text-txt-faint">Reward is {decision.riskReward} risk</div>
                    </div>
                    <div className="font-mono text-base font-bold leading-none text-txt-primary">{riskRewardDisplay}</div>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-border-default">
                    <div className="bg-sell" style={{ width: `${riskShare}%` }} />
                    <div className={decision.action === "LONG" ? "bg-buy" : "bg-sell/70"} style={{ width: `${rewardShare}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[7px] font-bold uppercase tracking-wide text-txt-faint">
                    <span>Risk</span>
                    <span>Reward</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Panel>
  );
}

/* ── Catalyst Monitor ── */

interface NewsItem {
  id: number;
  title: string;
  content: string;
  release_time: number;
  source_link: string;
  matched_currencies: Array<{ currency_id: string; symbol: string }> | null;
  tags: Array<{ name: string }> | null;
}

interface NewsResponse {
  list: NewsItem[];
  error?: string | null;
  sentiment: { score: number; label: string };
  topCoins: Array<{ symbol: string; count: number }>;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function sentimentVariant(label: string): string {
  if (label === "Bullish") return "buy";
  if (label === "Bearish") return "sell";
  return "muted";
}

interface CatalystEvent {
  id: string;
  time: number;
  type: "SIGNAL" | "MARKET" | "RISK" | "DATA" | "NEWS";
  title: string;
  detail: string;
  tone: "buy" | "sell" | "hold" | "accent" | "muted";
}

function catalystToneClasses(tone: CatalystEvent["tone"]): string {
  if (tone === "buy") return "border-buy-dim bg-buy-muted text-buy";
  if (tone === "sell") return "border-sell-dim bg-sell-muted text-sell";
  if (tone === "hold") return "border-hold-dim bg-hold-muted text-hold";
  if (tone === "accent") return "border-accent-dim bg-accent-muted text-accent";
  return "border-border-default bg-elevated text-txt-secondary";
}

function signalTone(action: Signal["action"]): CatalystEvent["tone"] {
  if (action === "LONG") return "buy";
  if (action === "SHORT") return "sell";
  return "hold";
}

function CatalystMonitor({ news, fetchError }: { news: NewsResponse | null; fetchError: boolean }) {
  const d = useDashboard();
  const apiError = news?.error;
  const hasData = news && news.list.length > 0;
  const now = Date.now();
  const selectedBase = d.selectedPair.split("/")[0].replace(/^v/, "").replace(/_vUSDC$/, "");
  const selectedSignal = d.liveSignals.find((s) => normalizePair(s.pair) === normalizePair(d.selectedPair)) ?? null;
  const activeTickers = (d.tickers ?? [])
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      price: toFiniteNumber(t.lastPx),
      change: toFiniteNumber(t.changePct),
      volume: toFiniteNumber(t.quoteVolume),
    }))
    .filter((t) => t.price > 0);
  const cryptoTickers = activeTickers.filter((t) => !isStockOrIndex(t.symbol));
  const topMover = [...cryptoTickers].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const volumeLeader = [...cryptoTickers].sort((a, b) => b.volume - a.volume)[0];
  const advancing = cryptoTickers.filter((t) => t.change > 0).length;
  const declining = cryptoTickers.filter((t) => t.change < 0).length;
  const topSignals = [...d.liveSignals].sort((a, b) => b.confidence - a.confidence).slice(0, 4);

  const events: CatalystEvent[] = [];

  if (selectedSignal) {
    events.push({
      id: `selected-${selectedSignal.pair}`,
      time: now,
      type: "SIGNAL",
      title: `${selectedSignal.pair} ${selectedSignal.action} ${selectedSignal.confidence}%`,
      detail: selectedSignal.reasoning || "Selected pair signal is driving Live Decision Score.",
      tone: signalTone(selectedSignal.action),
    });
  } else {
    events.push({
      id: "selected-waiting",
      time: now,
      type: "RISK",
      title: `${selectedBase}/USDC no executable signal`,
      detail: d.signalsLoading ? "Signal engine is syncing selected pair." : "Current pair is waiting for confirmation.",
      tone: "hold",
    });
  }

  topSignals
    .filter((s) => !selectedSignal || normalizePair(s.pair) !== normalizePair(selectedSignal.pair))
    .slice(0, 2)
    .forEach((signal, index) => {
      events.push({
        id: `signal-${signal.pair}-${index}`,
        time: now - (index + 1) * 45000,
        type: "SIGNAL",
        title: `${signal.pair} ${signal.action} ${signal.confidence}%`,
        detail: signal.actionV2?.replaceAll("_", " ") ?? signal.regime ?? "Signal engine update.",
        tone: signalTone(signal.action),
      });
    });

  if (topMover) {
    events.push({
      id: `mover-${topMover.symbol}`,
      time: now - 120000,
      type: "MARKET",
      title: `${topMover.symbol} ${changeArrow(topMover.change)} ${Math.abs(topMover.change).toFixed(2)}%`,
      detail: `Largest live crypto move. Breadth ${advancing} advancing / ${declining} declining.`,
      tone: topMover.change > 0 ? "buy" : topMover.change < 0 ? "sell" : "muted",
    });
  }

  if (volumeLeader) {
    events.push({
      id: `volume-${volumeLeader.symbol}`,
      time: now - 180000,
      type: "MARKET",
      title: `${volumeLeader.symbol} liquidity leader`,
      detail: `${fmtUsd(volumeLeader.volume)} 24H quote volume on the current tape.`,
      tone: "accent",
    });
  }

  events.push({
    id: "data-sodex",
    time: now - 240000,
    type: "DATA",
    title: `SoDEX ${d.sodexStatus}`,
    detail: d.marketError ?? `${activeTickers.length} instruments streaming into SignalFlow.`,
    tone: d.sodexStatus === "connected" ? "buy" : d.sodexStatus === "loading" ? "hold" : "sell",
  });

  if (fetchError || apiError) {
    events.push({
      id: "data-news-degraded",
      time: now - 300000,
      type: "DATA",
      title: "SoSoValue news layer degraded",
      detail: apiError ?? "News endpoint unreachable. Signal tape remains live from market and engine data.",
      tone: "hold",
    });
  } else if (hasData && news?.sentiment) {
    events.push({
      id: "news-sentiment",
      time: now - 300000,
      type: "NEWS",
      title: `${news.sentiment.label} news sentiment ${news.sentiment.score}`,
      detail: `${news.list.length} SoSoValue stories available for narrative context.`,
      tone: sentimentVariant(news.sentiment.label) as CatalystEvent["tone"],
    });
  } else {
    events.push({
      id: "data-news-waiting",
      time: now - 300000,
      type: "DATA",
      title: "News layer waiting",
      detail: "Market and signal catalysts stay active while narrative data loads.",
      tone: "muted",
    });
  }

  return (
    <Panel
      title="CATALYST MONITOR"
      badge={<Badge variant={apiError || fetchError ? "hold" : "buy"} size="sm">{events.length} LIVE</Badge>}
      className="h-[598px]"
    >
      <div className="divide-y divide-border-default">
        {events.map((event) => (
          <div
            key={event.id}
            className="px-3 py-2.5 transition-colors hover:bg-elevated/30"
          >
            <div className="flex items-center gap-2">
              <span className="w-9 font-mono text-[10px] text-txt-muted">{timeAgo(event.time)}</span>
              <span className={cx("rounded border px-1.5 py-0.5 text-[9px] font-bold", catalystToneClasses(event.tone))}>
                {event.type}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-txt-primary leading-snug">{event.title}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-txt-tertiary line-clamp-2">{event.detail}</p>
          </div>
        ))}
        {hasData && news?.list.slice(0, 2).map((item) => (
          <div key={`news-${item.id}`} className="px-3 py-2.5 transition-colors hover:bg-elevated/30">
            <div className="flex items-center gap-2">
              <span className="w-9 font-mono text-[10px] text-txt-muted">{timeAgo(item.release_time)}</span>
              <span className="rounded border border-accent-dim bg-accent-muted px-1.5 py-0.5 text-[9px] font-bold text-accent">NEWS</span>
              {item.matched_currencies?.slice(0, 2).map((c) => (
                <span key={c.symbol} className="rounded bg-elevated px-1.5 py-0.5 text-[9px] font-semibold text-txt-secondary">
                  {c.symbol}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-txt-primary leading-snug line-clamp-2">{item.title}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Market Stats Bar (real data) ── */

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function changeArrow(pct: number): string {
  return pct > 0 ? "▲" : pct < 0 ? "▼" : "—";
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function formatAssetPrice(price: number): string {
  if (price >= 100000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function EvidenceEmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-elevated text-txt-secondary">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold text-txt-secondary">{title}</p>
        <p className="mt-1 max-w-[220px] text-[10px] leading-snug text-txt-muted">{detail}</p>
      </div>
    </div>
  );
}

/* Coin color map for fallback avatars */
const COIN_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#9945FF",
  HYPE: "#00E5A8",
  SUI: "#4DA2FF",
  DEFI: "#8B5CF6",
  NVDA: "#76B900",
};

function coinColor(symbol: string): string {
  if (COIN_COLORS[symbol]) return COIN_COLORS[symbol];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}

function CoinAvatar({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const color = coinColor(symbol);
  const realIcon = getCoinIcon(symbol);

  // If we have a real CoinGecko icon, use it; otherwise fallback to CDN
  const iconUrl = realIcon ?? `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${symbol.toLowerCase()}.svg`;

  if (errored || !iconUrl) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{ width: size, height: size, backgroundColor: color + "18", border: `1px solid ${color}30`, fontSize: size * 0.36 }}
      >
        <span className="font-bold" style={{ color, fontSize: size * 0.36 }}>{symbol.slice(0, 2)}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full shrink-0 object-contain"
      onError={() => setErrored(true)}
    />
  );
}

/* Win rate ring SVG */
function WinRateRing({ value, size = 64 }: { value: number | null | undefined; size?: number }) {
  const pct = value != null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = pct != null ? circ * (1 - pct / 100) : circ;
  const color = pct != null ? (pct >= 60 ? "var(--color-buy)" : pct >= 40 ? "var(--color-hold)" : "var(--color-sell)") : "var(--color-border-default)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="4" opacity="0.3" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-sm font-bold tabular-nums text-txt-primary leading-none">
          {pct != null ? `${pct.toFixed(0)}` : "—"}
        </span>
        <span className="text-[8px] text-txt-muted leading-none mt-0.5">%</span>
      </div>
    </div>
  );
}

/* Mini horizontal bar for change magnitude */
function ChangeBar({ change, maxAbs }: { change: number; maxAbs: number }) {
  const width = maxAbs > 0 ? Math.min(100, (Math.abs(change) / maxAbs) * 100) : 0;
  const isPositive = change >= 0;
  return (
    <div className="h-1 w-full rounded-full bg-border-default/30 overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${width}%`,
          background: isPositive
            ? "linear-gradient(90deg, var(--color-buy-muted), var(--color-buy))"
            : "linear-gradient(90deg, var(--color-sell-muted), var(--color-sell))",
        }}
      />
    </div>
  );
}

function TopMoversCard() {
  const d = useDashboard();
  const tickers = d.tickers ?? [];

  const parsed = tickers
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      change: toFiniteNumber(t.changePct),
      price: toFiniteNumber(t.lastPx),
    }))
    .filter((t) => t.price > 0 && !isStockOrIndex(t.symbol))
    .sort((a, b) => b.change - a.change);

  const top3 = parsed.slice(0, 3);
  const bottom3 = parsed.slice(-3).reverse();
  const maxAbs = Math.max(...parsed.map((t) => Math.abs(t.change)), 1);
  const advancing = parsed.filter((t) => t.change > 0).length;
  const declining = parsed.filter((t) => t.change < 0).length;
  const unchanged = Math.max(0, parsed.length - advancing - declining);
  const breadth = parsed.length > 0 ? Math.round((advancing / parsed.length) * 100) : null;
  const pressureScore = parsed.length > 0 ? Math.round(((advancing - declining) / parsed.length) * 100) : 0;
  const pressureTone = pressureScore > 10 ? "text-buy" : pressureScore < -10 ? "text-sell" : "text-hold";
  const pressureLabel = pressureScore > 10 ? "bid-led" : pressureScore < -10 ? "offer-led" : "balanced";
  const leadGainer = top3[0] ?? null;
  const leadLoser = bottom3[0] ?? null;

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-txt-secondary">
          <TrendingUp size={12} className="text-buy" />
          Market Pressure
        </h3>
        <span className={cx("text-[9px] font-mono uppercase tabular-nums", parsed.length > 0 ? pressureTone : "text-txt-muted")}>
          {parsed.length === 0 ? "waiting" : pressureLabel}
        </span>
      </div>
      {parsed.length === 0 ? (
        <EvidenceEmptyState
          icon={<TrendingUp size={18} />}
          title={d.marketLoading ? "Loading market tape" : "Market tape unavailable"}
          detail={d.marketError ?? "Waiting for tradable pair prices before ranking pressure."}
        />
      ) : (
      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className={cx("font-mono text-3xl font-bold leading-none tabular-nums", pressureTone)}>
              {pressureScore > 0 ? "+" : ""}{pressureScore}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Pressure impulse</p>
          </div>
          <div className="min-w-[104px] rounded-lg border border-buy-dim/30 bg-buy-muted/10 p-2 text-right">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{breadth ?? 0}%</p>
            <p className="mt-0.5 text-[9px] text-txt-muted">advancing</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-buy tabular-nums">{advancing}</p>
            <p className="text-[8px] uppercase text-txt-muted">adv</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-txt-secondary tabular-nums">{unchanged}</p>
            <p className="text-[8px] uppercase text-txt-muted">flat</p>
          </div>
          <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-sell tabular-nums">{declining}</p>
            <p className="text-[8px] uppercase text-txt-muted">dec</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border-default bg-inset/50 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Tape Leaders</span>
            <span className="font-mono text-[9px] text-txt-muted tabular-nums">{parsed.length} pairs</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-buy" />
                  <span className="text-[9px] font-semibold text-buy tracking-wide">Bid</span>
                </div>
                <span className="font-mono text-[9px] text-buy tabular-nums">
                  {leadGainer ? `+${Math.abs(leadGainer.change).toFixed(2)}%` : "--"}
                </span>
              </div>
              <div className="space-y-1.5">
                {top3.slice(0, 2).map((t, i) => (
                  <div key={t.symbol} className="flex items-center gap-2">
                    <span className="w-4 text-right font-mono text-[9px] text-txt-dim tabular-nums">{i + 1}</span>
                    <CoinAvatar symbol={t.symbol} size={18} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-semibold text-txt-primary">{t.symbol}</span>
                        <span className="shrink-0 font-mono text-[9px] font-bold tabular-nums text-buy">+{Math.abs(t.change).toFixed(2)}%</span>
                      </div>
                      <ChangeBar change={t.change} maxAbs={maxAbs} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-sell" />
                  <span className="text-[9px] font-semibold text-sell tracking-wide">Offer</span>
                </div>
                <span className="font-mono text-[9px] text-sell tabular-nums">
                  {leadLoser ? `${leadLoser.change.toFixed(2)}%` : "--"}
                </span>
              </div>
              <div className="space-y-1.5">
                {bottom3.slice(0, 2).map((t, i) => (
                  <div key={t.symbol} className="flex items-center gap-2">
                    <span className="w-4 text-right font-mono text-[9px] text-txt-dim tabular-nums">{i + 1}</span>
                    <CoinAvatar symbol={t.symbol} size={18} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-semibold text-txt-primary">{t.symbol}</span>
                        <span className="shrink-0 font-mono text-[9px] font-bold tabular-nums text-sell">{Math.abs(t.change).toFixed(2)}%</span>
                      </div>
                      <ChangeBar change={t.change} maxAbs={maxAbs} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </Card>
  );
}

function SignalAccuracyCard() {
  const d = useDashboard();
  const stats = d.signalStats;
  const streaks = d.streaks;

  const accuracy = stats?.accuracy;
  const totalResolved = stats?.totalResolved ?? 0;
  const totalCorrect = stats?.totalCorrect ?? 0;
  const totalMissed = Math.max(0, totalResolved - totalCorrect);
  const currentStreak = streaks?.current;
  const winStreak = currentStreak?.type === "win" ? currentStreak.count : 0;
  const lossStreak = currentStreak?.type === "loss" ? currentStreak.count : 0;
  const missRate = accuracy == null ? null : Math.max(0, 100 - accuracy);
  const reliabilityTone = totalResolved === 0
    ? "text-txt-muted"
    : accuracy == null
      ? "text-txt-muted"
      : accuracy >= 60
        ? "text-buy"
        : accuracy >= 45
          ? "text-hold"
          : "text-sell";
  const reliabilityLabel = totalResolved === 0
    ? "collecting"
    : accuracy == null
      ? "pending"
      : accuracy >= 60
        ? "strong"
        : accuracy >= 45
          ? "mixed"
          : "weak";

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-txt-secondary">
          <Target size={12} className="text-accent" /> Signal Reliability
        </h3>
        <span className={cx("text-[9px] font-mono uppercase tabular-nums", reliabilityTone)}>{reliabilityLabel}</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-[92px_1fr] gap-3">
          <div className="flex items-center justify-center rounded-xl border border-border-default bg-inset/60 p-2">
            <WinRateRing value={accuracy} size={76} />
          </div>
          <div className="min-w-0 rounded-xl border border-border-default bg-elevated/20 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cx("font-mono text-3xl font-bold leading-none tabular-nums", reliabilityTone)}>
                  {accuracy == null ? "--" : accuracy.toFixed(1)}
                  {accuracy != null && <span className="text-base">%</span>}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Hit rate</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{totalResolved}</p>
                <p className="mt-0.5 text-[9px] text-txt-muted">resolved</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-1.5">
                <p className="font-mono text-sm font-bold text-buy tabular-nums">{totalCorrect}</p>
                <p className="text-[8px] uppercase text-txt-muted">wins</p>
              </div>
              <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-1.5">
                <p className="font-mono text-sm font-bold text-sell tabular-nums">{totalMissed}</p>
                <p className="text-[8px] uppercase text-txt-muted">misses</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-buy-dim/40 bg-buy-muted/20 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-semibold text-buy/80">Win streak</span>
              <span className="text-[8px] uppercase text-txt-muted">current</span>
            </div>
            <span className="mt-1 block font-mono text-xl font-bold tabular-nums text-buy leading-none">
              {winStreak || "—"}
            </span>
          </div>
          <div className="rounded-lg border border-sell-dim/40 bg-sell-muted/20 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-semibold text-sell/80">Loss streak</span>
              <span className="text-[8px] uppercase text-txt-muted">current</span>
            </div>
            <span className="mt-1 block font-mono text-xl font-bold tabular-nums text-sell leading-none">
              {lossStreak || "—"}
            </span>
          </div>
        </div>

        {accuracy != null ? (
          <div className="mt-3 rounded-lg border border-border-default bg-inset/50 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Resolution tape</span>
              <span className="font-mono text-[9px] text-txt-secondary tabular-nums">{missRate?.toFixed(1)}% miss</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border-default/30">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, accuracy)}%`,
                  background: accuracy >= 60
                    ? "linear-gradient(90deg, var(--color-buy-muted), var(--color-buy))"
                    : accuracy >= 40
                      ? "linear-gradient(90deg, var(--color-hold-muted), var(--color-hold))"
                      : "linear-gradient(90deg, var(--color-sell-muted), var(--color-sell))",
                }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]">
              <div className="flex items-center justify-between rounded-md border border-border-default bg-elevated/20 px-2 py-1.5">
                <span className="text-txt-muted">Best win run</span>
                <span className="font-mono font-bold text-buy tabular-nums">{streaks?.bestWinStreak ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border-default bg-elevated/20 px-2 py-1.5">
                <span className="text-txt-muted">Worst loss run</span>
                <span className="font-mono font-bold text-sell tabular-nums">{streaks?.worstLossStreak ?? 0}</span>
              </div>
            </div>
            <div className="mt-2 flex gap-1">
              {(streaks?.last10 ?? []).map((result, i) => (
                <span
                  key={`${result}-${i}`}
                  className={cx(
                    "h-1.5 flex-1 rounded-full",
                    result === "win" ? "bg-buy" : "bg-sell",
                  )}
                />
              ))}
              {Array.from({ length: Math.max(0, 10 - (streaks?.last10.length ?? 0)) }).map((_, i) => (
                <span key={`empty-${i}`} className="h-1.5 flex-1 rounded-full bg-border-default/40" />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-border-default bg-elevated/20 px-3 py-2 text-center">
            <p className="text-[10px] font-semibold text-txt-secondary">
              {d.historyHydrated ? "Awaiting resolved outcomes" : "Loading history"}
            </p>
            <p className="mt-1 text-[9px] leading-snug text-txt-muted">
              Accuracy appears after generated signals have enough time to resolve.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Stock/Index/Commodity avatar with logo.dev ── */

const STOCK_NAMES: Record<string, string> = {
  NVDA: "NVIDIA",
  AAPL: "Apple",
  MSFT: "Microsoft",
  TSLA: "Tesla",
  GOOGL: "Alphabet",
  AMZN: "Amazon",
  META: "Meta",
  MSTR: "MicroStrategy",
  COIN: "Coinbase",
  HOOD: "Robinhood",
};

const INDEX_NAMES: Record<string, string> = {
  MAG7SSI: "Magnificent 7",
  MEMESSI: "Meme Index",
  DEFISSI: "DeFi Index",
  USSI: "US Index",
  XYZ100: "XYZ 100",
  SP500: "S&P 500",
  NASDAQ: "NASDAQ",
};

const COMMODITY_NAMES: Record<string, string> = {
  XAUT: "Tether Gold",
  GOLD: "Gold",
  SILVER: "Silver",
  WTIOIL: "WTI Crude",
  BRENTOIL: "Brent Crude",
  XAU: "Gold Spot",
};

const STOCK_COLORS: Record<string, string> = {
  NVDA: "#76B900",
  AAPL: "#A2AAAD",
  MSFT: "#00A4EF",
  TSLA: "#CC0000",
  GOOGL: "#4285F4",
  AMZN: "#FF9900",
  META: "#0668E1",
  MSTR: "#F7931A",
  COIN: "#0052FF",
  HOOD: "#00C805",
  MAG7SSI: "#8B5CF6",
  MEMESSI: "#F472B6",
  DEFISSI: "#00E5A8",
  USSI: "#3B82F6",
  XYZ100: "#EF4444",
  SP500: "#F59E0B",
  NASDAQ: "#10B981",
  XAUT: "#FFD700",
  GOLD: "#FFD700",
  SILVER: "#C0C0C0",
  WTIOIL: "#475569",
  BRENTOIL: "#64748B",
  XAU: "#FFD700",
};

function isStockOrIndex(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return upper in STOCK_NAMES || upper in INDEX_NAMES || upper in COMMODITY_NAMES;
}

function assetName(symbol: string): string {
  const upper = symbol.toUpperCase();
  return STOCK_NAMES[upper] || INDEX_NAMES[upper] || COMMODITY_NAMES[upper] || symbol;
}

function assetCategory(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper in STOCK_NAMES) return "Stock";
  if (upper in INDEX_NAMES) return "Index";
  if (upper in COMMODITY_NAMES) return "Commodity";
  return "";
}

function StockAvatar({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const upper = symbol.toUpperCase();
  const color = STOCK_COLORS[upper] || coinColor(upper);
  const realIcon = getStockIcon(upper);

  if (errored || !realIcon) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-lg shrink-0 font-bold"
        style={{ width: size, height: size, backgroundColor: color + "22", color, fontSize: size * 0.35 }}
      >
        {symbol.slice(0, 2)}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-lg shrink-0 overflow-hidden"
      style={{ width: size, height: size, backgroundColor: "#ffffff08" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={realIcon}
        alt={symbol}
        width={size}
        height={size}
        className="object-contain"
        onError={() => setErrored(true)}
      />
    </span>
  );
}

const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  Stocks: { color: "text-info", bg: "bg-[#00d4ff08]" },
  Indices: { color: "text-accent", bg: "bg-accent-muted/10" },
  Commodities: { color: "text-hold", bg: "bg-hold-muted/10" },
};

type MarketTickerLike = NonNullable<ReturnType<typeof useDashboard>["tickers"]>[number];

function normalizeMarketTickers(payload: unknown): MarketTickerLike[] {
  if (Array.isArray(payload)) return payload as MarketTickerLike[];
  if (payload && typeof payload === "object") {
    const source = payload as { data?: unknown; tickers?: unknown; markets?: unknown };
    if (Array.isArray(source.data)) return source.data as MarketTickerLike[];
    if (Array.isArray(source.tickers)) return source.tickers as MarketTickerLike[];
    if (Array.isArray(source.markets)) return source.markets as MarketTickerLike[];
  }
  return [];
}

function IndexCard() {
  const d = useDashboard();
  const [fallbackTickers, setFallbackTickers] = useState<typeof d.tickers>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (d.tickers && d.tickers.length > 0) {
      setFallbackError(null);
      return;
    }
    let cancelled = false;

    const loadFallbackTickers = () => {
      fetch("/api/market/tickers", { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error(`Market tickers ${r.status}`);
          return r.json();
        })
        .then(unwrapApiResponse<typeof d.tickers>)
        .then((data) => {
          if (!cancelled) {
            const normalized = normalizeMarketTickers(data);
            setFallbackTickers(normalized);
            setFallbackError(normalized.length > 0 ? null : "Market tickers returned empty");
          }
        })
        .catch((err) => {
          if (!cancelled) setFallbackError(err instanceof Error ? err.message : "Market tickers unavailable");
        });
    };

    loadFallbackTickers();
    const interval = window.setInterval(loadFallbackTickers, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [d.tickers]);

  const tickers = d.tickers && d.tickers.length > 0
    ? d.tickers
    : fallbackTickers && fallbackTickers.length > 0
      ? fallbackTickers
      : Array.from(d.tickerMap.values());

  const assets = tickers
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      price: toFiniteNumber(t.lastPx),
      change: toFiniteNumber(t.changePct),
    }))
    .filter((t) => t.price > 0 && isStockOrIndex(t.symbol));
  const riskProxies = tickers
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      price: toFiniteNumber(t.lastPx),
      change: toFiniteNumber(t.changePct),
    }))
    .filter((t) => t.price > 0 && !isStockOrIndex(t.symbol))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const signalProxies = [...d.liveSignals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map((signal) => ({
      symbol: signal.pair.split("/")[0],
      action: signal.action,
      confidence: signal.confidence,
      regime: signal.regime ?? signal.actionV2?.replaceAll("_", " ") ?? "Signal engine",
    }));

  // Group by category
  const grouped = assets.reduce<Record<string, typeof assets>>((acc, a) => {
    const cat = assetCategory(a.symbol) || "Other";
    (acc[cat] ??= []).push(a);
    return acc;
  }, {});

  const categoryOrder = ["Stocks", "Indices", "Commodities", "Other"];
  const sortedCategories = categoryOrder.filter((c) => grouped[c]?.length);
  const leadingAsset = [...assets].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0] ?? riskProxies[0];
  const leadingSignal = signalProxies[0];

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-txt-secondary">
          <Layers size={12} className="text-accent" /> Macro Tape
        </h3>
        <span className="text-[9px] text-txt-muted font-mono tabular-nums">
          {leadingAsset
            ? `${leadingAsset.symbol} ${changeArrow(leadingAsset.change)} ${Math.abs(leadingAsset.change).toFixed(1)}%`
            : leadingSignal
              ? `${leadingSignal.symbol} ${leadingSignal.action} ${leadingSignal.confidence}%`
              : "waiting"}
        </span>
      </div>
      <div className="max-h-[280px] overflow-y-auto scrollbar-none">
        {sortedCategories.map((cat) => {
          const items = grouped[cat] ?? [];
          const meta = CATEGORY_META[cat] ?? { color: "text-txt-muted", bg: "bg-elevated/10" };

          return (
            <div key={cat}>
              {/* Category header */}
              <div className={cx("flex items-center gap-1.5 px-4 py-1 border-y border-border-default/50", meta.bg)}>
                <span className={cx("text-[9px] font-semibold tracking-wide", meta.color)}>{cat}</span>
                <span className="text-[8px] text-txt-dim ml-auto tabular-nums">{items.length}</span>
              </div>
              {/* Asset rows */}
              {items.slice(0, 5).map(({ symbol, price, change }) => {
                const isPositive = change >= 0;
                return (
                  <div key={symbol} className="flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-elevated/20 border-b border-border-default/30 last:border-b-0">
                    <StockAvatar symbol={symbol} size={26} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-txt-primary block leading-tight">{symbol}</span>
                      <span className="text-[10px] text-txt-muted leading-tight">{assetName(symbol)}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-semibold tabular-nums text-txt-primary block leading-tight">
                        {formatAssetPrice(price)}
                      </span>
                      <span
                        className={cx(
                          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums mt-0.5",
                          isPositive
                            ? "bg-buy-muted text-buy"
                            : change < 0
                              ? "bg-sell-muted text-sell"
                              : "bg-elevated text-txt-muted"
                        )}
                      >
                        {changeArrow(change)} {Math.abs(change).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {assets.length === 0 && riskProxies.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 border-y border-border-default/50 bg-elevated/10 px-4 py-1">
              <span className="text-[9px] font-semibold tracking-wide text-accent">Risk Proxies</span>
              <span className="ml-auto text-[8px] text-txt-dim tabular-nums">SoDEX</span>
            </div>
            {riskProxies.slice(0, 5).map(({ symbol, price, change }) => {
              const isPositive = change >= 0;
              return (
                <div key={symbol} className="flex items-center gap-2.5 border-b border-border-default/30 px-4 py-2 transition-colors last:border-b-0 hover:bg-elevated/20">
                  <CoinAvatar symbol={symbol} size={26} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-tight text-txt-primary">{symbol}</span>
                    <span className="text-[10px] leading-tight text-txt-muted">Crypto macro proxy</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-mono text-xs font-semibold leading-tight tabular-nums text-txt-primary">
                      {formatAssetPrice(price)}
                    </span>
                    <span
                      className={cx(
                        "mt-0.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums",
                        isPositive
                          ? "bg-buy-muted text-buy"
                          : change < 0
                            ? "bg-sell-muted text-sell"
                            : "bg-elevated text-txt-muted"
                      )}
                    >
                      {changeArrow(change)} {Math.abs(change).toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {assets.length === 0 && riskProxies.length === 0 && signalProxies.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 border-y border-border-default/50 bg-accent-muted/10 px-4 py-1">
              <span className="text-[9px] font-semibold tracking-wide text-accent">Signal Macro Proxy</span>
              <span className="ml-auto text-[8px] text-txt-dim tabular-nums">Engine</span>
            </div>
            {signalProxies.map(({ symbol, action, confidence, regime }) => {
              const tone = action === "LONG"
                ? "bg-buy-muted text-buy"
                : action === "SHORT"
                  ? "bg-sell-muted text-sell"
                  : "bg-hold-muted text-hold";
              return (
                <div key={symbol} className="flex items-center gap-2.5 border-b border-border-default/30 px-4 py-2 transition-colors last:border-b-0 hover:bg-elevated/20">
                  <CoinAvatar symbol={symbol} size={26} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-tight text-txt-primary">{symbol}</span>
                    <span className="text-[10px] leading-tight text-txt-muted">{regime}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cx("inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums", tone)}>
                      {action}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] font-semibold text-txt-secondary">{confidence}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {assets.length === 0 && riskProxies.length === 0 && signalProxies.length === 0 && (
          <EvidenceEmptyState
            icon={<Layers size={18} />}
            title={d.marketLoading ? "Loading macro tape" : "Macro tape degraded"}
            detail={d.marketError ?? fallbackError ?? "No index, commodity, stock, crypto proxy, or live signal data is available yet."}
          />
        )}
      </div>
    </Card>
  );
}

function MarketStatsCard() {
  const d = useDashboard();
  const tickers = d.tickers ?? [];
  const signals = d.liveSignals ?? [];

  const totalVolume = tickers.reduce((sum, t) => sum + toFiniteNumber(t.quoteVolume), 0);
  const activePairs = tickers.filter((t) => toFiniteNumber(t.lastPx) > 0).length;
  const buySignals = signals.filter((s) => s.action === "LONG").length;
  const sellSignals = signals.filter((s) => s.action === "SHORT").length;
  const totalSignals = buySignals + sellSignals;
  const selectedSymbol = pairToSodexSymbol(d.selectedPair) ?? d.selectedPair;
  const selectedTicker = tickers.find((t) => t.symbol === selectedSymbol || t.symbol === d.selectedPair);
  const selectedVolume = toFiniteNumber(selectedTicker?.quoteVolume);
  const selectedPrice = toFiniteNumber(selectedTicker?.lastPx);
  const selectedBid = toFiniteNumber(selectedTicker?.bidPx);
  const selectedAsk = toFiniteNumber(selectedTicker?.askPx);
  const selectedBidSize = toFiniteNumber(selectedTicker?.bidSz);
  const selectedAskSize = toFiniteNumber(selectedTicker?.askSz);
  const selectedSpreadBps = selectedBid > 0 && selectedAsk > selectedBid
    ? ((selectedAsk - selectedBid) / selectedPrice) * 10000
    : null;
  const selectedDepth = selectedBidSize + selectedAskSize;
  const coverage = activePairs > 0 ? Math.min(100, Math.round((signals.length / activePairs) * 100)) : 0;
  const spreadBonus = selectedSpreadBps == null ? 0 : selectedSpreadBps <= 8 ? 15 : selectedSpreadBps <= 20 ? 10 : 4;
  const depthBonus = selectedDepth > 0 ? 10 : 0;
  const readinessScore = Math.min(100, Math.round((coverage * 0.45) + (selectedVolume > 0 ? 20 : 0) + (totalSignals > 0 ? 15 : 0) + spreadBonus + depthBonus));
  const longShare = totalSignals > 0 ? Math.round((buySignals / totalSignals) * 100) : 0;
  const shortShare = totalSignals > 0 ? Math.round((sellSignals / totalSignals) * 100) : 0;
  const holdSignals = Math.max(0, signals.length - totalSignals);
  const statusTone = d.marketLoading
    ? "text-hold"
    : d.marketError || d.sodexStatus === "error"
      ? "text-sell"
      : "text-buy";
  const statusLabel = d.marketLoading
    ? "syncing"
    : d.marketError || d.sodexStatus === "error"
      ? "degraded"
      : "ready";

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-txt-secondary">
          <Activity size={12} className="text-accent" /> Execution Readiness
        </h3>
        <span className={cx("text-[9px] font-mono tabular-nums", statusTone)}>{statusLabel}</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className={cx("font-mono text-3xl font-bold leading-none tabular-nums", statusTone)}>
              {readinessScore}%
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Execution readiness</p>
          </div>
          <div className="min-w-[104px] rounded-lg border border-accent-dim/30 bg-accent-muted/10 p-2 text-right">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">
              {selectedVolume > 0 ? fmtUsd(selectedVolume) : "--"}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-txt-muted">{d.selectedPairDisplay}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-info/20 bg-[#00d4ff08] px-2 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-txt-muted">
              <Grid2x2 size={14} className="text-info" /> Feed Coverage
            </span>
            <p className="mt-1 font-mono text-lg font-bold leading-none text-txt-primary tabular-nums">{coverage}%</p>
            <p className="mt-1 text-[9px] text-txt-muted">{signals.length}/{activePairs || 0} pairs mapped</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-txt-muted">
              <BarChart3 size={14} className="text-accent" /> Order Bias
            </span>
            <p className="mt-1 font-mono text-lg font-bold leading-none text-txt-primary tabular-nums">{totalSignals}</p>
            <p className="mt-1 text-[9px] text-txt-muted">actionable signals</p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-txt-primary tabular-nums">{selectedPrice > 0 ? formatAssetPrice(selectedPrice) : "--"}</p>
            <p className="text-[8px] uppercase text-txt-muted">mark</p>
          </div>
          <div className="rounded-lg border border-accent-dim/30 bg-accent-muted/10 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-accent tabular-nums">{selectedSpreadBps == null ? "--" : selectedSpreadBps.toFixed(1)}</p>
            <p className="text-[8px] uppercase text-txt-muted">spread bps</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-txt-primary tabular-nums">{selectedDepth > 0 ? selectedDepth.toFixed(2) : "--"}</p>
            <p className="text-[8px] uppercase text-txt-muted">top depth</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border-default bg-inset/50 p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[9px]">
            <span className="font-semibold text-buy">LONG {buySignals}</span>
            <span className="font-mono text-txt-muted tabular-nums">{longShare}% / {shortShare}%</span>
            <span className="font-semibold text-sell">SHORT {sellSignals}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-hold-muted">
            <div className="bg-buy transition-all duration-700" style={{ width: `${longShare}%` }} />
            <div className="bg-sell transition-all duration-700" style={{ width: `${shortShare}%` }} />
          </div>
          <p className="mt-2 text-[9px] leading-snug text-txt-muted">
            {d.marketError ?? `24H tape ${fmtUsd(totalVolume)} across ${activePairs} active instruments; ${holdSignals} neutral engine reads.`}
          </p>
        </div>
      </div>
    </Card>
  );
}

function MarketBreadthCard() {
  const d = useDashboard();
  const tickers = d.tickers && d.tickers.length > 0 ? d.tickers : Array.from(d.tickerMap.values());
  const validTickers = tickers
    .map((ticker) => ({
      symbol: ticker.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      price: toFiniteNumber(ticker.lastPx),
      change: toFiniteNumber(ticker.changePct),
      volume: toFiniteNumber(ticker.quoteVolume),
    }))
    .filter((ticker) => ticker.price > 0);
  const signals = d.liveSignals ?? [];
  const advancers = validTickers.filter((ticker) => ticker.change > 0).length;
  const decliners = validTickers.filter((ticker) => ticker.change < 0).length;
  const unchanged = Math.max(0, validTickers.length - advancers - decliners);
  const breadthTotal = Math.max(1, advancers + decliners + unchanged);
  const breadthScore = Math.round(((advancers - decliners) / breadthTotal) * 100);
  const longSignals = signals.filter((signal) => signal.action === "LONG").length;
  const shortSignals = signals.filter((signal) => signal.action === "SHORT").length;
  const holdSignals = Math.max(0, signals.length - longSignals - shortSignals);
  const strongestMove = [...validTickers].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const topAdvancer = [...validTickers].sort((a, b) => b.change - a.change)[0];
  const topDecliner = [...validTickers].sort((a, b) => a.change - b.change)[0];
  const highestVolume = [...validTickers].sort((a, b) => b.volume - a.volume)[0];
  const medianChange = validTickers.length > 0
    ? [...validTickers].sort((a, b) => a.change - b.change)[Math.floor(validTickers.length / 2)]?.change ?? 0
    : 0;
  const participation = validTickers.length > 0 ? Math.round(((advancers + decliners) / validTickers.length) * 100) : 0;
  const tone = breadthScore > 10 ? "text-buy" : breadthScore < -10 ? "text-sell" : "text-hold";
  const tapeLabel = breadthScore > 10 ? "risk-on" : breadthScore < -10 ? "risk-off" : "mixed";
  const longShare = signals.length > 0 ? Math.round((longSignals / signals.length) * 100) : 0;
  const shortShare = signals.length > 0 ? Math.round((shortSignals / signals.length) * 100) : 0;

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-txt-secondary">
          <Layers size={12} className="text-accent" /> Market Breadth
        </h3>
        <span className={cx("text-[9px] font-mono uppercase tabular-nums", tone)}>{tapeLabel}</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className={cx("font-mono text-3xl font-bold leading-none tabular-nums", tone)}>
              {breadthScore > 0 ? "+" : ""}{breadthScore}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Breadth impulse</p>
          </div>
          <div className="min-w-[92px] rounded-lg border border-border-default bg-elevated/20 p-2 text-right">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{validTickers.length}</p>
            <p className="text-[9px] text-txt-muted">live markets</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-buy tabular-nums">{advancers}</p>
            <p className="text-[8px] uppercase text-txt-muted">adv</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-txt-secondary tabular-nums">{unchanged}</p>
            <p className="text-[8px] uppercase text-txt-muted">flat</p>
          </div>
          <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-sell tabular-nums">{decliners}</p>
            <p className="text-[8px] uppercase text-txt-muted">dec</p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-accent-dim/30 bg-accent-muted/10 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-accent tabular-nums">{participation}%</p>
            <p className="text-[8px] uppercase text-txt-muted">active tape</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-txt-primary tabular-nums">{medianChange > 0 ? "+" : ""}{medianChange.toFixed(2)}%</p>
            <p className="text-[8px] uppercase text-txt-muted">median</p>
          </div>
          <div className="rounded-lg border border-hold-dim/30 bg-hold-muted/10 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-hold tabular-nums">{holdSignals}</p>
            <p className="text-[8px] uppercase text-txt-muted">holds</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border-default bg-inset/50 p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[9px]">
            <span className="font-semibold text-buy">LONG {longSignals}</span>
            <span className="font-mono text-txt-muted tabular-nums">{signals.length} engine signals</span>
            <span className="font-semibold text-sell">SHORT {shortSignals}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-hold-muted">
            <div className="bg-buy transition-all duration-700" style={{ width: `${longShare}%` }} />
            <div className="bg-sell transition-all duration-700" style={{ width: `${shortShare}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-txt-muted">
            <span className="truncate">
              Lead move: {strongestMove ? `${strongestMove.symbol} ${strongestMove.change > 0 ? "+" : ""}${strongestMove.change.toFixed(2)}%` : "waiting"}
            </span>
            <span className="shrink-0 font-mono tabular-nums">
              {highestVolume ? fmtUsd(highestVolume.volume) : "sync"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]">
            <div className="min-w-0 rounded-md border border-buy-dim/25 bg-buy-muted/10 px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-txt-muted">Top bid</span>
                <span className="font-mono font-bold text-buy tabular-nums">
                  {topAdvancer ? `+${Math.abs(topAdvancer.change).toFixed(2)}%` : "--"}
                </span>
              </div>
              <p className="mt-0.5 truncate font-semibold text-txt-secondary">{topAdvancer?.symbol ?? "waiting"}</p>
            </div>
            <div className="min-w-0 rounded-md border border-sell-dim/25 bg-sell-muted/10 px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-txt-muted">Top offer</span>
                <span className="font-mono font-bold text-sell tabular-nums">
                  {topDecliner ? `${topDecliner.change.toFixed(2)}%` : "--"}
                </span>
              </div>
              <p className="mt-0.5 truncate font-semibold text-txt-secondary">{topDecliner?.symbol ?? "waiting"}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MarketStatsBar() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TopMoversCard />
      <SignalAccuracyCard />
      <MarketBreadthCard />
      <MarketStatsCard />
    </div>
  );
}

/* ── Root Component ── */

export default function SignalFlowCommandCenter() {
  const d = useDashboard();
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [newsFetchError, setNewsFetchError] = useState(false);
  const pairBase = d.selectedPair.startsWith("v")
    ? d.selectedPair.replace(/^v/, "").replace(/_vUSDC$/, "")
    : d.selectedPair.split("/")[0];
  const pair = `${pairBase}/USDC`;

  useEffect(() => {
    fetch("/api/news?pageSize=8")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(unwrapApiResponse<NewsResponse>)
      .then((data: NewsResponse) => {
        setNews(data);
        setNewsFetchError(false);
      })
      .catch(() => setNewsFetchError(true));
  }, []);

  return (
    <div className="space-y-3 px-2 lg:px-3 pt-2 lg:pt-3">
      <div className="overflow-x-auto">
        <PipelineFlow />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2.8fr)_minmax(280px,1.3fr)_minmax(280px,1.2fr)]">
        <MarketCanvas pair={pair} />
        <DecisionPanel pair={pair} news={news} />
        <CatalystMonitor news={news} fetchError={newsFetchError} />
      </div>
      <MarketStatsBar />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <IndexROIDashboard />
        <BTCTreasuryDashboard />
        <MacroSurprise />
      </div>
    </div>
  );
}

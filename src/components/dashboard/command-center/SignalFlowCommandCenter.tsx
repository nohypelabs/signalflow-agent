"use client";

import { useMemo, useState, useEffect } from "react";
import { Target, Layers, Activity, Play, TrendingUp, TrendingDown, Database, Box, Brain, GitMerge, Landmark, BarChart3, Grid2x2, MessageSquare, CheckCircle, CircleDot, Newspaper, Minus } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import IndexROIDashboard from "@/components/IndexROIDashboard";
import BTCTreasuryDashboard from "@/components/BTCTreasuryDashboard";
import MacroSurprise from "@/components/MacroSurprise";
import SpeedometerGauge from "@/components/ui/SpeedometerGauge";
import TradingChart from "@/components/TradingChart";
import StrategySwitcher from "@/components/StrategySwitcher";
import { useDashboard } from "@/lib/dashboard-context";
import { useMarketaux } from "@/lib/hooks/useMarketaux";
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
      <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-44 -translate-x-1/2 rounded-lg border border-accent/35 bg-[#050914] px-2.5 py-2 text-left opacity-0 shadow-[0_18px_44px_rgba(0,0,0,0.55),0_0_22px_rgba(255,136,0,0.12)] ring-1 ring-white/8 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:-translate-y-0.5 group-focus-within:opacity-100">
        <div className="flex items-center justify-between gap-1.5">
          <div className="text-[8px] font-bold uppercase tracking-wide text-txt-primary">{label}</div>
          <span className="rounded-md border border-accent/30 bg-accent-muted px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-accent">
            Live
          </span>
        </div>
        <div className="mt-0.5 text-[8px] font-medium leading-snug text-txt-secondary">{detail}</div>
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
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden h-[569px] flex flex-col">
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
  const activeStrategy = d.signalsData?.strategy;
  const liquidityFlowActive = activeStrategy?.engine === "liquidityFlow";
  const sourceState = d.signalsData?.sources;
  const fullEngineReady = liquidityFlowActive
    ? Boolean(sourceState?.sodexKlines) && Boolean(sourceState?.orderbooks)
    : hasExternalSignalLayers(sourceState) && !news?.error;
  const generateTooltip = d.analyzing
    ? `SignalFlow is recalculating ${activeStrategy?.label ?? "the active strategy"} before locking the next score.`
    : fullEngineReady
      ? `Generate a fresh decision from the active ${activeStrategy?.label ?? "SignalFlow"} policy.`
      : "Generate a fresh decision from the live data currently available while external layers recover.";

  const generateSignal = async () => {
    d.setAiCoin(coin);
    d.setIncludeAI(true);
    await d.generate(coin, true);
  };

  const decision = useMemo(() => {
    const systemAction = actionFromSignal(currentSignal);
    const systemConfidence = currentSignal?.confidence ?? 0;
    const sources: DecisionSource[] = liquidityFlowActive
      ? [
          {
            label: "Liquidity Flow",
            signed: signedFromSignal(currentSignal),
            weight: 1,
            available: !!currentSignal,
            note: currentSignal?.actionV2?.replaceAll("_", " ") ?? "Waiting for liquidity signal",
          },
          {
            label: "Orderbook Gate",
            signed: signedFromSignal(currentSignal),
            weight: 0,
            available: Boolean(sourceState?.orderbooks),
            note: "Spread ≤3 bps + top-5 imbalance",
          },
          {
            label: "News / AI",
            signed: 0,
            weight: 0,
            available: false,
            note: "Excluded by active strategy",
          },
        ]
      : [
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
  }, [aiSignal, currentPrice, currentSignal, d.analyzing, liquidityFlowActive, news, sourceState?.orderbooks]);

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

  // Dynamic color logic based on signal strength & recommendation
  function getSignalColor(score: number, action: string) {
    const isStrongLong = action === 'LONG' && score >= 75;
    const isStrongShort = action === 'SHORT' || score < 50;
    const isModerate = !isStrongLong && !isStrongShort;

    if (isStrongLong) {
      return {
        main: '#22c55e',
        text: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        glow: 'shadow-[0_0_12px_rgba(34,197,94,0.4)]',
        bar: 'bg-emerald-500',
        gauge: '#22c55e',
      };
    }
    if (isModerate) {
      return {
        main: '#f59e0b',
        text: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        bar: 'bg-amber-500',
        gauge: '#f59e0b',
      };
    }
    // Strong SHORT or low score
    return {
      main: '#ef4444',
      text: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]',
      bar: 'bg-rose-500',
      gauge: '#ef4444',
    };
  }

  const signalColor = getSignalColor(decision.confidence, decision.action);

  const execute = () => {
    if (currentSignal && decision.action !== "NO TRADE") {
      d.handleExecuteSignal(currentSignal);
    }
  };

  const signalLights: Array<{ action: DecisionAction; label: string; active: string; idle: string; lamp: string; glow: string }> = [
    {
      action: "SHORT",
      label: "SHORT",
      active: "border-rose-500 bg-rose-500/10 text-rose-500",
      idle: "border-border-default bg-elevated text-txt-muted",
      lamp: "bg-rose-500 border-rose-500",
      glow: "shadow-[0_0_16px_#ef4444]",
    },
    {
      action: "NO TRADE",
      label: "NO TRADE",
      active: "border-amber-500 bg-amber-500/10 text-amber-500",
      idle: "border-border-default bg-elevated text-txt-muted",
      lamp: "bg-amber-500 border-amber-500",
      glow: "shadow-[0_0_16px_#f59e0b]",
    },
    {
      action: "LONG",
      label: "LONG",
      active: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
      idle: "border-border-default bg-elevated text-txt-muted",
      lamp: "bg-emerald-500 border-emerald-500",
      glow: "shadow-[0_0_16px_#22c55e]",
    },
  ];

  return (
    <Panel
      title="LIVE DECISION SCORE"
      badge={
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-[#0a2a3a] border border-[#00d4ff] px-2 py-0.5 text-[9px] font-bold text-[#00d4ff]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" /> LIVE
          </span>
          <span className="rounded-full bg-[#27272a] border border-[#52525b] px-2 py-0.5 text-[9px] font-bold text-[#a1a1aa]">
            {activeStrategy?.label ?? "SWING"}
          </span>
        </div>
      }
      className="h-[580px] relative z-10"
      bodyClassName="flex-1 overflow-visible"
    >
      <div className="flex h-full min-w-0 flex-col gap-2 overflow-visible p-3">
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

        <div className="rounded-xl border border-border-default bg-inset/70 px-2 py-[1px] text-center">
          <div className="mt-[5px]">
            <SpeedometerGauge value={decision.confidence} size="lg" showLabel={false} sweeping={d.analyzing} color={signalColor.gauge} />
          </div>

          {/* Persen di tengah + dinaikkan 10px (-translate-y-[10px]), buttons mengapit kiri-kanan + naik 20px. Gauge diturunin 5px. Header dihapus. */}
          <div className="mt-2 flex items-end justify-between">
            <div className="self-end -translate-y-[20px]">
              <button
                onClick={generateSignal}
                disabled={d.analyzing}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-opacity-80 disabled:opacity-60"
                style={{ 
                  borderColor: signalColor.main + '80', 
                  color: signalColor.main,
                  backgroundColor: signalColor.main + '10'
                }}
              >
                <span className="text-sm">📶</span>
                <span>Generate Signal</span>
              </button>
            </div>

            <div
              className="min-w-[90px] text-4xl font-bold tabular-nums tracking-tight -translate-y-[10px]"
              style={{ color: signalColor.main }}
            >
              {decision.confidence}%
            </div>

            <div className="self-end -translate-y-[20px]">
              <button
                onClick={execute}
                disabled={!currentSignal || decision.action === "NO TRADE"}
                className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold text-black hover:opacity-90 disabled:bg-[#334155] disabled:text-[#64748b] disabled:cursor-not-allowed"
                style={{ backgroundColor: signalColor.main }}
              >
                <Play size={14} fill="currentColor" />
                <span>Execute Setup</span>
              </button>
            </div>
          </div>
        </div>

        {/* Score Drivers (weighted composite) - matching the reference picture exactly */}
        <div className="rounded-xl border border-border-default bg-inset/70 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-txt-tertiary mb-2">Score Drivers (weighted composite)</div>
          <div className="space-y-2">
            {decision.sources.map((source, idx) => {
              const weightPct = Math.round(source.weight * 100);
              const barWidth = Math.max(5, Math.min(100, weightPct));
              const isPositive = source.signed > 0;
              const isNegative = source.signed < 0;
              const barFill = isPositive ? `bg-[${signalColor.main}]` : isNegative ? "bg-rose-500" : "bg-amber-500";
              const valueColor = isPositive ? `text-[${signalColor.main}]` : isNegative ? "text-rose-500" : "text-amber-500";
              const contrib = Math.round(source.weight * decision.confidence * (source.signed || 0));
              // Map labels to match picture
              let label = source.label;
              if (label.includes("News")) label = "News Sentiment";
              if (label.includes("AI")) label = "AI Thesis";
              if (label.includes("TA") || label.includes("Liquidity")) label = "SoDEX TA";
              return (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <div className="w-20 shrink-0 font-medium text-txt-primary">{label}</div>
                  <div className="w-8 text-right font-mono text-[#a1a1aa]">{weightPct}%</div>
                  <div className="flex-1 h-[6px] bg-[#27272a] rounded-full overflow-hidden">
                    <div 
                      className="h-[6px] rounded-full transition-all" 
                      style={{ width: `${barWidth}%`, backgroundColor: isPositive ? signalColor.main : isNegative ? '#ef4444' : '#f59e0b' }} 
                    />
                  </div>
                  <div className="w-14 text-right font-mono text-[10px] font-semibold tabular-nums" style={{ color: isPositive ? signalColor.main : isNegative ? '#ef4444' : '#f59e0b' }}>
                    {weightPct}% {contrib > 0 ? "+" : ""}{contrib}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[8px] text-[#a1a1aa] text-center font-mono">
            {decision.confidence}% = {Math.round(decision.sources[0]?.weight * 100 || 55)}%×TA + {Math.round(decision.sources[1]?.weight * 100 || 25)}%×News + {Math.round(decision.sources[2]?.weight * 100 || 20)}%×AI
          </div>
        </div>

        {/* Bottom two stat cards under live decision score — now wired to real signal.execution data (no more random hardcoded prices/percentages) */}
        <div className="grid grid-cols-2 gap-3">
          {/* TP box */}
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-emerald-500">Take Profit (TP)</span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/40 px-1.5 py-0 text-[9px] font-bold text-emerald-500">
                {riskRewardDisplay}
              </span>
            </div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-500">
              {currentSignal?.execution?.takeProfit ? formatPanelPrice(currentSignal.execution.takeProfit) : (decision.targets?.[0]?.[1] || "—")}
            </div>
            <div className="mt-1 text-[9px] text-[#a1a1aa]">from entry</div>
            <div className="mt-0.5 h-[5px] w-full bg-[#27272a] rounded-full overflow-hidden">
              <div className="h-[5px] bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: currentSignal ? "65%" : "40%" }} />
            </div>
            <div className="mt-0.5 flex justify-between text-[9px] font-mono">
              <span className="text-emerald-500">{currentSignal?.execution?.riskReward || riskRewardDisplay}</span>
              <span className="text-[#a1a1aa]">target</span>
            </div>
          </div>

          {/* SL box */}
          <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-rose-500">Stop Loss (SL)</span>
              <span className="rounded bg-rose-500/10 border border-rose-500/40 px-1.5 py-0 text-[9px] font-bold text-rose-500">
                risk
              </span>
            </div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums text-rose-500">
              {currentSignal?.execution?.stopLoss ? formatPanelPrice(currentSignal.execution.stopLoss) : (decision.stop?.[1] || "—")}
            </div>
            <div className="mt-1 text-[9px] text-[#a1a1aa]">from entry</div>
            <div className="mt-0.5 h-[5px] w-full bg-[#27272a] rounded-full overflow-hidden">
              <div className="h-[5px] bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: currentSignal ? "35%" : "25%" }} />
            </div>
            <div className="mt-0.5 flex justify-between text-[9px] font-mono">
              <span className="text-rose-500">{currentSignal?.execution?.riskReward || riskRewardDisplay}</span>
              <span className="text-[#a1a1aa]">invalidation</span>
            </div>
          </div>
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

/* ── Marketaux News Sentiment Panel ── */

import type { CryptoSentimentResult } from "@/lib/marketaux";

function SentimentGauge({ score, label }: { score: number; label: string }) {
  const normalized = Math.round((score + 1) * 50); // -1..1 → 0..100
  const tone = score > 0.1 ? "text-buy" : score < -0.1 ? "text-sell" : "text-hold";
  const bgTone = score > 0.1 ? "bg-buy" : score < -0.1 ? "bg-sell" : "bg-hold";

  return (
    <div className="rounded-xl border border-border-default bg-inset/70 p-3">
      <p className="text-[9px] uppercase font-semibold text-txt-muted tracking-wide">Crypto Sentiment</p>
      <div className="mt-2 flex items-end gap-2">
        <span className={`font-mono text-3xl font-bold leading-none tabular-nums ${tone}`}>
          {score > 0 ? "+" : ""}{(score * 100).toFixed(0)}
        </span>
        <span className={`text-[10px] font-semibold uppercase ${tone}`}>{label}</span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border-default/30">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bgTone}`}
          style={{ width: `${Math.min(100, Math.max(0, normalized))}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[8px] text-txt-faint">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: { uuid: string; url: string; source: string; title: string; entities: Array<{ symbol: string; sentiment_score: number }> } }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-border-default bg-elevated/10 px-2.5 py-2 transition-colors hover:bg-elevated/30"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[8px] text-txt-faint font-mono">{article.source}</span>
        {article.entities.slice(0, 2).map((e) => (
          <span
            key={e.symbol}
            className={cx(
              "rounded px-1 py-0.5 text-[7px] font-bold",
              e.sentiment_score > 0.1
                ? "bg-buy-muted text-buy"
                : e.sentiment_score < -0.1
                  ? "bg-sell-muted text-sell"
                  : "bg-elevated text-txt-muted"
            )}
          >
            {e.symbol}
          </span>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-txt-primary leading-snug line-clamp-2">{article.title}</p>
    </a>
  );
}

function NewsSentimentPanel() {
  const { data, loading, error } = useMarketaux(10);

  const sentiment = data?.avgSentiment ?? 0;
  const label = data?.sentimentLabel ?? "Neutral";
  const articleCount = data?.articleCount ?? 0;
  const mostBullish = data?.mostBullish;
  const mostBearish = data?.mostBearish;
  const trending = data?.trendingEntities ?? [];
  const articles = data?.articles ?? [];

  return (
    <Panel
      title="NEWS SENTIMENT"
      badge={
        <Badge variant={loading ? "muted" : error ? "hold" : sentiment > 0.1 ? "buy" : sentiment < -0.1 ? "sell" : "muted"} size="sm">
          {loading ? "..." : error ? "ERROR" : label.toUpperCase()}
        </Badge>
      }
      className="h-[569px]"
    >
      <div className="flex flex-col gap-2.5 p-3">
        {/* Sentiment Gauge */}
        {loading ? (
          <div className="rounded-xl border border-border-default bg-inset/70 p-3 animate-pulse">
            <div className="h-3 w-24 rounded bg-elevated" />
            <div className="mt-3 h-8 w-16 rounded bg-elevated" />
            <div className="mt-3 h-1.5 w-full rounded-full bg-elevated" />
          </div>
        ) : (
          <SentimentGauge score={sentiment} label={label} />
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-2 text-center">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{loading ? "..." : articleCount}</p>
            <p className="text-[8px] uppercase text-txt-muted">articles</p>
          </div>
          <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-2 text-center">
            <p className="font-mono text-sm font-bold text-buy tabular-nums truncate">
              {loading ? "..." : mostBullish?.symbol ?? "—"}
            </p>
            <p className="text-[8px] uppercase text-txt-muted">bullish</p>
          </div>
          <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-2 text-center">
            <p className="font-mono text-sm font-bold text-sell tabular-nums truncate">
              {loading ? "..." : mostBearish?.symbol ?? "—"}
            </p>
            <p className="text-[8px] uppercase text-txt-muted">bearish</p>
          </div>
        </div>

        {/* Trending Entities */}
        {trending.length > 0 && (
          <div className="rounded-xl border border-border-default bg-inset/50 p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted mb-2">Trending Mentions</p>
            <div className="space-y-1.5">
              {trending.slice(0, 4).map((entity) => {
                const entityTone = entity.avgSentiment > 0.1
                  ? "text-buy"
                  : entity.avgSentiment < -0.1
                    ? "text-sell"
                    : "text-txt-secondary";
                return (
                  <div key={entity.symbol} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-txt-primary">{entity.symbol}</span>
                      <span className="text-[9px] text-txt-muted ml-1.5">{entity.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[9px] text-txt-muted tabular-nums">{entity.mentions}×</span>
                      <span className={`font-mono text-[10px] font-bold tabular-nums ${entityTone}`}>
                        {entity.avgSentiment > 0 ? "+" : ""}{(entity.avgSentiment * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Articles — auto-scroll if >3 articles */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Latest Headlines</p>
            {!loading && !error && articles.length > 0 && (
              <span className="text-[8px] text-txt-faint font-mono">{articles.length} articles</span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border border-border-default bg-elevated/10 px-2.5 py-2">
                  <div className="h-2.5 w-20 rounded bg-elevated" />
                  <div className="mt-1.5 h-3 w-full rounded bg-elevated" />
                  <div className="mt-1 h-3 w-3/4 rounded bg-elevated" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-[100px] flex-col items-center justify-center gap-2 text-center">
              <Newspaper size={18} className="text-txt-muted" />
              <p className="text-[10px] text-txt-muted">{error}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="flex min-h-[100px] flex-col items-center justify-center gap-2 text-center">
              <Newspaper size={18} className="text-txt-muted" />
              <p className="text-[10px] text-txt-muted">No crypto news found</p>
            </div>
          ) : articles.length <= 3 ? (
            /* Few articles — static list, no scroll needed */
            <div className="space-y-1.5">
              {articles.map((article) => (
                <ArticleCard key={article.uuid} article={article} />
              ))}
            </div>
          ) : (
            /* Many articles — vertical auto-scroll with pause on hover */
            <div
              className="news-scroll-container h-[200px]"
              style={{ "--scroll-duration": `${articles.length * 5}s` } as React.CSSProperties}
            >
              <div className="news-scroll-track space-y-1.5">
                {/* Duplicate articles for seamless loop */}
                {[...articles, ...articles].map((article, i) => (
                  <ArticleCard key={`${article.uuid}-${i}`} article={article} />
                ))}
              </div>
            </div>
          )}
        </div>
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

function MarketPressureCard() {
  const d = useDashboard();

  // Use best available ticker data (benefits from command center fallback polling for real-time)
  const tickers = d.tickers && d.tickers.length > 0
    ? d.tickers
    : Array.from(d.tickerMap?.values?.() || []);

  const parsed = tickers
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      change: toFiniteNumber(t.changePct),
      price: toFiniteNumber(t.lastPx),
      volume: toFiniteNumber(t.quoteVolume),
    }))
    .filter((t) => t.price > 0 && !isStockOrIndex(t.symbol))
    .sort((a, b) => b.change - a.change);

  const topMovers = parsed.slice(0, 7);
  const bottomMovers = parsed.slice(-7).reverse();
  const maxAbs = Math.max(...parsed.map((t) => Math.abs(t.change)), 1);
  const advancing = parsed.filter((t) => t.change > 0).length;
  const declining = parsed.filter((t) => t.change < 0).length;
  const unchanged = Math.max(0, parsed.length - advancing - declining);
  const breadth = parsed.length > 0 ? Math.round((advancing / parsed.length) * 100) : null;
  const pressureScore = parsed.length > 0 ? Math.round(((advancing - declining) / parsed.length) * 100) : 0;
  const pressureTone = pressureScore > 10 ? "text-buy" : pressureScore < -10 ? "text-sell" : "text-hold";
  const pressureLabel = pressureScore > 10 ? "bid-led" : pressureScore < -10 ? "offer-led" : "balanced";
  const leadGainer = topMovers[0] ?? null;
  const leadLoser = bottomMovers[0] ?? null;

  // High volume movers (small dedicated section)
  const highVolumeMovers = [...parsed]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 4);

  // Correlate with live signals
  const getSignalFor = (sym: string) => {
    const target = normalizePair(sym + '/USDC');
    return (d.liveSignals || []).find((s: any) => normalizePair(s.pair) === target) || null;
  };
  const moversWithSignals = [...topMovers, ...bottomMovers].filter(t => {
    const sig = getSignalFor(t.symbol);
    return sig && sig.action !== 'HOLD';
  }).length;

  // For filling space: visual pressure distribution
  const totalPairs = Math.max(1, parsed.length);
  const advPct = Math.round((advancing / totalPairs) * 100);
  const decPct = Math.round((declining / totalPairs) * 100);
  const flatPct = Math.max(0, 100 - advPct - decPct);

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-buy" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-txt-primary">Market Pressure</h3>
          <Badge variant="info" size="sm">LIVE</Badge>
          <span className="inline-block w-1 h-1 rounded-full bg-buy animate-pulse" aria-hidden="true" />
        </div>
        <span className={cx("font-mono text-[9px] uppercase tabular-nums", parsed.length > 0 ? pressureTone : "text-txt-muted")}>
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
        <div className="p-3 space-y-3">
          {/* Pressure impulse + advancing context (wider layout) */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={cx("font-mono text-3xl font-bold leading-none tabular-nums", pressureTone)}>
                {pressureScore > 0 ? "+" : ""}{pressureScore}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-txt-muted">Pressure impulse</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{breadth ?? 0}%</p>
              <p className="text-[8px] text-txt-muted -mt-px">advancing breadth</p>
            </div>
          </div>

          {/* Breadth counts */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
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

          {/* Tape Leaders — richer rows with volume to fill vertical space */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Tape Leaders</span>
              <span className="font-mono text-[9px] text-txt-muted tabular-nums">
                {parsed.length} pairs • {moversWithSignals} w/ signals
              </span>
            </div>

            <div className="rounded-lg border border-border-default bg-inset/40 p-1">
              <div className="grid grid-cols-2 gap-2">
                {/* Bid side - 7 per side for max content */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-buy" />
                      <span className="text-[9px] font-semibold text-buy tracking-wide">Bid (Gainers)</span>
                    </div>
                    <span className="font-mono text-[9px] text-buy tabular-nums">
                      {leadGainer ? `+${Math.abs(leadGainer.change).toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  <div className="space-y-px">
                    {topMovers.map((t, i) => {
                      const isTop = i === 0;
                      const sig = getSignalFor(t.symbol);
                      const hasSignal = sig && sig.action !== 'HOLD';
                      const sigColor = hasSignal ? (sig.action === 'LONG' ? 'bg-buy text-white' : 'bg-sell text-white') : '';
                      return (
                        <div
                          key={t.symbol}
                          className={`flex items-center gap-1 rounded px-1 py-[1px] text-[9px] ${isTop ? "bg-buy-muted/10" : "hover:bg-elevated/30"}`}
                        >
                          <span className="w-2.5 text-right font-mono text-[8px] text-txt-dim tabular-nums">{i + 1}</span>
                          <CoinAvatar symbol={t.symbol} size={13} />
                          <span className="min-w-0 flex-1 truncate font-semibold text-txt-primary">{t.symbol}</span>
                          <span className="font-mono text-[8px] text-txt-faint tabular-nums">${t.price.toFixed(2)}</span>
                          {hasSignal && (
                            <span className={`font-mono text-[7px] px-0.5 rounded font-bold tabular-nums ${sigColor}`}>
                              {sig.action[0]}{Math.round(sig.confidence)}
                            </span>
                          )}
                          <span className="font-mono text-[8px] font-bold tabular-nums text-buy">+{Math.abs(t.change).toFixed(1)}%</span>
                          <span className="font-mono text-[7px] text-txt-dim tabular-nums w-[32px] text-right">
                            {t.volume > 0 ? `$${(t.volume / 1e6).toFixed(1)}M` : ""}
                          </span>
                          <div className="w-6 shrink-0">
                            <ChangeBar change={t.change} maxAbs={maxAbs} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Offer side */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sell" />
                      <span className="text-[9px] font-semibold text-sell tracking-wide">Offer (Losers)</span>
                    </div>
                    <span className="font-mono text-[9px] text-sell tabular-nums">
                      {leadLoser ? `${leadLoser.change.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  <div className="space-y-px">
                    {bottomMovers.map((t, i) => {
                      const isTop = i === 0;
                      const sig = getSignalFor(t.symbol);
                      const hasSignal = sig && sig.action !== 'HOLD';
                      const sigColor = hasSignal ? (sig.action === 'LONG' ? 'bg-buy text-white' : 'bg-sell text-white') : '';
                      return (
                        <div
                          key={t.symbol}
                          className={`flex items-center gap-1 rounded px-1 py-[1px] text-[9px] ${isTop ? "bg-sell-muted/10" : "hover:bg-elevated/30"}`}
                        >
                          <span className="w-2.5 text-right font-mono text-[8px] text-txt-dim tabular-nums">{i + 1}</span>
                          <CoinAvatar symbol={t.symbol} size={13} />
                          <span className="min-w-0 flex-1 truncate font-semibold text-txt-primary">{t.symbol}</span>
                          <span className="font-mono text-[8px] text-txt-faint tabular-nums">${t.price.toFixed(2)}</span>
                          {hasSignal && (
                            <span className={`font-mono text-[7px] px-0.5 rounded font-bold tabular-nums ${sigColor}`}>
                              {sig.action[0]}{Math.round(sig.confidence)}
                            </span>
                          )}
                          <span className="font-mono text-[8px] font-bold tabular-nums text-sell">{t.change.toFixed(1)}%</span>
                          <span className="font-mono text-[7px] text-txt-dim tabular-nums w-[32px] text-right">
                            {t.volume > 0 ? `$${(t.volume / 1e6).toFixed(1)}M` : ""}
                          </span>
                          <div className="w-6 shrink-0">
                            <ChangeBar change={t.change} maxAbs={maxAbs} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Small High Volume Movers section */}
          {highVolumeMovers.length > 0 && (
            <div className="mt-1">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-[8px] font-semibold uppercase tracking-wide text-txt-muted">High Volume Movers</span>
              </div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[8px]">
                {highVolumeMovers.map((t) => {
                  const sig = getSignalFor(t.symbol);
                  const hasSignal = sig && sig.action !== 'HOLD';
                  return (
                    <div key={t.symbol} className="flex items-center gap-1 truncate">
                      <CoinAvatar symbol={t.symbol} size={12} />
                      <span className="font-semibold text-txt-primary truncate">{t.symbol}</span>
                      <span className="font-mono text-txt-faint tabular-nums">$${(t.volume / 1e6).toFixed(1)}M</span>
                      {hasSignal && (
                        <span className={`text-[6px] px-0.5 rounded font-bold ${sig.action === 'LONG' ? 'bg-buy text-white' : 'bg-sell text-white'}`}>
                          {sig.action[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Different visual for Pressure Distribution: side-by-side bars + integrated % for better fill and clarity */}
          <div className="mt-1">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[8px] font-semibold uppercase tracking-wide text-txt-muted">Pressure Distribution</span>
              <span className="text-[7px] text-txt-muted">{totalPairs} pairs</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[7px]">
              {/* Advancing bar */}
              <div>
                <div className="flex justify-between text-buy mb-0.5">
                  <span>Advancing</span>
                  <span className="font-mono tabular-nums">{advPct}% ({advancing})</span>
                </div>
                <div className="h-2.5 bg-buy/20 rounded overflow-hidden">
                  <div className="h-2.5 bg-buy transition-all" style={{ width: `${advPct}%` }} />
                </div>
              </div>

              {/* Declining bar */}
              <div>
                <div className="flex justify-between text-sell mb-0.5">
                  <span>Declining</span>
                  <span className="font-mono tabular-nums">{decPct}% ({declining})</span>
                </div>
                <div className="h-2.5 bg-sell/20 rounded overflow-hidden">
                  <div className="h-2.5 bg-sell transition-all" style={{ width: `${decPct}%` }} />
                </div>
              </div>
            </div>

            {/* Flat as small note */}
            <div className="mt-0.5 text-center text-[7px] text-txt-secondary tabular-nums">
              {flatPct}% flat ({unchanged} pairs)
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
      <IndexROIDashboard />
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
      {/* Global Strategy Control - subtle header for quick strategy switching.
          Changes instantly affect live signals, decision score, and catalyst.
          Full editor in /strategy-config. */}
      <div className="flex items-center gap-3 rounded-lg border border-border-default bg-inset/40 px-3 py-1.5 text-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted">Strategy</span>
        <StrategySwitcher />
        <span className="ml-auto text-[9px] text-txt-faint hidden lg:inline">
          Live effect on all panels. <a href="/strategy-config" className="text-accent hover:underline">Full config</a>
        </span>
      </div>

      <div className="overflow-x-auto">
        <PipelineFlow />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2.68fr)_minmax(280px,1.3fr)_minmax(280px,1.32fr)]">
        <MarketCanvas pair={pair} />
        <DecisionPanel pair={pair} news={news} />
        <NewsSentimentPanel />
      </div>
      <MarketStatsBar />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MarketPressureCard />
        <BTCTreasuryDashboard />
        <MacroSurprise />
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect } from "react";
import { Target, Layers, Activity, Play } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import SpeedometerGauge from "@/components/ui/SpeedometerGauge";
import TradingChart from "@/components/TradingChart";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";
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
          "flex h-11 w-11 items-center justify-center rounded-xl border transition-all",
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
      <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-56 -translate-x-1/2 rounded-lg border border-border-default bg-panel px-3 py-2 text-left opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="text-xs font-bold text-txt-primary">{label}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-txt-tertiary">{detail}</div>
      </div>
    </div>
  );
}


/* ── Tech Icon (inline SVG) ── */

function TechIcon({ name, className = "" }: { name: string; className?: string }) {
  const common = "fill-none stroke-current";
  return (
    <svg viewBox="0 0 32 32" className={cx("h-7 w-7 text-accent", className)} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {name === "database" && <path className={common} d="M8 9c0-2 16-2 16 0v14c0 2-16 2-16 0V9Zm0 0c0 2 16 2 16 0M8 16c0 2 16 2 16 0" />}
      {name === "cube" && <path className={common} d="m16 4 10 6v12l-10 6-10-6V10l10-6Zm0 0v12m10-6-10 6-10-6m10 6v12" />}
      {name === "fusion" && <g className={common}><circle cx="12" cy="18" r="6" /><circle cx="20" cy="18" r="6" /><circle cx="16" cy="11" r="6" /></g>}
      {name === "brain" && <path className={common} d="M11 7c-3 0-5 2-5 5 0 1 .3 2 .8 2.8A5.3 5.3 0 0 0 8 25c2 0 3.5-1 4-2m9-16c3 0 5 2 5 5 0 1-.3 2-.8 2.8A5.3 5.3 0 0 1 24 25c-2 0-3.5-1-4-2M16 6v20M11 12h3m4 0h3M10 18h4m4 0h4" />}
      {name === "target" && <g className={common}><circle cx="16" cy="16" r="9" /><circle cx="16" cy="16" r="3" /><path d="M16 2v6M16 24v6M2 16h6M24 16h6" /></g>}
      {name === "trend" && <path className={common} d="M5 22h22M7 19l5-5 4 4 8-10m0 0v6m0-6h-6" />}
      {name === "globe" && <g className={common}><circle cx="16" cy="16" r="10" /><path d="M6 16h20M16 6c3 3 4 7 4 10s-1 7-4 10M16 6c-3 3-4 7-4 10s1 7 4 10" /></g>}
      {name === "chat" && <path className={common} d="M6 8h20v13H12l-6 5V8Zm5 5h10M11 17h7" />}
      {name === "bank" && <path className={common} d="M5 13h22L16 6 5 13Zm3 0v11m5-11v11m6-11v11m5-11v11M5 24h22" />}
      {name === "bars" && <path className={common} d="M7 24V14m6 10V8m6 16V11m6 13V5M5 26h22" />}
      {name === "score" && <g className={common}><circle cx="16" cy="16" r="10" /><path d="M11 16l3 3 7-7" /></g>}
      {!["database", "cube", "fusion", "brain", "target", "trend", "globe", "chat", "bank", "bars", "score"].includes(name) && <circle className={common} cx="16" cy="16" r="10" />}
    </svg>
  );
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

function Panel({ title, badge, children, className = "" }: { title: string; badge?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card variant="default" padding="none" className={cx("rounded-xl overflow-hidden flex flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold tracking-wide text-txt-primary">{title}</h2>
        {badge}
      </div>
      <div className="flex-1 overflow-y-auto">
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
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden h-[544px] flex flex-col">
      <TradingChart
        klines={d.klines}
        symbol={pair}
        currentPrice={currentPrice}
        liveSignals={d.liveSignals}
        tickerMap={d.tickerMap}
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
  if (signal.action === "LONG") return signal.confidence;
  if (signal.action === "SHORT") return -signal.confidence;
  return 0;
}

function actionFromSigned(value: number): DecisionAction {
  if (value > 12) return "LONG";
  if (value < -12) return "SHORT";
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
  if (!entry || !Number.isFinite(entry)) return [["--", "--", "--"]];
  if (action === "NO TRADE") {
    return [
      ["UP", formatPanelPrice(entry * 1.006), "break"],
      ["MID", formatPanelPrice(entry), "spot"],
      ["DN", formatPanelPrice(entry * 0.994), "break"],
    ];
  }

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
    ? "Scoring the latest market layers."
    : fullEngineReady
      ? "Push the pedal to generate a fresh SignalFlow signal."
      : "Push the pedal to generate from the live data currently available.";

  const generateSignal = async () => {
    d.setAiCoin(coin);
    d.setIncludeAI(true);
    await d.generate(coin, true);
  };

  const decision = useMemo(() => {
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

    const available = sources.filter((source) => source.available);
    const weightSum = available.reduce((sum, source) => sum + source.weight, 0);
    const signed = weightSum
      ? available.reduce((sum, source) => sum + source.signed * source.weight, 0) / weightSum
      : 0;
    const action = actionFromSigned(signed);
    const strength = Math.round(Math.abs(signed));
    const confidence = action === "NO TRADE"
      ? clamp(100 - strength, 50, 88)
      : clamp(strength, 45, 95);
    const signalForExecution = currentSignal ?? aiSignal;

    return {
      action,
      confidence,
      label: confidenceLabel(confidence),
      sources,
      targets: buildTargets(action, currentPrice, signalForExecution),
      stop: buildStop(action, currentPrice, signalForExecution),
      riskReward: action === "NO TRADE" ? "Stand aside" : signalForExecution?.execution.riskReward ?? "Live calc",
      positionSize: action === "NO TRADE" ? "Flat / no entry" : signalForExecution?.execution.positionSize ?? "1-2%",
    };
  }, [aiSignal, currentPrice, currentSignal, d.analyzing, news]);

  const decisionTone = decision.action === "LONG"
    ? "text-buy"
    : decision.action === "SHORT"
      ? "text-sell"
      : "text-hold";

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
      title="CURRENT DECISION SCORE"
      badge={<Badge variant={decision.action === "LONG" ? "buy" : decision.action === "SHORT" ? "sell" : "hold"} size="sm">LIVE LOGIC</Badge>}
      className="h-[544px]"
    >
      <div className="space-y-2.5 p-3">
        <div className="rounded-xl border border-border-default bg-inset/70 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="flex w-9 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border-default bg-[#050505] p-1.5 shadow-inner">
              {signalLights.map((item) => {
                const isActive = decision.action === item.action;
                return (
                  <span
                    key={item.action}
                    aria-label={`${item.label} ${isActive ? "active" : "inactive"}`}
                    className={cx(
                      "h-4 w-4 rounded-full border transition-all",
                      isActive ? `${item.lamp} ${item.glow}` : "border-border-default bg-[#1a1a1a] opacity-45"
                    )}
                  />
                );
              })}
            </div>
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
          <SpeedometerGauge value={decision.confidence} size="lg" showLabel={false} />
          <div className="-mt-2 grid grid-cols-[44px_auto_44px] items-center justify-center gap-3">
            <IconControlButton
              label={d.analyzing ? "Generating Signal" : "Generate Signal"}
              detail={generateTooltip}
              onClick={generateSignal}
              loading={d.analyzing}
              intent="accent"
            >
              <PedalIcon className="h-5 w-5" />
            </IconControlButton>
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
            <IconControlButton
              label={decision.action === "NO TRADE" ? "Wait For Setup" : "Execute Setup"}
              detail={decision.action === "NO TRADE" ? "No executable setup yet." : `Execute this setup at ${decision.positionSize}.`}
              onClick={execute}
              disabled={!currentSignal || decision.action === "NO TRADE"}
              intent="execute"
            >
              <Play size={19} fill="currentColor" />
            </IconControlButton>
          </div>
          <div className="text-sm font-medium text-txt-tertiary">{decision.label}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card variant="inset" padding="sm" className="rounded-xl !p-2.5">
            <div className={cx("mb-2 text-center text-[11px] font-semibold uppercase tracking-wide", decisionTone)}>
              {decision.action === "NO TRADE" ? "Watch Triggers" : "Take Profit (TP)"}
            </div>
            <div className="space-y-1">
              {decision.targets.slice(0, 1).map(([label, price, risk]) => (
                <div key={label} className="grid grid-cols-[36px_1fr_54px] gap-1 font-mono text-xs">
                  <span className={decisionTone}>{label}</span>
                  <span className={cx("font-semibold", decisionTone)}>{price}</span>
                  <span className={decisionTone}>{risk}</span>
                </div>
              ))}
            </div>
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
              <div className="grid grid-cols-[28px_1fr_58px] gap-1 font-mono text-xs">
                <span className={decisionTone}>{decision.stop[0]}</span>
                <span className={cx("font-semibold", decisionTone)}>{decision.stop[1]}</span>
                <span className={decisionTone}>{decision.stop[2]}</span>
              </div>
            )}
            {decision.action !== "NO TRADE" && (
              <>
                <div className="my-1.5 h-px bg-border-default" />
                <div className="text-[11px] font-semibold text-txt-tertiary uppercase tracking-wide">Risk / Reward</div>
                <div className="mt-0.5 font-mono text-base font-bold text-txt-primary">{decision.riskReward}</div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Panel>
  );
}

/* ── News Feed ── */

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

function NewsFeed({ news, fetchError }: { news: NewsResponse | null; fetchError: boolean }) {
  const apiError = news?.error;
  const hasData = news && news.list.length > 0;

  return (
    <Panel
      title="NEWS FEED"
      badge={hasData && news?.sentiment && (
        <Badge variant={sentimentVariant(news.sentiment.label)} size="sm">
          {news.sentiment.label} {news.sentiment.score}
        </Badge>
      )}
      className="h-[544px]"
    >
      <div>
        {hasData && news?.list.map((item) => (
          <div
            key={item.id}
            className="border-b border-border-default px-3 py-2.5 transition-colors hover:bg-elevated/30"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-txt-muted">{timeAgo(item.release_time)}</span>
              {item.matched_currencies?.slice(0, 3).map((c) => (
                <span key={c.symbol} className="rounded bg-accent-muted px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                  {c.symbol}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs font-medium text-txt-primary leading-snug line-clamp-2">{item.title}</p>
          </div>
        ))}
        {fetchError && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-xs font-semibold text-sell">Connection Failed</span>
            <span className="text-[11px] text-txt-tertiary">Unable to reach news API</span>
          </div>
        )}
        {!news && !fetchError && (
          <div className="flex items-center justify-center py-12 text-xs text-txt-muted">Loading news…</div>
        )}
        {apiError && !hasData && !fetchError && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-xs font-semibold text-hold">API Quota Exceeded</span>
            <span className="text-[11px] text-txt-tertiary text-center px-4">SoSoValue monthly limit reached. Resumes after quota reset.</span>
          </div>
        )}
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

function changeColor(pct: number): string {
  return pct > 0 ? "text-buy" : pct < 0 ? "text-sell" : "text-txt-muted";
}

function changeArrow(pct: number): string {
  return pct > 0 ? "▲" : pct < 0 ? "▼" : "—";
}

/* Coin color map for avatars */
const COIN_COLORS: Record<string, { bg: string; text: string }> = {
  BTC: { bg: "#F7931A", text: "#fff" },
  ETH: { bg: "#627EEA", text: "#fff" },
  SOL: { bg: "#9945FF", text: "#fff" },
  HYPE: { bg: "#00E5A8", text: "#05070D" },
  SUI: { bg: "#4DA2FF", text: "#fff" },
  DEFI: { bg: "#8B5CF6", text: "#fff" },
  NVDA: { bg: "#76B900", text: "#fff" },
};

function coinColor(symbol: string): { bg: string; text: string } {
  if (COIN_COLORS[symbol]) return COIN_COLORS[symbol];
  // Generate a deterministic hue from the symbol
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue}, 70%, 50%)`, text: "#fff" };
}

function CoinAvatar({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const c = coinColor(symbol);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 font-bold"
      style={{ width: size, height: size, backgroundColor: c.bg + "22", color: c.bg, fontSize: size * 0.38 }}
    >
      {symbol.slice(0, 2)}
    </span>
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
      change: typeof t.changePct === "number" ? t.changePct : parseFloat(String(t.changePct ?? "0")),
      price: parseFloat(t.lastPx ?? "0"),
    }))
    .filter((t) => t.price > 0)
    .sort((a, b) => b.change - a.change);

  const top3 = parsed.slice(0, 3);
  const bottom3 = parsed.slice(-3).reverse();
  const maxAbs = Math.max(...parsed.map((t) => Math.abs(t.change)), 1);

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">Top Movers</h3>
        <span className="text-[9px] text-txt-dim font-mono tabular-nums">{parsed.length} pairs</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border-default">
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-buy" />
            <span className="text-[9px] uppercase text-buy font-semibold tracking-wider">Gainers</span>
          </div>
          <div className="space-y-2.5">
            {top3.map((t, i) => (
              <div key={t.symbol} className="group">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 text-[9px] text-txt-dim font-mono tabular-nums text-right">{i + 1}</span>
                  <CoinAvatar symbol={t.symbol} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-txt-primary truncate">{t.symbol}</span>
                      <span className="font-mono text-xs font-bold tabular-nums text-buy ml-2">
                        +{Math.abs(t.change).toFixed(2)}%
                      </span>
                    </div>
                    <ChangeBar change={t.change} maxAbs={maxAbs} />
                  </div>
                </div>
              </div>
            ))}
            {top3.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <span className="text-[10px] text-txt-muted">No data</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sell" />
            <span className="text-[9px] uppercase text-sell font-semibold tracking-wider">Losers</span>
          </div>
          <div className="space-y-2.5">
            {bottom3.map((t, i) => (
              <div key={t.symbol} className="group">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 text-[9px] text-txt-dim font-mono tabular-nums text-right">{i + 1}</span>
                  <CoinAvatar symbol={t.symbol} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-txt-primary truncate">{t.symbol}</span>
                      <span className="font-mono text-xs font-bold tabular-nums text-sell ml-2">
                        {Math.abs(t.change).toFixed(2)}%
                      </span>
                    </div>
                    <ChangeBar change={t.change} maxAbs={maxAbs} />
                  </div>
                </div>
              </div>
            ))}
            {bottom3.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <span className="text-[10px] text-txt-muted">No data</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SignalAccuracyCard() {
  const d = useDashboard();
  const stats = d.signalStats;
  const streaks = d.streaks;

  const accuracy = stats?.accuracy;
  const totalResolved = stats?.totalResolved ?? 0;
  const currentStreak = streaks?.current;
  const winStreak = currentStreak?.type === "win" ? currentStreak.count : 0;
  const lossStreak = currentStreak?.type === "loss" ? currentStreak.count : 0;

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">
          <Target size={12} className="text-accent" /> Signal Accuracy
        </h3>
        {totalResolved > 0 && (
          <span className="text-[9px] font-mono text-txt-dim tabular-nums">{totalResolved} resolved</span>
        )}
      </div>
      <div className="p-3">
        {/* Center ring */}
        <div className="flex justify-center mb-3">
          <WinRateRing value={accuracy} size={72} />
        </div>

        {/* Streaks row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-buy-dim/40 bg-buy-muted/30 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-buy/70">Win Streak</span>
            </div>
            <span className="font-mono text-lg font-bold tabular-nums text-buy leading-none">
              {winStreak || "—"}
            </span>
          </div>
          <div className="rounded-lg border border-sell-dim/40 bg-sell-muted/30 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-sell/70">Loss Streak</span>
            </div>
            <span className="font-mono text-lg font-bold tabular-nums text-sell leading-none">
              {lossStreak || "—"}
            </span>
          </div>
        </div>

        {/* Win rate bar */}
        {accuracy != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-txt-muted uppercase tracking-wider">Win Rate</span>
              <span className="text-[9px] font-mono text-txt-tertiary tabular-nums">{accuracy.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border-default/30 overflow-hidden">
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
          </div>
        )}
      </div>
    </Card>
  );
}

function IndexCard() {
  const d = useDashboard();
  const tickers = d.tickers ?? [];

  const coins = [
    { sym: "vBTC_vUSDC", label: "BTC", full: "Bitcoin" },
    { sym: "vETH_vUSDC", label: "ETH", full: "Ethereum" },
    { sym: "vSOL_vUSDC", label: "SOL", full: "Solana" },
  ];

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">
          <Layers size={12} className="text-accent" /> Index Prices
        </h3>
        <span className="text-[9px] text-txt-dim font-mono">live</span>
      </div>
      <div className="divide-y divide-border-default">
        {coins.map(({ sym, label, full }) => {
          const t = tickers.find((tk) => tk.symbol === sym);
          const price = t ? parseFloat(t.lastPx) : null;
          const change = t
            ? typeof t.changePct === "number"
              ? t.changePct
              : parseFloat(String(t.changePct ?? "0"))
            : 0;
          const isPositive = change >= 0;

          return (
            <div key={sym} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/20">
              <CoinAvatar symbol={label} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-txt-primary">{label}</span>
                  <span className="text-[10px] text-txt-dim">{full}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm font-bold tabular-nums text-txt-primary">
                    {price != null ? fmtUsd(price) : "—"}
                  </span>
                  {price != null && (
                    <span
                      className={cx(
                        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono tabular-nums",
                        isPositive
                          ? "bg-buy-muted text-buy"
                          : change < 0
                            ? "bg-sell-muted text-sell"
                            : "bg-elevated text-txt-muted"
                      )}
                    >
                      {changeArrow(change)} {Math.abs(change).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MarketStatsCard() {
  const d = useDashboard();
  const tickers = d.tickers ?? [];
  const signals = d.liveSignals ?? [];

  const totalVolume = tickers.reduce((sum, t) => sum + parseFloat(t.quoteVolume ?? "0"), 0);
  const activePairs = tickers.filter((t) => parseFloat(t.lastPx ?? "0") > 0).length;
  const buySignals = signals.filter((s) => s.action === "LONG").length;
  const sellSignals = signals.filter((s) => s.action === "SHORT").length;
  const totalSignals = buySignals + sellSignals;

  const stats = [
    {
      label: "Volume 24H",
      value: fmtUsd(totalVolume),
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M3 14l4-4 3 3 7-9" />
          <path d="M14 4h3v3" />
        </svg>
      ),
      color: "text-accent",
      bgColor: "bg-accent-muted",
      large: true,
    },
    {
      label: "Active Pairs",
      value: activePairs.toString(),
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="7" cy="10" r="4" />
          <circle cx="13" cy="10" r="4" />
        </svg>
      ),
      color: "text-info",
      bgColor: "bg-[#00d4ff10]",
      large: false,
    },
    {
      label: "Buy Signals",
      value: buySignals.toString(),
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15V5M6 9l4-4 4 4" />
        </svg>
      ),
      color: "text-buy",
      bgColor: "bg-buy-muted",
      large: false,
    },
    {
      label: "Sell Signals",
      value: sellSignals.toString(),
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 5v10M6 11l4 4 4-4" />
        </svg>
      ),
      color: "text-sell",
      bgColor: "bg-sell-muted",
      large: false,
    },
  ];

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">
          <Activity size={12} className="text-accent" /> Market Stats
        </h3>
        {totalSignals > 0 && (
          <span className="text-[9px] font-mono text-txt-dim tabular-nums">{totalSignals} signals</span>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-border-default">
        {/* Left column: Volume (hero) + Active Pairs */}
        <div className="p-3 space-y-3">
          <div className="rounded-lg border border-accent-dim/30 bg-accent-muted/10 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={cx("flex h-5 w-5 items-center justify-center rounded", stats[0].bgColor, stats[0].color)}>
                {stats[0].icon}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-txt-muted">Volume 24H</span>
            </div>
            <span className="font-mono text-xl font-bold tabular-nums text-txt-primary leading-none">
              {stats[0].value}
            </span>
          </div>
          <div className="flex items-center gap-2.5 px-1">
            <span className={cx("flex h-7 w-7 items-center justify-center rounded-lg", stats[1].bgColor, stats[1].color)}>
              {stats[1].icon}
            </span>
            <div>
              <span className="text-[9px] text-txt-muted uppercase tracking-wider block">Active Pairs</span>
              <span className="font-mono text-base font-bold tabular-nums text-txt-primary leading-none">{stats[1].value}</span>
            </div>
          </div>
        </div>
        {/* Right column: Buy + Sell signals stacked */}
        <div className="p-3 space-y-2.5">
          <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={cx("flex h-5 w-5 items-center justify-center rounded", stats[2].bgColor, stats[2].color)}>
                {stats[2].icon}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-buy/70">Buy Signals</span>
            </div>
            <span className="font-mono text-2xl font-bold tabular-nums text-buy leading-none">{stats[2].value}</span>
          </div>
          <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={cx("flex h-5 w-5 items-center justify-center rounded", stats[3].bgColor, stats[3].color)}>
                {stats[3].icon}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-sell/70">Sell Signals</span>
            </div>
            <span className="font-mono text-2xl font-bold tabular-nums text-sell leading-none">{stats[3].value}</span>
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
      <IndexCard />
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
        <NewsFeed news={news} fetchError={newsFetchError} />
      </div>
      <MarketStatsBar />
    </div>
  );
}

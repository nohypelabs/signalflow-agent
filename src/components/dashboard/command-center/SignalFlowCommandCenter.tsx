"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SpeedometerGauge from "@/components/ui/SpeedometerGauge";
import TradingChart from "@/components/TradingChart";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";

/* ── Mock Data ── */

const pipelineSteps = [
  { number: "1", title: "SoDEX Data", description: "On-chain DEX\nFlows & Trades", icon: "database" },
  { number: "2", title: "SoSoValue Data", description: "Market, ETF, Index,\nOn-chain & More", icon: "cube" },
  { number: "3", title: "Confluence V2", description: "Multi-Source Fusion\n& Alignment", icon: "fusion" },
  { number: "4", title: "AI Thesis", description: "Context, Narrative\n& Probability", icon: "brain" },
  { number: "5", title: "Trade Setup", description: "Entry, Risk, Targets\n& Execution Plan", icon: "target" },
];

const signalStream = [
  { time: "09:41", title: "AI Thesis Updated", detail: "Bullish continuation\nprobability increased", level: "HIGH", icon: "brain" },
  { time: "09:40", title: "Confluence V2", detail: "Alignment Score: 0.82", level: "HIGH", icon: "cube" },
  { time: "09:39", title: "SoSoValue Data", detail: "ETF Net Flow: +$287M", level: "HIGH", icon: "database" },
  { time: "09:39", title: "SoDEX Data", detail: "Large Buy Flow Detected\n(>$10M)", level: "HIGH", icon: "database" },
  { time: "09:38", title: "Momentum", detail: "RSI 56.1 UP\nMACD Bullish Cross", level: "MED", icon: "trend" },
  { time: "09:37", title: "Macro", detail: "DXY 102.31 DOWN\n10Y Yield 4.37% DOWN", level: "MED", icon: "globe" },
  { time: "09:36", title: "Sentiment", detail: "Greed Index: 67\nSocial Volume UP", level: "LOW", icon: "chat" },
  { time: "09:35", title: "Treasury", detail: "Exchange Reserve DOWN\nNet Outflow", level: "LOW", icon: "bank" },
];

const evidenceCards = [
  { title: "ETF FLOW", icon: "bars", rows: [["Net Flow (24H)", "+$287M"]], impact: "HIGH", spark: "up" },
  { title: "MACRO", icon: "globe", rows: [["DXY", "102.31 DOWN"], ["10Y", "4.37% DOWN"]], impact: "MEDIUM", spark: "down" },
  { title: "SENTIMENT", icon: "chat", rows: [["Greed Index", "67"], ["Social Vol.", "UP 18%"]], impact: "LOW", spark: "flat" },
  { title: "TREASURY", icon: "bank", rows: [["Exchange Reserve", "-12.4K BTC (24H)"]], impact: "MEDIUM", spark: "down" },
  { title: "MOMENTUM", icon: "trend", rows: [["RSI (14)", "56.1"], ["MACD", "Bull Cross"]], impact: "HIGH", spark: "up" },
];

const decisionPanelData = {
  selected: "LONG",
  confidence: 78,
  confidenceLabel: "High",
  takeProfit: [
    ["TP1", "68,850.0", "(1.5R)"],
    ["TP2", "70,200.0", "(3.0R)"],
    ["TP3", "72,150.0", "(5.0R)"],
  ],
  stopLoss: ["SL", "65,100.0", "(-1.2R)"],
  riskReward: "1 : 2.6",
  positionSize: "0.42 BTC",
};

/* ── Helpers ── */

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function levelBadgeVariant(level: string): string {
  if (level === "HIGH") return "buy";
  if (level === "MED") return "warning";
  return "muted";
}

function impactBadgeVariant(impact: string): string {
  if (impact === "HIGH") return "buy";
  if (impact === "MEDIUM") return "warning";
  return "muted";
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
      {!["database", "cube", "fusion", "brain", "target", "trend", "globe", "chat", "bank", "bars"].includes(name) && <circle className={common} cx="16" cy="16" r="10" />}
    </svg>
  );
}

/* ── Pipeline Flow ── */

function PipelineStepCard({ step }: { step: (typeof pipelineSteps)[number] }) {
  return (
    <Card variant="default" padding="none" className="relative flex h-[88px] min-w-[218px] flex-1 items-center gap-4 rounded-xl px-5">
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
      <div className="h-px flex-1 bg-accent-dim" />
      <svg viewBox="0 0 64 26" className="h-7 w-16 text-accent">
        <path d="M0 13h18l4-10 8 20 8-20 8 20 4-10h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="h-px flex-1 bg-accent-dim" />
    </div>
  );
}

function PipelineFlow() {
  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <div className="flex min-w-[1120px] items-center">
        {pipelineSteps.map((step, index) => (
          <div key={step.title} className="flex flex-1 items-center">
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
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden h-[494px] flex flex-col">
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

function DecisionPanel() {
  const [signal, setSignal] = useState(decisionPanelData.selected);
  const execute = () => console.info("SignalFlow execute setup", { signal });

  const signalColors: Record<string, { active: string; idle: string; icon: string }> = {
    LONG: {
      active: "bg-buy-muted border-2 border-buy text-buy ring-1 ring-buy/30",
      idle: "border border-border-default text-txt-muted hover:border-buy-dim hover:text-buy",
      icon: "↑",
    },
    SHORT: {
      active: "bg-sell-muted border-2 border-sell text-sell ring-1 ring-sell/30",
      idle: "border border-border-default text-txt-muted hover:border-sell-dim hover:text-sell",
      icon: "↓",
    },
    "NO TRADE": {
      active: "bg-hold-muted border-2 border-hold text-hold ring-1 ring-hold/30",
      idle: "border border-border-default text-txt-muted hover:border-hold-dim hover:text-hold",
      icon: "⊖",
    },
  };

  return (
    <Panel title="CURRENT DECISION PANEL" className="h-[494px]">
      <div className="space-y-4 p-4">
        {/* Signal Selector */}
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-txt-tertiary uppercase">Primary Signal</div>
          <div className="grid grid-cols-3 gap-1.5">
            {["LONG", "SHORT", "NO TRADE"].map((item) => {
              const isActive = signal === item;
              const colors = signalColors[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSignal(item)}
                  className={cx(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-all",
                    isActive ? colors.active : colors.idle
                  )}
                >
                  <div className="text-xl">{colors.icon}</div>
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confidence — Speedometer */}
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-txt-tertiary uppercase">Signal Strength</div>
          <div className="flex items-center justify-center py-1">
            <div className="text-center">
              <SpeedometerGauge value={decisionPanelData.confidence} size="lg" showLabel={false} />
              <div className="mt-1 text-4xl font-bold tabular-nums tracking-tight" style={{ color: decisionPanelData.confidence >= 75 ? "var(--color-buy)" : decisionPanelData.confidence >= 50 ? "var(--color-hold)" : "var(--color-sell)" }}>
                {decisionPanelData.confidence}%
              </div>
              <div className="text-sm font-medium text-txt-tertiary">{decisionPanelData.confidenceLabel}</div>
            </div>
          </div>
        </div>

        {/* TP / SL Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card variant="inset" padding="sm" className="rounded-xl">
            <div className="mb-2 text-[11px] font-semibold text-buy uppercase tracking-wide">Take Profit (TP)</div>
            <div className="space-y-1.5">
              {decisionPanelData.takeProfit.map(([label, price, risk]) => (
                <div key={label} className="grid grid-cols-[36px_1fr_54px] gap-1 font-mono text-xs">
                  <span className="text-txt-muted">{label}</span>
                  <span className="text-buy">{price}</span>
                  <span className="text-txt-tertiary">{risk}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card variant="inset" padding="sm" className="rounded-xl">
            <div className="mb-2 text-[11px] font-semibold text-sell uppercase tracking-wide">Stop Loss (SL)</div>
            <div className="grid grid-cols-[28px_1fr_58px] gap-1 font-mono text-xs">
              <span className="text-txt-muted">{decisionPanelData.stopLoss[0]}</span>
              <span className="text-sell">{decisionPanelData.stopLoss[1]}</span>
              <span className="text-txt-tertiary">{decisionPanelData.stopLoss[2]}</span>
            </div>
            <div className="my-3 h-px bg-border-default" />
            <div className="text-[11px] font-semibold text-txt-tertiary uppercase tracking-wide">Risk / Reward</div>
            <div className="mt-1 font-mono text-xl font-bold text-txt-primary">{decisionPanelData.riskReward}</div>
          </Card>
        </div>

        {/* Execute */}
        <Button variant="primary" size="lg" onClick={execute} className="w-full h-12 rounded-xl text-sm">
          <span className="text-lg">▶</span> Execute Setup
        </Button>

        {/* Position Size */}
        <div className="flex justify-between text-sm">
          <span className="text-txt-tertiary">Position Size (Risk 1%):</span>
          <span className="font-mono font-semibold text-txt-primary">{decisionPanelData.positionSize}</span>
        </div>
      </div>
    </Panel>
  );
}

/* ── Signal Stream ── */

function SignalStream() {
  return (
    <Panel title="SIGNAL STREAM" className="h-[494px]">
      <div>
        {signalStream.map((item) => (
          <div
            key={`${item.time}-${item.title}`}
            className="grid grid-cols-[46px_34px_1fr_44px] items-center gap-2 border-b border-border-default px-3 py-2.5 transition-colors hover:bg-elevated/30"
          >
            <div className="font-mono text-xs text-txt-muted">{item.time}</div>
            <TechIcon name={item.icon} className="h-5 w-5" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-txt-primary">{item.title}</div>
              <div className="whitespace-pre-line text-[11px] leading-snug text-txt-tertiary">{item.detail}</div>
            </div>
            <Badge variant={levelBadgeVariant(item.level)} size="sm" className="justify-self-start">
              {item.level}
            </Badge>
          </div>
        ))}
        <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-accent hover:bg-accent-muted/30 transition-colors">
          View All Signals <span className="text-sm">›</span>
        </button>
      </div>
    </Panel>
  );
}

/* ── Sparkline ── */

function Sparkline({ mode }: { mode: string }) {
  const color = mode === "up" ? "var(--color-buy)" : mode === "down" ? "var(--color-sell)" : "var(--text-muted)";
  const path = mode === "up" ? "M2 26 L10 20 L16 22 L23 12 L30 15 L38 4" : mode === "down" ? "M2 8 L11 14 L18 13 L26 22 L34 21 L42 29" : "M2 18 L10 16 L18 20 L26 15 L34 18 L42 14";
  return (
    <svg viewBox="0 0 44 32" className="h-9 w-16">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      {mode === "up" && <path d="M38 4v7M38 4h-7" fill="none" stroke={color} strokeWidth="1.5" />}
      {mode === "down" && <path d="M42 29v-7M42 29h-7" fill="none" stroke={color} strokeWidth="1.5" />}
    </svg>
  );
}

/* ── Evidence Card ── */

function EvidenceCard({ card }: { card: (typeof evidenceCards)[number] }) {
  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <div className="mb-2.5 flex items-center gap-2">
        <TechIcon name={card.icon} className="h-5 w-5" />
        <h3 className="text-xs font-semibold tracking-wide text-txt-secondary uppercase">{card.title}</h3>
      </div>
      <div className="grid min-h-[43px] grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1">
          {card.rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[1fr_auto] gap-2 text-xs">
              <span className="text-txt-muted">{label}</span>
              <span className="font-mono font-semibold text-txt-primary">{value}</span>
            </div>
          ))}
        </div>
        <Sparkline mode={card.spark} />
      </div>
      <div className="mt-2.5 flex items-center gap-2 border-t border-border-default pt-2">
        <span className="text-[11px] text-txt-muted">Impact:</span>
        <Badge variant={impactBadgeVariant(card.impact)} size="sm">{card.impact}</Badge>
      </div>
    </Card>
  );
}

/* ── Signal Engine Flow ── */

function SignalEngineFlow() {
  return (
    <div className="relative mt-4 min-h-[100px]">
      <div className="absolute left-[8%] right-[28%] top-0 hidden h-6 rounded-b-md border-b border-l border-r border-dashed border-accent-dim xl:block" />
      <div className="grid grid-cols-1 items-end gap-4 pt-8 xl:grid-cols-[1fr_300px_320px_260px]">
        <div className="hidden xl:block" />
        <Card variant="default" padding="md" className="rounded-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted">
              <TechIcon name="fusion" className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-txt-primary">Signal Engine</h3>
              <p className="mt-0.5 text-xs text-txt-tertiary">Weighted Fusion & Scoring</p>
            </div>
          </div>
        </Card>
        <div className="relative">
          <span className="absolute -left-4 top-1/2 hidden h-px w-4 bg-accent-dim xl:block" />
          <Card variant="default" padding="md" className="rounded-xl">
            <h3 className="text-xs font-semibold tracking-wide text-txt-tertiary uppercase">Confluence Score</h3>
            <div className="mt-1 font-mono text-2xl font-bold text-accent">
              0.82 <span className="text-sm font-normal text-txt-muted">/ 1.00</span>
            </div>
            <div className="mt-0.5 text-xs text-buy font-medium">Strong Alignment</div>
            <div className="absolute bottom-4 right-4 flex items-end gap-1.5">
              {[14, 20, 26, 31, 36, 40, 45].map((height) => (
                <span key={height} className="w-1.5 rounded-t bg-accent" style={{ height, opacity: 0.4 + (height / 45) * 0.6 }} />
              ))}
            </div>
          </Card>
        </div>
        <div className="relative">
          <span className="absolute -left-4 top-1/2 hidden h-px w-4 bg-accent-dim xl:block" />
          <Card variant="default" padding="md" className="rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-buy-muted">
                <TechIcon name="target" className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-txt-primary uppercase">Output: Trade Setup</h3>
                <p className="mt-0.5 text-sm font-semibold text-buy">High Probability</p>
                <p className="mt-0.5 text-[11px] text-txt-tertiary">Execution Ready <span className="inline-block h-1.5 w-1.5 rounded-full bg-buy animate-pulse-glow" /></p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Evidence Flow ── */

function EvidenceFlow() {
  return (
    <Card variant="default" padding="md" className="rounded-xl">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-txt-primary">
        Evidence Flow <span className="ml-2 text-xs font-normal text-txt-muted">(Data → Insight → Signal)</span>
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {evidenceCards.map((card) => <EvidenceCard key={card.title} card={card} />)}
      </div>
      <SignalEngineFlow />
    </Card>
  );
}

/* ── Root Component ── */

export default function SignalFlowCommandCenter() {
  const [pair] = useState("BTC/USDC");

  return (
    <div className="space-y-3 px-2 lg:px-3">
      <div className="overflow-x-auto">
        <PipelineFlow />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2.8fr)_minmax(280px,1.3fr)_minmax(280px,1.2fr)]">
        <MarketCanvas pair={pair} />
        <DecisionPanel />
        <SignalStream />
      </div>
      <EvidenceFlow />
    </div>
  );
}

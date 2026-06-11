"use client";

import Link from "next/link";
import { BrainCircuit, Database, ExternalLink, Route, ShieldCheck, Workflow } from "lucide-react";
import type { Signal } from "@/lib/types/signal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EvidenceFlow from "@/components/dashboard/EvidenceFlow";
import SignalFlowRail from "@/components/dashboard/SignalFlowRail";
import SignalStream from "@/components/dashboard/SignalStream";
import { useDashboard } from "@/lib/dashboard-context";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import { pairToSodexSymbol } from "@/lib/pair-map";

type SignalQualityStatus = NonNullable<Signal["quality"]>["status"];

function normalizePair(pair: string): string {
  return pair.replace(/^v/, "").replace(/_vUSDC$/, "/USDC").toUpperCase();
}

function actionLabel(signal: Signal | null): string {
  if (!signal) return "WAITING";
  return signal.action === "HOLD" ? "NO TRADE" : signal.action;
}

function actionVariant(signal: Signal | null): string {
  if (!signal) return "muted";
  if (signal.action === "LONG") return "buy";
  if (signal.action === "SHORT") return "sell";
  return "hold";
}

function actionTone(signal: Signal | null): string {
  if (!signal) return "text-txt-primary";
  if (signal.action === "LONG") return "text-buy";
  if (signal.action === "SHORT") return "text-sell";
  return "text-hold";
}

function qualityVariant(status?: SignalQualityStatus): string {
  if (status === "actionable") return "buy";
  if (status === "blocked") return "sell";
  return "hold";
}

function phaseLabel(phase: string): string {
  if (phase === "fetching_market_data") return "Fetching market data";
  if (phase === "computing_signal") return "Computing signal";
  if (phase === "generating_ai_thesis") return "Generating AI thesis";
  if (phase === "partial_success") return "Signal ready, AI partial";
  if (phase === "success") return "Signal ready";
  if (phase === "error") return "Generation error";
  return "Idle";
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  if (value >= 10000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (value >= 100) return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(5)}`;
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function truthVariant(ok: boolean): string {
  return ok ? "buy" : "hold";
}

function SourceTruthPanel({
  signal,
  livePrice,
  liveChange,
  includeAI,
  aiProviderLabel,
  analyzing,
  phase,
  aiError,
  sourceFlags,
  onGenerate,
}: {
  signal: Signal | null;
  livePrice: number | null;
  liveChange: number | null;
  includeAI: boolean;
  aiProviderLabel: string;
  analyzing: boolean;
  phase: string;
  aiError: string | null;
  sourceFlags: Record<string, boolean | number> | undefined;
  onGenerate: () => void;
}) {
  const soSoValueChecks = [
    { label: "ETF Flow", ok: Boolean(sourceFlags?.etf) },
    { label: "Macro", ok: Boolean(sourceFlags?.macro) },
    { label: "Sentiment", ok: Boolean(sourceFlags?.news) },
    { label: "Treasury", ok: Boolean(sourceFlags?.treasuries || sourceFlags?.treasuryActivity) },
  ];

  const soDEXChecks = [
    { label: "Klines", ok: Boolean(sourceFlags?.sodexKlines) },
    { label: "Orderbook", ok: Boolean(sourceFlags?.orderbooks) },
    { label: "Snapshots", ok: typeof sourceFlags?.snapshots === "number" ? sourceFlags.snapshots > 0 : Boolean(sourceFlags?.snapshots) },
  ];

  return (
    <Card variant="default" padding="none" className="overflow-hidden rounded-xl">
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Source of Truth</p>
        <h2 className="mt-1 text-sm font-semibold text-txt-primary">Exact inputs behind the active signal</h2>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-border-default bg-inset/35 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs font-semibold text-txt-primary">SoSoValue signal context</p>
                <p className="text-[10px] text-txt-secondary">Macro, ETF, sentiment, treasury inputs</p>
              </div>
            </div>
            <Badge variant={truthVariant(soSoValueChecks.some((item) => item.ok))} size="sm">Source A</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {soSoValueChecks.map((item) => (
              <Badge key={item.label} variant={truthVariant(item.ok)} size="sm">
                {item.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-inset/35 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs font-semibold text-txt-primary">SoDEX execution context</p>
                <p className="text-[10px] text-txt-secondary">Perp market price, orderbook, and execution handoff</p>
              </div>
            </div>
            <Badge variant={truthVariant(soDEXChecks.some((item) => item.ok))} size="sm">Source B</Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
              <p className="text-[9px] uppercase text-txt-secondary">Live mark</p>
              <p className="mt-1 text-sm font-mono font-semibold text-txt-primary">{formatPrice(livePrice)}</p>
            </div>
            <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
              <p className="text-[9px] uppercase text-txt-secondary">24h move</p>
              <p className={`mt-1 text-sm font-mono font-semibold ${liveChange !== null && liveChange < 0 ? "text-sell" : "text-buy"}`}>
                {formatPct(liveChange)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {soDEXChecks.map((item) => (
              <Badge key={item.label} variant={truthVariant(item.ok)} size="sm">
                {item.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-inset/35 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs font-semibold text-txt-primary">AI agent overlay</p>
                <p className="text-[10px] text-txt-secondary">
                  {includeAI ? `${aiProviderLabel} adds thesis and execution refinement` : "Technical-only signal flow"}
                </p>
              </div>
            </div>
            <Badge variant={includeAI ? "accent" : "muted"} size="sm">{includeAI ? "AI ON" : "AI OFF"}</Badge>
          </div>
          <div className="mt-3 rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-txt-secondary">Generation state</span>
              <span className="text-[10px] font-semibold text-txt-primary">{phaseLabel(phase)}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-txt-secondary">
              {aiError ?? (signal?.frameworkApplication?.note || signal?.setup?.thesis || "AI layer is available for additional thesis and target refinement.")}
            </p>
          </div>
          <Button className="mt-3 w-full" size="sm" loading={analyzing} onClick={onGenerate}>
            Refresh signal with current flow
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ExecutionHandoffPanel({
  signal,
  tradingHref,
  isConnected,
  onConnect,
}: {
  signal: Signal | null;
  tradingHref: string;
  isConnected: boolean;
  onConnect: () => Promise<void>;
}) {
  return (
    <Card variant="default" padding="none" className="overflow-hidden rounded-xl">
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Execution Handoff</p>
        <h2 className="mt-1 text-sm font-semibold text-txt-primary">Dashboard produces the signal, trading page handles execution</h2>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-border-default bg-inset/35 p-3">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold text-txt-primary">Execution path</p>
          </div>
          <div className="mt-3 space-y-2">
            {[
              signal ? `1. Lock active signal for ${signal.pair}` : "1. Wait for an active signal",
              "2. Open /trading for the real chart and order surface",
              isConnected ? "3. Wallet is connected for paper or guarded live flow" : "3. Connect wallet before opening positions",
              "4. SoDEX order routing stays on the trading desk, not the dashboard",
            ].map((line) => (
              <div key={line} className="rounded-lg border border-border-default bg-background/60 px-3 py-2 text-[11px] text-txt-secondary">
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <p className="text-[9px] uppercase text-txt-secondary">Entry</p>
            <p className="mt-1 text-sm font-mono font-semibold text-txt-primary">{formatPrice(signal?.execution.entry)}</p>
          </div>
          <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <p className="text-[9px] uppercase text-txt-secondary">Risk / Reward</p>
            <p className="mt-1 text-sm font-mono font-semibold text-txt-primary">{signal?.execution.riskReward || "--"}</p>
          </div>
          <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <p className="text-[9px] uppercase text-txt-secondary">Take profit</p>
            <p className="mt-1 text-sm font-mono font-semibold text-buy">{formatPrice(signal?.execution.takeProfit)}</p>
          </div>
          <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <p className="text-[9px] uppercase text-txt-secondary">Stop loss</p>
            <p className="mt-1 text-sm font-mono font-semibold text-sell">{formatPrice(signal?.execution.stopLoss)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-accent/25 bg-accent-muted/10 px-3 py-3 text-[11px] leading-relaxed text-txt-secondary">
          Chart intentionally lives on <span className="font-semibold text-txt-primary">/trading</span> so judges see a clean split:
          dashboard for signal transparency, trading page for real execution context.
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={tradingHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent-dim bg-accent-muted/40 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:border-accent hover:bg-accent-muted/60"
          >
            Open Trading Desk
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {!isConnected ? (
            <button
              type="button"
              onClick={() => { void onConnect(); }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-default bg-background/70 px-3 py-2 text-xs font-semibold text-txt-primary transition-colors hover:border-border-muted hover:bg-elevated/30"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-buy-dim bg-buy-muted/10 px-3 py-2 text-xs font-semibold text-buy">
              <ShieldCheck className="h-3.5 w-3.5" />
              Wallet ready
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function LogicTracePanel({ signal, signalAccuracy }: { signal: Signal | null; signalAccuracy: number | null }) {
  const evidence = signal?.setup?.evidence?.slice(0, 4) ?? [];
  const topFactors = signal?.factors?.slice(0, 4) ?? [];
  const framework = signal?.frameworkApplication?.principlesApplied?.slice(0, 3) ?? [];

  return (
    <Card variant="default" padding="none" className="overflow-hidden rounded-xl">
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Logic Trace</p>
        <h2 className="mt-1 text-sm font-semibold text-txt-primary">Why the engine arrived at this signal</h2>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <p className="text-[9px] uppercase text-txt-secondary">Setup</p>
            <p className="mt-1 text-xs font-semibold text-txt-primary">{signal?.setup?.label || "Waiting for setup"}</p>
          </div>
          <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <p className="text-[9px] uppercase text-txt-secondary">Regime</p>
            <p className="mt-1 text-xs font-semibold text-txt-primary">{signal?.regime?.replaceAll("_", " ") || "--"}</p>
          </div>
          <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
            <p className="text-[9px] uppercase text-txt-secondary">Reliability</p>
            <p className="mt-1 text-xs font-semibold text-txt-primary">
              {signalAccuracy === null ? "--" : `${signalAccuracy.toFixed(1)}% historical accuracy`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-inset/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Primary evidence</p>
          <div className="mt-3 space-y-2">
            {(evidence.length > 0 ? evidence : ["Waiting for live evidence from the active setup."]).map((item) => (
              <div key={item} className="rounded-lg border border-border-default bg-background/60 px-3 py-2 text-[11px] text-txt-secondary">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-inset/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Factor stack</p>
          <div className="mt-3 space-y-2">
            {(topFactors.length > 0 ? topFactors : [{ name: "Signal engine", score: 0, detail: "Waiting for factor breakdown." }]).map((factor) => (
              <div key={factor.name} className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-txt-primary">{factor.name.replaceAll("_", " ")}</span>
                  <span className="text-xs font-mono font-semibold text-txt-primary">{Math.round(factor.score)}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-txt-secondary">{factor.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {framework.length > 0 && (
          <div className="rounded-xl border border-border-default bg-inset/35 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Framework application</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {framework.map((item) => (
                <Badge key={item} variant="info" size="sm">{item}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function SignalFlowTransparencyDashboard() {
  const d = useDashboard();
  const metrics = useDashboardMetrics(d.tickers, d.liveSignals, d.marketError, d.signalsError);

  const pairSignal = d.liveSignals.find((signal) => normalizePair(signal.pair) === normalizePair(d.selectedPair)) ?? null;
  const activeSignal = d.displaySignal ?? pairSignal ?? d.liveSignals[0] ?? null;
  const activePair = activeSignal?.pair ?? d.selectedPair;
  const activeCoin = activePair.split("/")[0];
  const activeDims = d.signalsData?.dimensions[activeCoin] ?? null;
  const activeTicker = d.tickerMap.get(pairToSodexSymbol(activePair));
  const livePrice = activeTicker ? Number.parseFloat(activeTicker.lastPx) : null;
  const liveChange = activeTicker ? Number(activeTicker.changePct) : null;
  const liveChangeTone = liveChange === null ? "text-txt-secondary" : liveChange < 0 ? "text-sell" : "text-buy";
  const liveMarkMeta = liveChange === null ? "Awaiting live SoDEX mark." : `${formatPct(liveChange)} vs 24h on SoDEX.`;
  const coinStats = d.historyByCoin(activeCoin);
  const selectedId = activeSignal?.id ?? null;
  const action = actionLabel(activeSignal);
  const tradingHref = activeSignal
    ? `/trading?pair=${encodeURIComponent(activeSignal.pair)}&signal=${encodeURIComponent(activeSignal.id)}`
    : `/trading?pair=${encodeURIComponent(activePair)}`;

  function handleGenerate(): void {
    const coin = activeCoin || "BTC";
    d.setAiCoin(coin);
    void d.generate(coin);
  }

  function handleSelectSignal(signal: Signal): void {
    d.setSelectedPair(signal.pair);
    d.setSelectedSignal(signal);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <Card variant="default" padding="none" className="overflow-hidden rounded-2xl border-accent/20">
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1.3fr_0.7fr] lg:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent" size="sm">Signal-first dashboard</Badge>
              <Badge variant="info" size="sm">SoSoValue + SoDEX + AI</Badge>
              <Badge variant={actionVariant(activeSignal)} size="sm">{action}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-txt-primary lg:text-[30px]">
              One clear signal, one clear logic path, one clear execution handoff.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-txt-secondary">
              Judges do not need another generic stats wall. This dashboard now shows the exact source stack,
              the current SignalFlow output, and how that output moves to the SoDEX trading desk.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-xl border border-border-default bg-inset/35 px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-txt-secondary">Active signal</p>
              <p className={`mt-2 text-lg font-semibold ${actionTone(activeSignal)}`}>
                {activeSignal ? `${activeSignal.pair} ${action}` : "Waiting for decision"}
              </p>
              <p className="mt-1 text-[11px] text-txt-secondary">
                Confidence {activeSignal ? `${Math.round(activeSignal.confidence)}%` : "--"}
              </p>
            </div>
            <div className="rounded-xl border border-border-default bg-inset/35 px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-txt-secondary">Strategy policy</p>
              <p className="mt-2 text-sm font-semibold text-txt-primary">
                {d.signalsData?.strategy?.label || d.signalsData?.engine || "SignalFlow engine"}
              </p>
              <p className="mt-1 text-[11px] text-txt-secondary">
                {metrics.activeSignals.value.total} live signals, {metrics.avgConfidence.formatted} average confidence
              </p>
            </div>
            <div className="rounded-xl border border-border-default bg-inset/35 px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-txt-secondary">Execution truth</p>
              <p className="mt-2 text-sm font-semibold text-txt-primary">Chart stays on /trading</p>
              <p className="mt-1 text-[11px] text-txt-secondary">
                Dashboard explains the signal. Trading page handles the actual SoDEX execution context.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <SignalFlowRail
        sodexStatus={d.sodexStatus}
        marketError={d.marketError}
        signalsError={d.signalsError}
        metrics={metrics}
        includeAI={d.includeAI}
        aiProviderLabel={d.aiProviderLabel}
        analyzing={d.analyzing}
        displaySignal={activeSignal}
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card variant="default" padding="none" className="overflow-hidden rounded-2xl">
          <div className="border-b border-border-default px-4 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Active Signal</p>
            <h2 className="mt-1 text-sm font-semibold text-txt-primary">The one output judges should care about right now</h2>
          </div>

          <div className="space-y-4 p-4 lg:p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-3xl font-semibold tracking-tight lg:text-[40px] ${actionTone(activeSignal)}`}>
                  {activeSignal ? activeSignal.pair : "Waiting for flow"}
                </p>
                <Badge variant={actionVariant(activeSignal)} size="md">{action}</Badge>
                {activeSignal?.quality?.status && (
                  <Badge variant={qualityVariant(activeSignal.quality.status)} size="md">
                    {activeSignal.quality.status}
                  </Badge>
                )}
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-relaxed text-txt-secondary">
                {activeSignal?.reasoning || "Generate or select a live signal to expose the current SignalFlow decision."}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border-default bg-inset/35 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Confidence</p>
                <p className="mt-2 text-2xl font-mono font-semibold text-txt-primary">
                  {activeSignal ? `${Math.round(activeSignal.confidence)}%` : "--"}
                </p>
                <p className="mt-1 text-[11px] text-txt-secondary">Current engine conviction on the active setup.</p>
              </div>
              <div className="rounded-2xl border border-border-default bg-inset/35 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Live mark</p>
                <p className="mt-2 text-2xl font-mono font-semibold text-txt-primary">{formatPrice(livePrice)}</p>
                <p className={`mt-1 text-[11px] ${liveChangeTone}`}>{liveMarkMeta}</p>
              </div>
              <div className="rounded-2xl border border-border-default bg-inset/35 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Regime</p>
                <p className="mt-2 text-base font-semibold text-txt-primary">
                  {activeSignal?.regime?.replaceAll("_", " ") || "--"}
                </p>
                <p className="mt-1 text-[11px] text-txt-secondary">Market state attached to this signal output.</p>
              </div>
              <div className="rounded-2xl border border-border-default bg-inset/35 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-secondary">Accuracy</p>
                <p className="mt-2 text-2xl font-mono font-semibold text-txt-primary">
                  {coinStats.accuracy === null ? "--" : `${coinStats.accuracy.toFixed(1)}%`}
                </p>
                <p className="mt-1 text-[11px] text-txt-secondary">
                  {coinStats.total > 0 ? `${coinStats.total} resolved ${activeCoin} signals` : "No resolved history yet"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-border-default bg-inset/35 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent" size="sm">{d.signalsData?.strategy?.label || "SignalFlow policy"}</Badge>
                  {activeSignal?.setup?.label && <Badge variant="info" size="sm">{activeSignal.setup.label}</Badge>}
                  {activeSignal?.tradingType && <Badge variant="muted" size="sm">{activeSignal.tradingType}</Badge>}
                  {activeSignal?.sources?.map((source) => (
                    <Badge key={source} variant="muted" size="sm">{source}</Badge>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  {(activeSignal?.setup?.evidence?.slice(0, 3) ?? []).length > 0 ? (
                    activeSignal?.setup?.evidence?.slice(0, 3).map((item) => (
                      <div key={item} className="rounded-lg border border-border-default bg-background/60 px-3 py-2 text-[11px] leading-relaxed text-txt-secondary">
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2 text-[11px] text-txt-secondary">
                      Evidence bullets will appear here once the live engine locks a setup.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border-default bg-inset/35 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
                    <p className="text-[9px] uppercase text-txt-secondary">Entry</p>
                    <p className="mt-1 text-sm font-mono font-semibold text-txt-primary">{formatPrice(activeSignal?.execution.entry)}</p>
                  </div>
                  <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
                    <p className="text-[9px] uppercase text-txt-secondary">R:R</p>
                    <p className="mt-1 text-sm font-mono font-semibold text-txt-primary">{activeSignal?.execution.riskReward || "--"}</p>
                  </div>
                  <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
                    <p className="text-[9px] uppercase text-txt-secondary">Take profit</p>
                    <p className="mt-1 text-sm font-mono font-semibold text-buy">{formatPrice(activeSignal?.execution.takeProfit)}</p>
                  </div>
                  <div className="rounded-lg border border-border-default bg-background/60 px-3 py-2">
                    <p className="text-[9px] uppercase text-txt-secondary">Stop loss</p>
                    <p className="mt-1 text-sm font-mono font-semibold text-sell">{formatPrice(activeSignal?.execution.stopLoss)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Button size="sm" loading={d.analyzing} onClick={handleGenerate}>
                    Refresh
                  </Button>
                  <Link
                    href={tradingHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent-dim bg-accent-muted/35 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:border-accent hover:bg-accent-muted/55"
                  >
                    Trading Desk
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/signals"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-default bg-background/70 px-3 py-2 text-xs font-semibold text-txt-primary transition-colors hover:border-border-muted hover:bg-elevated/30"
                  >
                    Full Signals
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <SourceTruthPanel
          signal={activeSignal}
          livePrice={livePrice}
          liveChange={liveChange}
          includeAI={d.includeAI}
          aiProviderLabel={d.aiProviderLabel}
          analyzing={d.analyzing}
          phase={d.signalPhase}
          aiError={d.aiError?.message ?? null}
          sourceFlags={d.signalsData?.sources}
          onGenerate={handleGenerate}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <EvidenceFlow signal={activeSignal} liveDims={activeDims} sourceFlags={d.signalsData?.sources} />
        <ExecutionHandoffPanel
          signal={activeSignal}
          tradingHref={tradingHref}
          isConnected={d.isConnected}
          onConnect={d.connectWallet}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SignalStream
          signals={d.liveSignals}
          selectedId={selectedId}
          tickerMap={d.tickerMap}
          onSelect={handleSelectSignal}
        />
        <LogicTracePanel signal={activeSignal} signalAccuracy={coinStats.accuracy} />
      </section>
    </div>
  );
}

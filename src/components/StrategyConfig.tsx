"use client";

import { useState, useEffect, useMemo } from "react";
import { useSignals } from "@/lib/hooks/useSignals";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { TRADING_TYPE_LIST } from "@/lib/types/trading-type";
import {
  DEFAULT_STRATEGY_CONFIG as DEFAULT_CONFIG,
  LIQUIDITY_FLOW_STRATEGY_CONFIG as LIQUIDITY_FLOW_CONFIG,
  loadStrategyConfig as loadConfig,
  saveStrategyConfig as saveConfig,
  type StrategyConfig,
  type StrategyEngineName,
  type StrategyPresetName,
  applyThinkingFramework,
  getFrameworkDefaults,
  THINKING_FRAMEWORK_PRINCIPLES,
  PRESETS,
  PRESET_META,
  PRESET_ORDER,
  getPresetName,
} from "@/lib/strategy/config";
import type { TradingType } from "@/lib/types/trading-type";
import type { TradingTypeProfiles, FactorWeights } from "@/lib/strategy/config";
import type { MarketRegime } from "@/lib/strategy/signal-engine-v2/types";
import { BarChartIcon, BriefcaseIcon, DataSourceIcon, DocumentIcon, TrendUpIcon } from "@/components/ui/icons";

const dimSliders = [
  { key: "etfFlow" as const, label: "ETF Flow", color: "#00d4ff", icon: "etf" as const, desc: "Institutional capital via BTC/ETH ETF net flows" },
  { key: "sentiment" as const, label: "Sentiment", color: "#8B5CF6", icon: "sentiment" as const, desc: "News headline NLP — bullish/bearish keyword ratio" },
  { key: "macro" as const, label: "Macro", color: "#00ff88", icon: "macro" as const, desc: "Fed calendar, CPI releases, yield curve signals" },
  { key: "momentum" as const, label: "Momentum", color: "#ff8800", icon: "momentum" as const, desc: "RSI, MACD, Bollinger Bands, EMA crossover" },
  { key: "treasury" as const, label: "Treasury", color: "#ff4488", icon: "treasury" as const, desc: "Public company BTC holdings, institutional adoption" },
];

const STRATEGY_ENGINES: Record<
  StrategyEngineName,
  {
    label: string;
    badge: string;
    desc: string;
    thesis: string;
    tone: string;
    checks: string[];
    breakdown: { label: string; value: string; detail: string }[];
  }
> = {
  confluence: {
    label: "Confluence V2",
    badge: "Current",
    desc: "Multi-factor signal engine for broader directional context.",
    thesis: "Combines SoSoValue fundamentals, sentiment, macro, and technical momentum into one confidence score.",
    tone: "border-accent/40 bg-accent/10 text-accent",
    checks: ["ETF flow", "sentiment layer", "macro regime", "momentum confirmation", "treasury adoption"],
    breakdown: [
      { label: "Entry Source", value: "Composite score", detail: "Signal appears when weighted factors pass confidence threshold." },
      { label: "Best Fit", value: "Intraday / swing", detail: "Useful when market context matters more than microstructure speed." },
      { label: "Execution", value: "Limit preferred", detail: "Slippage guard follows configured tolerance." },
    ],
  },
  liquidityFlow: {
    label: "Liquidity Flow",
    badge: "New",
    desc: "Orderbook-first strategy for cleaner entries and strict execution control.",
    thesis: "Ignores news as an entry trigger, checks spread and top-book imbalance first, then uses EMA(9), EMA(21), and RSI(14) only.",
    tone: "border-info/40 bg-info/10 text-info",
    checks: ["top 5 bid/ask", "spread <= 3 bps", "orderbook imbalance", "EMA 9/21", "RSI 14", "limit-only timeout"],
    breakdown: [
      { label: "Entry Gate", value: "Liquidity first", detail: "Skip if spread is wider than 3 bps or imbalance is weak." },
      { label: "TA Layer", value: "EMA + RSI", detail: "No MACD, OBV, Bollinger, linear regression, or news trigger." },
      { label: "Risk / Execution", value: "0.5% + 200ms", detail: "Max two positions, limit order only, timeout then skip." },
    ],
  },
};

const STRATEGY_ENGINE_ORDER: StrategyEngineName[] = ["confluence", "liquidityFlow"];

function DimIcon({ icon }: { icon: (typeof dimSliders)[number]["icon"] }) {
  if (icon === "etf") return <BarChartIcon size={12} />;
  if (icon === "sentiment") return <DocumentIcon size={12} />;
  if (icon === "macro") return <DataSourceIcon size={12} />;
  if (icon === "momentum") return <TrendUpIcon size={12} />;
  return <BriefcaseIcon size={12} />;
}

export default function StrategyConfig() {
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [activePreset, setActivePreset] = useState<StrategyPresetName | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(true);
  const { data: signalsData } = useSignals();

  useEffect(() => {
    const loaded = loadConfig();
    setConfig(loaded);
    setActivePreset(getPresetName(loaded));
  }, []);

  const update = <K extends keyof StrategyConfig>(key: K, value: StrategyConfig[K]) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    saveConfig(next);
    setActivePreset(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const selectEngine = (engine: StrategyEngineName, closeModal = false) => {
    const next = engine === "liquidityFlow" ? LIQUIDITY_FLOW_CONFIG : { ...DEFAULT_CONFIG, engine };
    setConfig(next);
    saveConfig(next);
    setActivePreset(engine === "confluence" ? "balanced" : null);
    if (closeModal) setShowPresetModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const applyPreset = (name: StrategyPresetName, closeModal = false) => {
    const preset = PRESETS[name];
    if (!preset) return;
    setConfig(preset);
    saveConfig(preset);
    setActivePreset(name);
    if (closeModal) setShowPresetModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const resetDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    saveConfig(DEFAULT_CONFIG);
    setActivePreset("balanced");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // ── Thinking Framework integration for trading type profiles ──
  const currentTypeProfiles = useMemo(() => {
    if (config.typeProfiles && Object.keys(config.typeProfiles).length > 0) {
      return config.typeProfiles;
    }
    return getFrameworkDefaults();
  }, [config.typeProfiles]);

  const updateTypeProfiles = (next: TradingTypeProfiles) => {
    const nextCfg: StrategyConfig = { ...config, typeProfiles: next };
    setConfig(nextCfg);
    saveConfig(nextCfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const resetTypeToFramework = (type: TradingType) => {
    const defaults = getFrameworkDefaults();
    const next = { ...currentTypeProfiles, [type]: defaults[type] };
    updateTypeProfiles(next);
  };

  const resetAllTypesToFramework = () => {
    updateTypeProfiles(getFrameworkDefaults());
  };

  const runThinkingFramework = () => {
    // Pull a representative regime if available from live signals (BTC preferred)
    const btcSignal = signalsData?.signals?.find((s: any) => s.pair?.startsWith("BTC"));
    const regime = btcSignal?.regime as MarketRegime | undefined;

    const application = applyThinkingFramework(currentTypeProfiles, regime ? { regime } : undefined);
    updateTypeProfiles(application.profiles);

    // Store trace for UI display (simple alert + could be expanded)
    const traceSummary = application.trace.map(t => 
      `${t.type}: ${t.principlesApplied.slice(0,2).join(", ")} - ${t.changes.length} adjustments`
    ).join(" | ");
    alert(`Thinking Framework Applied (regime: ${application.regime || "baseline"})\n\n${application.note}\n\nTrace: ${traceSummary}\n\nSee console for full details.`);
    console.log("Framework Application Trace:", application);
  };

  // Helper to mutate a single factor weight for a type
  const setTypeFactorWeight = (type: TradingType, factor: keyof FactorWeights, value: number) => {
    const defaults = getFrameworkDefaults();
    const prof = currentTypeProfiles[type] ?? defaults[type]!;
    const nextWeights: FactorWeights = { ...prof.weights, [factor]: Math.max(0, Math.min(60, Math.round(value))) };
    const nextProfiles: TradingTypeProfiles = {
      ...currentTypeProfiles,
      [type]: { weights: nextWeights },
    };
    updateTypeProfiles(nextProfiles);
  };

  // Weight total validation
  const weightTotal = config.etfFlow + config.sentiment + config.macro + config.momentum + config.treasury;
  const weightValid = config.engine === "liquidityFlow" || (weightTotal >= 90 && weightTotal <= 110);

  // Live dimension data
  const liveDims = signalsData?.dimensions?.BTC;

  // Active strategies
  const activeStrategies = useMemo(() => {
    if (config.engine === "liquidityFlow") {
      return [
        { name: "Spread Gate", desc: "Never enter when top-book spread is wider than 3 bps", active: true },
        { name: "Book Imbalance", desc: "Require dominant bid/ask depth before directional entry", active: true },
        { name: "EMA 9/21 Filter", desc: "Use only fast/slow EMA alignment for trend confirmation", active: true },
        { name: "RSI 14 Guard", desc: "Avoid entries when RSI shows poor continuation quality", active: true },
        { name: "News Trigger", desc: "Disabled because latency edge is not available", active: false },
      ];
    }

    return [
      { name: "Multi-Signal Momentum", desc: "ETF flow + sentiment + momentum for directional trades", active: config.etfFlow + config.sentiment + config.momentum > 50 },
      { name: "Macro Regime Follower", desc: "Adjusts risk based on Fed policy and macro indicators", active: config.macro >= 15 },
      { name: "Sentiment Reversal", desc: "Contrarian plays when sentiment hits extreme levels", active: config.sentiment >= 25 },
      { name: "Treasury Accumulation", desc: "Long bias when institutional BTC holdings increase", active: config.treasury >= 15 },
      { name: "Pure Technical", desc: "Momentum-driven entries with tight risk management", active: config.momentum >= 25 },
    ];
  }, [config]);

  const selectedEngine = STRATEGY_ENGINES[config.engine];

  return (
    <div className="space-y-5">
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-border-strong bg-card shadow-2xl">
            <div className="border-b border-border-default bg-inset/50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Strategy setup</p>
                  <h2 className="mt-1 text-2xl font-bold text-txt-primary">Choose strategy engine</h2>
                  <p className="mt-1 max-w-2xl text-sm text-txt-secondary">
                    Select the signal approach first. The breakdown and controls below will follow the selected engine.
                  </p>
                </div>
                <button
                  onClick={() => setShowPresetModal(false)}
                  className="rounded-lg border border-border-default px-3 py-1.5 text-[10px] font-semibold text-txt-secondary transition-colors hover:bg-elevated hover:text-txt-primary"
                >
                  Continue current
                </button>
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2">
              {STRATEGY_ENGINE_ORDER.map((engine) => {
                const meta = STRATEGY_ENGINES[engine];
                const selected = config.engine === engine;
                const isLiquidityFlow = engine === "liquidityFlow";
                const interactionTone = isLiquidityFlow
                  ? selected
                    ? "border-info bg-info/10 shadow-[0_0_32px_rgba(0,212,255,0.16)]"
                    : "border-border-default bg-inset/40 hover:border-info/70 hover:bg-info/10 hover:shadow-[0_0_32px_rgba(0,212,255,0.18)] focus-visible:ring-info/60"
                  : selected
                    ? "border-accent bg-accent/10 shadow-[0_0_32px_rgba(255,136,0,0.14)]"
                    : "border-border-default bg-inset/40 hover:border-accent/70 hover:bg-accent/10 hover:shadow-[0_0_32px_rgba(255,136,0,0.16)] focus-visible:ring-accent/60";
                return (
                  <button
                    type="button"
                    key={engine}
                    onClick={() => selectEngine(engine, true)}
                    className={`group cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card active:translate-y-0 ${interactionTone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`text-lg font-bold text-txt-primary transition-colors ${isLiquidityFlow ? "group-hover:text-info" : "group-hover:text-accent"}`}>
                          {meta.label}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-txt-secondary transition-colors group-hover:text-txt-primary">{meta.desc}</div>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold uppercase ${meta.tone}`}>
                        {meta.badge}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {meta.checks.slice(0, 4).map((check) => (
                        <div key={check} className="flex items-center gap-2 text-[11px] text-txt-tertiary transition-colors group-hover:text-txt-secondary">
                          <span className={`h-1.5 w-1.5 rounded-full transition-all group-hover:shadow-[0_0_10px_currentColor] ${isLiquidityFlow ? "bg-info text-info" : "bg-accent text-accent"}`} />
                          {check}
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 min-h-10 text-[10px] leading-5 text-txt-dim transition-colors group-hover:text-txt-secondary">{meta.thesis}</p>
                    <div className={`mt-4 rounded-lg border border-border-default bg-card/70 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-txt-primary transition-all ${
                      isLiquidityFlow
                        ? "group-hover:border-info/60 group-hover:bg-info/15 group-hover:text-info"
                        : "group-hover:border-accent/60 group-hover:bg-accent/15 group-hover:text-accent"
                    }`}>
                      Select {meta.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Strategy Configuration</h2>
          <p className="text-xs text-txt-muted mt-0.5">Customize signal scoring weights, risk parameters, and execution settings.</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge variant="live" size="sm">SAVED</Badge>}
          <button
            onClick={() => setShowPresetModal(true)}
            className="text-[10px] font-semibold text-accent border border-accent/30 bg-accent/10 px-2 py-1 rounded hover:bg-accent/15 transition-colors"
          >
            Choose Strategy
          </button>
          <button
            onClick={resetDefaults}
            className="text-[10px] text-txt-dim hover:text-txt-secondary border border-border-default px-2 py-1 rounded hover:bg-elevated transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      <Card padding="lg" className="border-accent/20 bg-accent/5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Strategy Engine</p>
              <p className="mt-1 text-sm font-semibold text-txt-primary">Choose one approach. Breakdown appears after selection.</p>
            </div>
            <Badge variant={config.engine === "liquidityFlow" ? "info" : "live"} size="sm">
              {selectedEngine.label}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {STRATEGY_ENGINE_ORDER.map((engine) => {
              const meta = STRATEGY_ENGINES[engine];
              const selected = config.engine === engine;
              return (
                <button
                  key={engine}
                  onClick={() => selectEngine(engine)}
                  className={`rounded-xl border p-4 text-left transition-all cursor-pointer hover:-translate-y-0.5 hover:bg-elevated/50 ${
                    selected ? "border-accent bg-accent/10 text-txt-primary" : "border-border-default bg-card text-txt-secondary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-txt-primary">{meta.label}</p>
                      <p className="mt-1 text-xs leading-5 text-txt-secondary">{meta.desc}</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold uppercase ${meta.tone}`}>
                      {meta.badge}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {meta.checks.map((check) => (
                      <span key={check} className="rounded border border-border-default bg-inset/50 px-2 py-1 text-[9px] font-semibold text-txt-tertiary">
                        {check}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border-default bg-card/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold text-txt-primary">{selectedEngine.label} Breakdown</p>
                <p className="mt-1 max-w-3xl text-[11px] leading-5 text-txt-secondary">{selectedEngine.thesis}</p>
              </div>
              <span className={`w-fit rounded-md border px-2 py-1 text-[9px] font-bold uppercase ${selectedEngine.tone}`}>
                Active
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {selectedEngine.breakdown.map((item) => (
                <div key={item.label} className="rounded-lg border border-border-default bg-inset/30 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-txt-dim">{item.label}</p>
                  <p className="mt-1 text-xs font-bold text-txt-primary">{item.value}</p>
                  <p className="mt-1 text-[10px] leading-4 text-txt-tertiary">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {config.engine === "confluence" && (
            <div className="grid gap-2 sm:grid-cols-3">
              {PRESET_ORDER.map((name) => {
                const meta = PRESET_META[name];
                return (
                  <button
                    key={name}
                    onClick={() => applyPreset(name)}
                    className={`rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                      activePreset === name
                        ? "border-accent bg-accent/10 text-txt-primary"
                        : "border-border-default bg-card text-txt-secondary hover:border-border-muted hover:bg-elevated/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{meta.label}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${meta.tone}`}>{meta.badge}</span>
                    </div>
                    <div className="mt-1 text-[10px] leading-4 text-txt-tertiary">{meta.desc}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dimension Weights / Liquidity Gates */}
        {config.engine === "confluence" ? (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Signal Dimension Weights</h3>
              <span className={`text-[10px] font-mono ${weightValid ? "text-txt-dim" : "text-hold"}`}>
                Total: {weightTotal}%{!weightValid && " (should be ~100%)"}
              </span>
            </div>
            <div className="space-y-3">
              {dimSliders.map((d) => {
                const liveScore = liveDims?.[d.key]?.score;
                const liveDetail = liveDims?.[d.key]?.detail;
                return (
                  <div key={d.key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 inline-flex items-center justify-center text-txt-secondary"><DimIcon icon={d.icon} /></span>
                      <span className="text-xs font-semibold w-20 shrink-0" style={{ color: d.color }}>{d.label}</span>
                      <div className="flex-1">
                        <ProgressBar value={liveScore ?? 0} color={d.color} height="sm" />
                      </div>
                      <span className="text-[10px] text-txt-dim w-8 text-right font-mono">{liveScore ?? "—"}%</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <input
                        type="range" min="0" max="50" value={config[d.key]}
                        onChange={(e) => update(d.key, Number(e.target.value))}
                        className="flex-1 h-1"
                        style={{ accentColor: d.color }}
                      />
                      <span className="text-xs w-8 text-right font-bold tabular-nums" style={{ color: d.color }}>
                        {config[d.key]}%
                      </span>
                    </div>
                    {liveDetail && (
                      <p className="text-[9px] text-txt-faint ml-6 mt-0.5 truncate">{liveDetail}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-border-default">
              <p className="text-[10px] text-txt-dim mb-2">Weight Distribution</p>
              <div className="h-3 rounded-full overflow-hidden flex bg-inset">
                {dimSliders.map((d) => (
                  <div
                    key={d.key}
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(config[d.key] / weightTotal) * 100}%`,
                      backgroundColor: d.color,
                      opacity: 0.7,
                    }}
                    title={`${d.label}: ${config[d.key]}%`}
                  />
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card padding="lg" className="border-info/20 bg-info/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Liquidity Flow Gates</h3>
              <Badge variant="info" size="sm">NEWS OFF</Badge>
            </div>
            <div className="grid gap-3">
              {[
                { label: "Spread Filter", value: "<= 3 bps", detail: "Skip every signal when the top-book spread is too wide." },
                { label: "Orderbook Depth", value: "Top 5", detail: "Compare bid/ask volume before the TA layer is allowed to fire." },
                { label: "Imbalance Gate", value: "Directional", detail: "Bid dominance supports long; ask dominance supports short." },
                { label: "TA Stack", value: "EMA 9 / EMA 21 / RSI 14", detail: "No MACD, OBV, Bollinger, regression, or news trigger." },
                { label: "Order Policy", value: "Limit only", detail: "Market orders are blocked for this strategy." },
                { label: "Timeout", value: "200ms", detail: "Unfilled limit order expires and the setup is skipped." },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border-default bg-card/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-txt-primary">{item.label}</p>
                    <span className="rounded border border-info/30 bg-info/10 px-2 py-1 text-[9px] font-bold text-info">{item.value}</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-txt-tertiary">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Right column: Active Strategies + Risk + Execution */}
        <div className="space-y-4">
          {/* Active Strategies */}
          <Card padding="lg">
            <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Active Strategies</h3>
            <div className="space-y-2">
              {activeStrategies.map((s) => (
                <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg bg-inset/30 border border-border-default">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${s.active ? "bg-buy animate-pulse" : "bg-border-default"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-txt-primary">{s.name}</p>
                    <p className="text-[9px] text-txt-dim">{s.desc}</p>
                  </div>
                  <Badge variant={s.active ? "live" : "muted"} size="sm">
                    {s.active ? "ON" : "OFF"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Risk Parameters */}
          <Card padding="lg">
            <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Risk Parameters</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-txt-tertiary">Min Confidence Threshold</span>
                  <span className="text-info font-bold tabular-nums">{config.minConfidence}%</span>
                </div>
                <input
                  type="range" min="50" max="95" value={config.minConfidence}
                  onChange={(e) => update("minConfidence", Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[9px] text-txt-faint mt-1">Signals below this confidence are hidden from the trading page.</p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-txt-tertiary">Max Position Size</span>
                  <span className="text-hold font-bold tabular-nums">{config.maxPositionSize}%</span>
                </div>
                <input
                  type="range" min={config.engine === "liquidityFlow" ? "0.1" : "1"} max="20" step={config.engine === "liquidityFlow" ? "0.1" : "1"} value={config.maxPositionSize}
                  onChange={(e) => update("maxPositionSize", Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[9px] text-txt-faint mt-1">
                  {config.engine === "liquidityFlow" ? "Liquidity Flow default is 0.5% per trade until fill quality is proven." : "Maximum percentage of portfolio per trade."}
                </p>
              </div>
            </div>
          </Card>

          {/* Execution Settings */}
          <Card padding="lg">
            <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Execution Settings</h3>
            <div className="space-y-2">
              {[
                { label: "Exchange", value: "SoDEX (ValueChain)", color: "#00ff88", editable: false },
                { label: "Order Type", value: "Limit Orders", color: "#00d4ff", editable: false },
                ...(config.engine === "liquidityFlow"
                  ? [
                      { label: "Spread Cap", value: "3 bps", color: "#00d4ff", editable: false },
                      { label: "Limit Timeout", value: "200ms", color: "#00d4ff", editable: false },
                      { label: "Max Open Positions", value: "2", color: "#ff8800", editable: false },
                    ]
                  : []),
                { label: "Slippage Tolerance", value: `${config.slippage}%`, color: "#ff8800", editable: true, key: "slippage" as const, min: config.engine === "liquidityFlow" ? 0.01 : 0.1, max: config.engine === "liquidityFlow" ? 0.1 : 5, step: config.engine === "liquidityFlow" ? 0.01 : 0.1 },
                { label: "Max Daily Trades", value: String(config.maxDailyTrades), color: "#00E5A8", editable: true, key: "maxDailyTrades" as const, min: 1, max: 50, step: 1 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-inset/30 border border-border-default">
                  <span className="text-xs text-txt-tertiary">{item.label}</span>
                  {item.editable ? (
                    <input
                      type="number"
                      value={parseFloat(item.value)}
                      onChange={(e) => update(item.key!, Number(e.target.value))}
                      className="w-16 text-right text-xs font-bold bg-transparent border-b border-border-strong outline-none tabular-nums"
                      style={{ color: item.color }}
                      min={item.min}
                      max={item.max}
                      step={item.step}
                    />
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
                  )}
                </div>
              ))}

              {/* Auto-execute toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-inset/30 border border-border-default">
                <div>
                  <span className="text-xs text-txt-tertiary">Auto-Execute</span>
                  <p className="text-[9px] text-txt-faint">Automatically place orders when confidence exceeds threshold</p>
                </div>
                <button
                  onClick={() => update("autoExecute", !config.autoExecute)}
                  className={`
                    relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
                    ${config.autoExecute ? "bg-accent/20 border-accent/30 backdrop-blur-sm" : "bg-border-default"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition duration-200
                      ${config.autoExecute ? "translate-x-4" : "translate-x-0"}
                    `}
                  />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Composite formula reference */}
      <Card padding="sm" className="bg-inset/30">
        <div className="flex items-center gap-3 text-[9px] text-txt-faint font-mono">
          {config.engine === "liquidityFlow" ? (
            <>
              <span>Gate = spread &lt;= 3bps AND top5 imbalance confirms direction</span>
              <span>·</span>
              <span>Signal = EMA(9/21) alignment + RSI(14) continuation</span>
              <span>·</span>
              <span>Execution = limit only, timeout 200ms, skip if unfilled</span>
            </>
          ) : (
            <>
              <span>Composite = TA(55%) + Sentiment(25%) + Fundamental(20%)</span>
              <span>·</span>
              <span>BUY: composite &gt; 60 AND momentum &gt; 55 AND trend &gt; 50 AND sentiment &gt; 45</span>
              <span>·</span>
              <span>Confidence = 50 + |composite - 50| × 1.5, cap 98</span>
            </>
          )}
        </div>
      </Card>

      {config.engine === "confluence" ? (
        <Card padding="lg">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Trading Type Weight Profiles</h3>
              <p className="text-[10px] text-txt-dim mt-0.5">
                Powered by the <span className="text-accent font-semibold">Agent Thinking Framework</span> — an explicit, auditable mental model for the SignalFlow agent. Edit weights manually or execute the framework to intelligently rebalance according to 5 core principles. Changes are live and affect V2 signals.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={runThinkingFramework}
                className="text-[10px] font-semibold px-3 py-1 rounded border border-accent/40 bg-accent/10 hover:bg-accent/15 text-accent transition-colors"
                title="Execute the structured Thinking Framework (with optional regime modulation) across all four trading type profiles"
              >
                Apply Thinking Framework
              </button>
              <button
                onClick={resetAllTypesToFramework}
                className="text-[10px] px-2 py-1 rounded border border-border-default hover:bg-elevated text-txt-dim hover:text-txt-secondary transition-colors"
              >
                Reset to Framework Defaults
              </button>
            </div>
          </div>

          {/* Thinking Framework explainer — the injected structured reasoning model */}
          <div className="mb-4 rounded-lg border border-border-default bg-inset/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Agent Thinking Framework</span>
              <span className="text-[9px] text-txt-faint">— 5 explicit principles that justify and dynamically adapt the 5-factor weights</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
              {THINKING_FRAMEWORK_PRINCIPLES.map((p) => (
                <div key={p.id} className="text-[9px] leading-snug">
                  <span className="font-semibold text-txt-primary">{p.title}:</span>{" "}
                  <span className="text-txt-tertiary">{p.description}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[8px] text-txt-faint">
              "Apply Thinking Framework" runs regime-conditional modulation + diversification floor + horizon rules, then re-normalizes all profiles. Manual edits always take precedence. This explicit reasoning layer makes the SignalFlow agent's multi-style strategy profiles auditable and truly agentic — a core differentiator for the SoSoValue Buildathon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {TRADING_TYPE_LIST.map((type) => {
              const prof = currentTypeProfiles[type.id] ?? { weights: type.weights };
              const weights = prof.weights;
              const weightSum = (Object.values(weights) as number[]).reduce((s, v) => s + v, 0);
              const sumOk = weightSum >= 95 && weightSum <= 105;

              return (
                <div
                  key={type.id}
                  className="p-3 rounded-xl border bg-inset/20"
                  style={{ borderColor: `${type.color}25` }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center"><type.icon size={16} style={{ color: type.color }} /></span>
                      <div>
                        <p className="text-xs font-bold" style={{ color: type.color }}>{type.label}</p>
                        <p className="text-[8px] text-txt-faint font-mono -mt-0.5">{type.timeframe}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => resetTypeToFramework(type.id)}
                      className="text-[8px] px-1.5 py-0.5 rounded border border-border-default text-txt-faint hover:text-txt-secondary hover:border-accent/40"
                      title="Reset this profile to framework default"
                    >
                      FW
                    </button>
                  </div>

                  {/* Editable factor weights */}
                  <div className="space-y-1.5">
                    {(Object.keys(weights) as (keyof typeof weights)[]).map((key) => {
                      const val = weights[key];
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[9px] text-txt-dim w-16 capitalize shrink-0">{key}</span>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            step={1}
                            value={val}
                            onChange={(e) => setTypeFactorWeight(type.id, key, Number(e.target.value))}
                            className="flex-1 h-1 accent-current"
                            style={{ accentColor: type.color }}
                          />
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={val}
                            onChange={(e) => setTypeFactorWeight(type.id, key, Number(e.target.value))}
                            className="w-10 text-[10px] font-mono text-right bg-transparent border-b border-border-default focus:border-accent outline-none tabular-nums"
                            style={{ color: type.color }}
                          />
                          <span className="text-[8px] text-txt-faint w-3">%</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-border-default flex items-center justify-between text-[8px]">
                    <span className={`font-mono ${sumOk ? "text-txt-faint" : "text-hold"}`}>
                      sum {weightSum}%
                    </span>
                    <span className="text-txt-faint">min {type.minConfidence}% · {type.maxLeverage}x</span>
                  </div>

                  {!sumOk && (
                    <p className="text-[8px] text-hold mt-0.5">Weights should total ~100%. Framework run will normalize.</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-2 text-[9px] text-txt-faint">
            These weights are injected at runtime into the 5-factor confluence engine (TREND / MOMENTUM / VOLATILITY / VOLUME / STRUCTURE) inside the V2 signal engine whenever a trading type is active. The Thinking Framework provides the explicit reasoning layer on top of the static defaults.
          </p>
        </Card>
      ) : (
        <Card padding="lg" className="border-info/20 bg-info/5">
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">
            Liquidity Flow Execution Contract
          </h3>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "News", value: "OFF" },
              { label: "Risk", value: "0.5%" },
              { label: "Positions", value: "Max 2" },
              { label: "Orders", value: "Limit only" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border-default bg-card/60 p-3">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-txt-dim">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-info">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

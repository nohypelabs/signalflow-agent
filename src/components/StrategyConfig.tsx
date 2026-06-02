"use client";

import { useState, useEffect, useMemo } from "react";
import { useSignals } from "@/lib/hooks/useSignals";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { TRADING_TYPE_LIST } from "@/lib/types/trading-type";
import { BarChartIcon, BriefcaseIcon, DataSourceIcon, DocumentIcon, TrendUpIcon } from "@/components/ui/icons";

const STORAGE_KEY = "signalflow-strategy-config";
type StrategyPresetName = "conservative" | "balanced" | "aggressive";

interface StrategyConfig {
  etfFlow: number;
  sentiment: number;
  macro: number;
  momentum: number;
  treasury: number;
  minConfidence: number;
  maxPositionSize: number;
  autoExecute: boolean;
  slippage: number;
  maxDailyTrades: number;
}

const DEFAULT_CONFIG: StrategyConfig = {
  etfFlow: 30,
  sentiment: 25,
  macro: 20,
  momentum: 15,
  treasury: 10,
  minConfidence: 70,
  maxPositionSize: 5,
  autoExecute: true,
  slippage: 0.5,
  maxDailyTrades: 10,
};

const PRESETS: Record<StrategyPresetName, StrategyConfig> = {
  conservative: { etfFlow: 35, sentiment: 15, macro: 25, momentum: 10, treasury: 15, minConfidence: 80, maxPositionSize: 3, autoExecute: false, slippage: 0.3, maxDailyTrades: 5 },
  balanced: { etfFlow: 30, sentiment: 25, macro: 20, momentum: 15, treasury: 10, minConfidence: 70, maxPositionSize: 5, autoExecute: true, slippage: 0.5, maxDailyTrades: 10 },
  aggressive: { etfFlow: 20, sentiment: 30, macro: 10, momentum: 30, treasury: 10, minConfidence: 55, maxPositionSize: 10, autoExecute: true, slippage: 1.0, maxDailyTrades: 25 },
};

const PRESET_META: Record<StrategyPresetName, { label: string; badge: string; desc: string; tone: string; bullets: string[] }> = {
  conservative: {
    label: "Conservative",
    badge: "Low Risk",
    desc: "High-confidence signals, smaller position size, manual execution bias.",
    tone: "border-info/30 bg-info/5 text-info",
    bullets: ["80% min confidence", "3% max position", "5 trades per day"],
  },
  balanced: {
    label: "Balanced",
    badge: "Default",
    desc: "Middle-ground signal scoring for steady validation and controlled execution.",
    tone: "border-accent/30 bg-accent/5 text-accent",
    bullets: ["70% min confidence", "5% max position", "10 trades per day"],
  },
  aggressive: {
    label: "Aggressive",
    badge: "High Activity",
    desc: "More momentum weight, lower confidence threshold, higher paper-trade cadence.",
    tone: "border-hold/30 bg-hold/5 text-hold",
    bullets: ["55% min confidence", "10% max position", "25 trades per day"],
  },
};

const PRESET_ORDER: StrategyPresetName[] = ["conservative", "balanced", "aggressive"];

function loadConfig(): StrategyConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_CONFIG;
}

function saveConfig(config: StrategyConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

function getPresetName(config: StrategyConfig): StrategyPresetName | null {
  for (const name of PRESET_ORDER) {
    const preset = PRESETS[name];
    const matches = (Object.keys(preset) as (keyof StrategyConfig)[]).every((key) => preset[key] === config[key]);
    if (matches) return name;
  }
  return null;
}

const dimSliders = [
  { key: "etfFlow" as const, label: "ETF Flow", color: "#00d4ff", icon: "etf" as const, desc: "Institutional capital via BTC/ETH ETF net flows" },
  { key: "sentiment" as const, label: "Sentiment", color: "#8B5CF6", icon: "sentiment" as const, desc: "News headline NLP — bullish/bearish keyword ratio" },
  { key: "macro" as const, label: "Macro", color: "#00ff88", icon: "macro" as const, desc: "Fed calendar, CPI releases, yield curve signals" },
  { key: "momentum" as const, label: "Momentum", color: "#ff8800", icon: "momentum" as const, desc: "RSI, MACD, Bollinger Bands, EMA crossover" },
  { key: "treasury" as const, label: "Treasury", color: "#ff4488", icon: "treasury" as const, desc: "Public company BTC holdings, institutional adoption" },
];

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

  // Weight total validation
  const weightTotal = config.etfFlow + config.sentiment + config.macro + config.momentum + config.treasury;
  const weightValid = weightTotal >= 90 && weightTotal <= 110;

  // Live dimension data
  const liveDims = signalsData?.dimensions?.BTC;

  // Active strategies
  const activeStrategies = useMemo(() => [
    { name: "Multi-Signal Momentum", desc: "ETF flow + sentiment + momentum for directional trades", active: config.etfFlow + config.sentiment + config.momentum > 50 },
    { name: "Macro Regime Follower", desc: "Adjusts risk based on Fed policy and macro indicators", active: config.macro >= 15 },
    { name: "Sentiment Reversal", desc: "Contrarian plays when sentiment hits extreme levels", active: config.sentiment >= 25 },
    { name: "Treasury Accumulation", desc: "Long bias when institutional BTC holdings increase", active: config.treasury >= 15 },
    { name: "Pure Technical", desc: "Momentum-driven entries with tight risk management", active: config.momentum >= 25 },
  ], [config]);

  return (
    <div className="space-y-5">
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-border-strong bg-card shadow-2xl">
            <div className="border-b border-border-default bg-inset/50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Strategy setup</p>
                  <h2 className="mt-1 text-2xl font-bold text-txt-primary">Choose your strategy preset</h2>
                  <p className="mt-1 max-w-2xl text-sm text-txt-secondary">
                    Pick the risk profile before tuning weights. You can still fine-tune every slider after selection.
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

            <div className="grid gap-3 p-4 md:grid-cols-3">
              {PRESET_ORDER.map((name) => {
                const meta = PRESET_META[name];
                const selected = activePreset === name;
                return (
                  <button
                    key={name}
                    onClick={() => applyPreset(name, true)}
                    className={`group rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border-strong hover:bg-elevated/70 ${
                      selected ? "border-accent bg-accent/10" : "border-border-default bg-inset/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-txt-primary">{meta.label}</div>
                        <div className="mt-1 text-xs leading-5 text-txt-secondary">{meta.desc}</div>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold uppercase ${meta.tone}`}>
                        {meta.badge}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {meta.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-center gap-2 text-[11px] text-txt-tertiary">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          {bullet}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg border border-border-default bg-card/70 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-txt-primary group-hover:border-accent/40">
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

      {/* Presets */}
      <Card padding="lg" className="border-accent/20 bg-accent/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Visible Presets</p>
            <p className="mt-1 text-sm font-semibold text-txt-primary">Choose the strategy profile before adjusting the sliders.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
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
        </div>
      </Card>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dimension Weights */}
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

          {/* Weight distribution visual */}
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
                  type="range" min="1" max="20" value={config.maxPositionSize}
                  onChange={(e) => update("maxPositionSize", Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[9px] text-txt-faint mt-1">Maximum percentage of portfolio per trade.</p>
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
                { label: "Slippage Tolerance", value: `${config.slippage}%`, color: "#ff8800", editable: true, key: "slippage" as const, min: 0.1, max: 5, step: 0.1 },
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
          <span>Composite = TA(55%) + Sentiment(25%) + Fundamental(20%)</span>
          <span>·</span>
          <span>BUY: composite &gt; 60 AND momentum &gt; 55 AND trend &gt; 50 AND sentiment &gt; 45</span>
          <span>·</span>
          <span>Confidence = 50 + |composite - 50| × 1.5, cap 98</span>
        </div>
      </Card>

      {/* Per-Type Weight Profiles */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">
          Trading Type Weight Profiles
        </h3>
        <p className="text-[10px] text-txt-dim mb-4">
          Each trading style uses different factor weights. The signal engine adapts automatically when a type is selected.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRADING_TYPE_LIST.map((type) => (
            <div
              key={type.id}
              className="p-3 rounded-xl border bg-inset/20"
              style={{ borderColor: `${type.color}25` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center"><type.icon size={18} style={{ color: type.color }} /></span>
                <div>
                  <p className="text-xs font-bold" style={{ color: type.color }}>{type.label}</p>
                  <p className="text-[9px] text-txt-faint font-mono">{type.timeframe}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {Object.entries(type.weights).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] text-txt-dim w-16 capitalize">{key}</span>
                    <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${value}%`,
                          backgroundColor: type.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-txt-faint w-6 text-right">{value}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-border-default flex items-center justify-between">
                <span className="text-[8px] text-txt-faint">Min conf: {type.minConfidence}%</span>
                <span className="text-[8px] text-txt-faint">Max lev: {type.maxLeverage}x</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

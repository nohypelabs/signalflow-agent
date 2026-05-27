"use client";

import { useState, useEffect, useMemo } from "react";
import { useSignals } from "@/lib/hooks/useSignals";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";

const STORAGE_KEY = "signalflow-strategy-config";

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

const PRESETS: Record<string, StrategyConfig> = {
  conservative: { etfFlow: 35, sentiment: 15, macro: 25, momentum: 10, treasury: 15, minConfidence: 80, maxPositionSize: 3, autoExecute: false, slippage: 0.3, maxDailyTrades: 5 },
  balanced: { etfFlow: 30, sentiment: 25, macro: 20, momentum: 15, treasury: 10, minConfidence: 70, maxPositionSize: 5, autoExecute: true, slippage: 0.5, maxDailyTrades: 10 },
  aggressive: { etfFlow: 20, sentiment: 30, macro: 10, momentum: 30, treasury: 10, minConfidence: 55, maxPositionSize: 10, autoExecute: true, slippage: 1.0, maxDailyTrades: 25 },
};

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

const dimSliders = [
  { key: "etfFlow" as const, label: "ETF Flow", color: "#00d4ff", icon: "📊", desc: "Institutional capital via BTC/ETH ETF net flows" },
  { key: "sentiment" as const, label: "Sentiment", color: "#8B5CF6", icon: "📰", desc: "News headline NLP — bullish/bearish keyword ratio" },
  { key: "macro" as const, label: "Macro", color: "#00ff88", icon: "🌐", desc: "Fed calendar, CPI releases, yield curve signals" },
  { key: "momentum" as const, label: "Momentum", color: "#ff8800", icon: "📈", desc: "RSI, MACD, Bollinger Bands, EMA crossover" },
  { key: "treasury" as const, label: "Treasury", color: "#ff4488", icon: "🏛", desc: "Public company BTC holdings, institutional adoption" },
];

export default function StrategyConfig() {
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const { data: signalsData } = useSignals();

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const update = <K extends keyof StrategyConfig>(key: K, value: StrategyConfig[K]) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    saveConfig(next);
    setActivePreset(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (!preset) return;
    setConfig(preset);
    saveConfig(preset);
    setActivePreset(name);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Strategy Configuration</h2>
          <p className="text-xs text-txt-muted mt-0.5">Customize signal scoring weights, risk parameters, and execution settings.</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge variant="live" size="sm">SAVED</Badge>}
          <button
            onClick={resetDefaults}
            className="text-[10px] text-txt-dim hover:text-txt-secondary border border-border-default px-2 py-1 rounded hover:bg-elevated transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-txt-dim uppercase tracking-wider">Presets:</span>
        <div className="flex items-center gap-1.5">
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer capitalize ${
                activePreset === name
                  ? "border-accent bg-accent/10 text-accent font-semibold"
                  : "border-border-default bg-card text-txt-secondary hover:border-border-muted"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <span className="text-[9px] text-txt-faint ml-auto">Conservative: high confidence, low risk. Aggressive: more trades, higher risk.</span>
      </div>

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
                    <span className="text-sm">{d.icon}</span>
                    <span className="text-xs font-semibold w-20 shrink-0" style={{ color: d.color }}>{d.label}</span>
                    <div className="flex-1">
                      <ProgressBar value={liveScore ?? 0} color={d.color} height="sm" />
                    </div>
                    <span className="text-[10px] text-txt-dim w-8 text-right font-mono">{liveScore ?? "—"}%</span>
                  </div>
                  <div className="flex items-center gap-2 ml-7">
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
                    <p className="text-[9px] text-txt-faint ml-7 mt-0.5 truncate">{liveDetail}</p>
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
                    ${config.autoExecute ? "bg-accent" : "bg-border-default"}
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
    </div>
  );
}

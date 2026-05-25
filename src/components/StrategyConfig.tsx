"use client";

import { useState, useEffect } from "react";
import { useSignals } from "@/lib/use-signals";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import PageHeader from "@/components/ui/PageHeader";

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
  { key: "etfFlow" as const, label: "ETF Flow Weight", color: "var(--dim-etf)" },
  { key: "sentiment" as const, label: "Sentiment Weight", color: "var(--dim-sentiment)" },
  { key: "macro" as const, label: "Macro Weight", color: "var(--dim-macro)" },
  { key: "momentum" as const, label: "Momentum Weight", color: "var(--dim-momentum)" },
  { key: "treasury" as const, label: "Treasury Weight", color: "var(--dim-treasury)" },
];

export default function StrategyConfig() {
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const { data: signalsData } = useSignals();

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const update = <K extends keyof StrategyConfig>(key: K, value: StrategyConfig[K]) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    saveConfig(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const liveDims = signalsData?.dimensions?.BTC;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Strategy Configuration"
        badge={saved ? { variant: "live", label: "SAVED" } : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dimension Weights */}
        <Card padding="lg">
          <h3 className="font-semibold text-sm mb-4 text-txt-primary">Signal Dimension Weights</h3>
          <div className="flex flex-col gap-3">
            {dimSliders.map((d) => (
              <div key={d.key}>
                <div className="flex items-center gap-3">
                  <span className="text-xs w-28 shrink-0" style={{ color: d.color }}>{d.label}</span>
                  <div className="flex-1 h-2 bg-border-default rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${config[d.key] * 3.3}%`, backgroundColor: d.color }}
                    />
                  </div>
                  <input
                    type="range" min="0" max="50" value={config[d.key]}
                    onChange={(e) => update(d.key, Number(e.target.value))}
                    className="w-16"
                    style={{ accentColor: d.color }}
                  />
                  <span className="text-xs w-8 text-right font-semibold tabular-nums" style={{ color: d.color }}>{config[d.key]}%</span>
                </div>
                {liveDims && (
                  <p className="text-[10px] text-txt-dim mt-0.5 ml-[7.5rem]">
                    Live {d.label.replace(" Weight", "")}: {liveDims[d.key].score}% — {liveDims[d.key].detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Active Strategies */}
        <Card padding="lg">
          <h3 className="font-semibold text-sm mb-4 text-txt-primary">Active Strategies</h3>
          <div className="flex flex-col gap-3">
            {[
              { name: "Multi-Signal Momentum", desc: "Combines ETF flow + sentiment + momentum for directional trades", active: config.etfFlow + config.sentiment + config.momentum > 50 },
              { name: "Macro Regime Follower", desc: "Adjusts risk based on Fed policy and macro indicators", active: config.macro >= 15 },
              { name: "Sentiment Reversal", desc: "Contrarian plays when sentiment hits extreme levels", active: config.sentiment >= 25 },
            ].map((s) => (
              <Card key={s.name} variant="inset" padding="sm" className="flex items-center gap-3">
                <StatusDot status={s.active ? "live" : "offline"} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-txt-primary">{s.name}</p>
                  <p className="text-[10px] text-txt-muted">{s.desc}</p>
                </div>
                <Badge variant={s.active ? "live" : "muted"} size="sm">
                  {s.active ? "ON" : "OFF"}
                </Badge>
              </Card>
            ))}
          </div>
        </Card>

        {/* Risk Parameters */}
        <Card padding="lg">
          <h3 className="font-semibold text-sm mb-4 text-txt-primary">Risk Parameters</h3>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-txt-tertiary">Min Confidence Threshold</span>
                <span className="text-info font-semibold tabular-nums">{config.minConfidence}%</span>
              </div>
              <input
                type="range" min="50" max="95" value={config.minConfidence}
                onChange={(e) => update("minConfidence", Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-txt-tertiary">Max Position Size</span>
                <span className="text-hold font-semibold tabular-nums">{config.maxPositionSize}%</span>
              </div>
              <input
                type="range" min="1" max="20" value={config.maxPositionSize}
                onChange={(e) => update("maxPositionSize", Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Execution Settings */}
        <Card padding="lg">
          <h3 className="font-semibold text-sm mb-4 text-txt-primary">Execution Settings</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: "Exchange", value: "SoDEX (ValueChain)", color: "var(--color-buy)" },
              { label: "Order Type", value: "Limit Orders", color: "var(--color-info)" },
              {
                label: "Slippage Tolerance",
                value: `${config.slippage}%`,
                color: "var(--color-hold)",
                input: true,
                key: "slippage" as const,
              },
              {
                label: "Auto-Execute",
                value: config.autoExecute ? "Enabled" : "Disabled",
                color: config.autoExecute ? "var(--color-buy)" : "var(--color-sell)",
                toggle: true,
                key: "autoExecute" as const,
              },
              {
                label: "Max Daily Trades",
                value: String(config.maxDailyTrades),
                color: "var(--accent-primary)",
                input: true,
                key: "maxDailyTrades" as const,
              },
            ].map((item) => (
              <Card key={item.label} variant="inset" padding="sm" className="flex justify-between items-center">
                <span className="text-xs text-txt-tertiary">{item.label}</span>
                {item.toggle ? (
                  <button
                    onClick={() => update(item.key!, !config[item.key!])}
                    className={`text-xs font-semibold px-2 py-0.5 rounded cursor-pointer ${
                      config[item.key!] ? "bg-buy-muted text-buy" : "bg-sell-muted text-sell"
                    }`}
                  >
                    {item.value}
                  </button>
                ) : item.input ? (
                  <input
                    type="number"
                    value={config[item.key!]}
                    onChange={(e) => update(item.key!, Number(e.target.value))}
                    className="w-16 text-right text-xs font-semibold bg-transparent border-b border-border-strong outline-none tabular-nums"
                    style={{ color: item.color }}
                    min={item.key === "slippage" ? 0.1 : 1}
                    max={item.key === "slippage" ? 5 : 50}
                    step={item.key === "slippage" ? 0.1 : 1}
                  />
                ) : (
                  <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
                )}
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSignals } from "@/lib/use-signals";

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
  { key: "etfFlow" as const, label: "ETF Flow Weight", color: "#00d4ff" },
  { key: "sentiment" as const, label: "Sentiment Weight", color: "#7b2fff" },
  { key: "macro" as const, label: "Macro Weight", color: "#00ff88" },
  { key: "momentum" as const, label: "Momentum Weight", color: "#ff8800" },
  { key: "treasury" as const, label: "Treasury Weight", color: "#ff4488" },
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

  // Get live dimension scores for BTC as reference
  const liveDims = signalsData?.dimensions?.BTC;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">Strategy Configuration</h2>
        {saved && (
          <span className="text-[10px] px-2 py-0.5 bg-[#00ff8820] text-[#00ff88] border border-[#00ff8830] rounded animate-slide-up">
            Saved
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dimension Weights */}
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Signal Dimension Weights</h3>
          <div className="flex flex-col gap-3">
            {dimSliders.map((d) => (
              <div key={d.key}>
                <div className="flex items-center gap-3">
                  <span className="text-xs w-28 shrink-0" style={{ color: d.color }}>{d.label}</span>
                  <div className="flex-1 h-2.5 bg-[#1a1a2e] rounded-full overflow-hidden relative">
                    <div className="h-full rounded-full" style={{ width: `${config[d.key] * 3.3}%`, backgroundColor: d.color }} />
                  </div>
                  <input
                    type="range" min="0" max="50" value={config[d.key]}
                    onChange={(e) => update(d.key, Number(e.target.value))}
                    className="w-16 h-1 bg-[#1a1a2e] rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: d.color }}
                  />
                  <span className="text-xs w-8 text-right font-semibold" style={{ color: d.color }}>{config[d.key]}%</span>
                </div>
                {liveDims && (
                  <p className="text-[10px] text-[#444455] mt-0.5 ml-[7.5rem]">
                    Live {d.label.replace(" Weight", "")}: {liveDims[d.key].score}% — {liveDims[d.key].detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active Strategies */}
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Active Strategies</h3>
          <div className="flex flex-col gap-3">
            {[
              { name: "Multi-Signal Momentum", desc: "Combines ETF flow + sentiment + momentum for directional trades", active: config.etfFlow + config.sentiment + config.momentum > 50 },
              { name: "Macro Regime Follower", desc: "Adjusts risk based on Fed policy and macro indicators", active: config.macro >= 15 },
              { name: "Sentiment Reversal", desc: "Contrarian plays when sentiment hits extreme levels", active: config.sentiment >= 25 },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-3 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
                <div className={`w-3 h-3 rounded-full ${s.active ? "bg-[#00ff88] animate-pulse-glow" : "bg-[#333355]"}`} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white">{s.name}</p>
                  <p className="text-[10px] text-[#666677]">{s.desc}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.active ? "border-[#00ff8840] text-[#00ff88] bg-[#00ff8810]" : "border-[#333355] text-[#666677]"}`}>
                  {s.active ? "ON" : "OFF"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Parameters */}
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Risk Parameters</h3>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#888888]">Min Confidence Threshold</span>
                <span className="text-[#00d4ff] font-semibold">{config.minConfidence}%</span>
              </div>
              <input
                type="range" min="50" max="95" value={config.minConfidence}
                onChange={(e) => update("minConfidence", Number(e.target.value))}
                className="w-full h-1.5 bg-[#1a1a2e] rounded-full appearance-none cursor-pointer accent-[#00d4ff]"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#888888]">Max Position Size</span>
                <span className="text-[#ff8800] font-semibold">{config.maxPositionSize}%</span>
              </div>
              <input
                type="range" min="1" max="20" value={config.maxPositionSize}
                onChange={(e) => update("maxPositionSize", Number(e.target.value))}
                className="w-full h-1.5 bg-[#1a1a2e] rounded-full appearance-none cursor-pointer accent-[#ff8800]"
              />
            </div>
          </div>
        </div>

        {/* Execution Settings */}
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Execution Settings</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: "Exchange", value: "SoDEX (ValueChain)", color: "#00ff88" },
              { label: "Order Type", value: "Limit Orders", color: "#00d4ff" },
              {
                label: "Slippage Tolerance",
                value: `${config.slippage}%`,
                color: "#ff8800",
                input: true,
                key: "slippage" as const,
              },
              {
                label: "Auto-Execute",
                value: config.autoExecute ? "Enabled" : "Disabled",
                color: config.autoExecute ? "#00ff88" : "#ff4444",
                toggle: true,
                key: "autoExecute" as const,
              },
              {
                label: "Max Daily Trades",
                value: String(config.maxDailyTrades),
                color: "#7b2fff",
                input: true,
                key: "maxDailyTrades" as const,
              },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
                <span className="text-xs text-[#888888]">{item.label}</span>
                {item.toggle ? (
                  <button
                    onClick={() => update(item.key!, !config[item.key!])}
                    className={`text-xs font-semibold px-2 py-0.5 rounded cursor-pointer ${config[item.key!] ? "bg-[#00ff8820] text-[#00ff88]" : "bg-[#ff444420] text-[#ff4444]"}`}
                  >
                    {item.value}
                  </button>
                ) : item.input ? (
                  <input
                    type="number"
                    value={config[item.key!]}
                    onChange={(e) => update(item.key!, Number(e.target.value))}
                    className="w-16 text-right text-xs font-semibold bg-transparent border-b border-[#333355] outline-none"
                    style={{ color: item.color }}
                    min={item.key === "slippage" ? 0.1 : 1}
                    max={item.key === "slippage" ? 5 : 50}
                    step={item.key === "slippage" ? 0.1 : 1}
                  />
                ) : (
                  <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

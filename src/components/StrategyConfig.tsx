"use client";

import { useState } from "react";

const strategies = [
  { name: "Multi-Signal Momentum", active: true, desc: "Combines ETF flow + sentiment + momentum for directional trades" },
  { name: "Macro Regime Follower", active: true, desc: "Adjusts risk based on Fed policy and macro indicators" },
  { name: "Sentiment Reversal", active: false, desc: "Contrarian plays when sentiment hits extreme levels" },
];

const sliders = [
  { label: "ETF Flow Weight", value: 30, color: "#00d4ff" },
  { label: "Sentiment Weight", value: 25, color: "#7b2fff" },
  { label: "Macro Weight", value: 20, color: "#00ff88" },
  { label: "Momentum Weight", value: 15, color: "#ff8800" },
  { label: "Treasury Weight", value: 10, color: "#ff4488" },
];

export default function StrategyConfig() {
  const [minConfidence, setMinConfidence] = useState(70);
  const [maxPositionSize, setMaxPositionSize] = useState(5);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Strategy Configuration</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Active Strategies</h3>
          <div className="flex flex-col gap-3">
            {strategies.map((s) => (
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

        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Signal Dimension Weights</h3>
          <div className="flex flex-col gap-3">
            {sliders.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs w-28 shrink-0" style={{ color: s.color }}>{s.label}</span>
                <div className="flex-1 h-2.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.value * 3.3}%`, backgroundColor: s.color }} />
                </div>
                <span className="text-xs w-8 text-right font-semibold" style={{ color: s.color }}>{s.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Risk Parameters</h3>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#888888]">Min Confidence Threshold</span>
                <span className="text-[#00d4ff] font-semibold">{minConfidence}%</span>
              </div>
              <input
                type="range" min="50" max="95" value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full h-1.5 bg-[#1a1a2e] rounded-full appearance-none cursor-pointer accent-[#00d4ff]"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#888888]">Max Position Size</span>
                <span className="text-[#ff8800] font-semibold">{maxPositionSize}%</span>
              </div>
              <input
                type="range" min="1" max="20" value={maxPositionSize}
                onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                className="w-full h-1.5 bg-[#1a1a2e] rounded-full appearance-none cursor-pointer accent-[#ff8800]"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Execution Settings</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: "Exchange", value: "SoDEX (ValueChain)", color: "#00ff88" },
              { label: "Order Type", value: "Limit Orders", color: "#00d4ff" },
              { label: "Slippage Tolerance", value: "0.5%", color: "#ff8800" },
              { label: "Auto-Execute", value: "Enabled", color: "#00ff88" },
              { label: "Max Daily Trades", value: "10", color: "#7b2fff" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
                <span className="text-xs text-[#888888]">{item.label}</span>
                <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

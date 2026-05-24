"use client";

import { Signal } from "@/lib/mock-data";
import type { SignalDimensions } from "@/lib/use-signals";

const dimLabels: { key: keyof Signal["dimensions"]; label: string; color: string }[] = [
  { key: "etfFlow", label: "ETF Flow", color: "#00d4ff" },
  { key: "sentiment", label: "Sentiment", color: "#7b2fff" },
  { key: "macro", label: "Macro", color: "#00ff88" },
  { key: "momentum", label: "Momentum", color: "#ff8800" },
  { key: "treasury", label: "Treasury", color: "#ff4488" },
];

const actionBadge: Record<string, string> = {
  BUY: "bg-[#00ff8820] border-[#00ff88] text-[#00ff88]",
  SELL: "bg-[#ff444420] border-[#ff4444] text-[#ff4444]",
  HOLD: "bg-[#ff880020] border-[#ff8800] text-[#ff8800]",
};

interface Props {
  signal: Signal | null;
  liveDims?: SignalDimensions | null;
}

export default function AIReasoning({ signal, liveDims }: Props) {
  if (!signal) {
    return (
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
        <p className="text-[#666677] text-sm">Select a signal to view AI reasoning</p>
      </div>
    );
  }

  const hasLive = liveDims !== undefined && liveDims !== null;

  return (
    <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-semibold text-sm">
          {hasLive ? "Live Signal Data" : "AI Reasoning"}
        </h3>
        <span
          className={`px-2 py-0.5 text-xs font-bold rounded border ${actionBadge[signal.action]}`}
        >
          {signal.action}
        </span>
        <span className="text-sm text-white">{signal.pair}</span>
        {hasLive && (
          <span className="px-1.5 py-0.5 text-[10px] bg-[#00ff8820] text-[#00ff88] border border-[#00ff8830] rounded">
            LIVE
          </span>
        )}
        <span className="text-xs text-[#666677] ml-auto">{signal.timeAgo}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-xs text-[#888888] mb-1">Signal Thesis</p>
          <p className="text-sm text-[#cccccc] leading-relaxed bg-[#0d0d2a] border border-[#7b2fff30] rounded-lg p-3">
            &ldquo;{signal.reasoning}&rdquo;
          </p>

          <div className="mt-4">
            <p className="text-xs text-[#888888] mb-2">
              {hasLive ? "Live Dimensions (SoSoValue)" : "Signal Dimensions"}
            </p>
            <div className="flex flex-col gap-2">
              {dimLabels.map((d) => {
                const score = hasLive ? liveDims[d.key].score : signal.dimensions[d.key];
                const detail =
                  (hasLive ? liveDims[d.key].detail : null) ??
                  signal.dimensionDetails?.[d.key]?.detail ??
                  null;
                return (
                  <div key={d.key}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-20 shrink-0" style={{ color: d.color }}>
                        {d.label}
                      </span>
                      <div className="flex-1 h-3 bg-[#1a1a2e] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${score}%`, backgroundColor: d.color }}
                        />
                      </div>
                      <span className="text-xs w-8 text-right font-semibold" style={{ color: d.color }}>
                        {score}%
                      </span>
                    </div>
                    {detail && (
                      <p className="text-[10px] text-[#555566] mt-0.5 ml-[5.5rem] leading-relaxed">
                        {detail}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-[#888888] mb-2">Trade Execution Plan</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Order Type", value: signal.execution.orderType, color: "#00ff88" },
              {
                label: "Entry Price",
                value: `$${signal.execution.entry.toLocaleString()}`,
                color: "#ffffff",
              },
              {
                label: "Take Profit",
                value:
                  signal.execution.takeProfit > 0
                    ? `$${signal.execution.takeProfit.toLocaleString()}`
                    : "—",
                color: "#00ff88",
              },
              {
                label: "Stop Loss",
                value:
                  signal.execution.stopLoss > 0
                    ? `$${signal.execution.stopLoss.toLocaleString()}`
                    : "—",
                color: "#ff4444",
              },
              { label: "Position Size", value: signal.execution.positionSize, color: "#ffffff" },
              { label: "Risk/Reward", value: signal.execution.riskReward, color: "#00ff88" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2.5"
              >
                <p className="text-[10px] text-[#666677]">{item.label}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#888888] mt-4 mb-2">Data Sources Used</p>
          <div className="flex flex-wrap gap-1.5">
            {signal.sources.map((src) => (
              <span
                key={src}
                className="px-2 py-1 text-[10px] bg-[#1a1a2e] border border-[#333355] rounded-md text-[#aaaaaa]"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-[#0a0a14] border border-[#333355] rounded-lg px-3 py-2">
        <p className="text-[10px] text-[#666677] font-mono">
          Signal generated: {new Date().toISOString().slice(0, 19)}Z | Confidence:{" "}
          {signal.confidence}% | Dimensions: 5 scored | SoSoValue API calls:{" "}
          {signal.sources.length}
        </p>
      </div>
    </div>
  );
}

"use client";

import { signals, Signal } from "@/lib/mock-data";

const actionColors: Record<Signal["action"], { bg: string; border: string; text: string }> = {
  BUY: { bg: "bg-[#0d2a1a]", border: "border-[#00ff8840]", text: "text-[#00ff88]" },
  SELL: { bg: "bg-[#2a0d0d]", border: "border-[#ff444440]", text: "text-[#ff4444]" },
  HOLD: { bg: "bg-[#1a1a0d]", border: "border-[#ff880040]", text: "text-[#ff8800]" },
};

export default function SignalList({
  onSelect,
  selected,
}: {
  onSelect: (s: Signal) => void;
  selected: string | null;
}) {
  return (
    <div className="w-full lg:w-64 bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4 shrink-0">
      <h3 className="font-semibold text-sm mb-3">Latest Signals</h3>
      <div className="flex flex-col gap-2">
        {signals.map((s) => {
          const c = actionColors[s.action];
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`text-left w-full rounded-lg p-3 border transition-all ${c.bg} ${c.border} ${
                selected === s.id ? "ring-1 ring-white/20" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-white">{s.pair}</span>
                <span className={`text-xs font-bold ${c.text}`}>{s.action}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-[#888888] truncate max-w-[140px]">
                  {s.reasoning.slice(0, 40)}...
                </span>
                <span className={`text-[10px] ${c.text}`}>{s.confidence}%</span>
              </div>
              <span className="text-[9px] text-[#444455]">{s.timeAgo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

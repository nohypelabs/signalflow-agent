"use client";

export default function TopBar() {
  return (
    <header className="flex items-center justify-between px-6 h-14 bg-[#0e0e1a] border-b border-[#1a1a2e] shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-[#00ff88] animate-pulse-glow" />
        <span className="font-bold text-base">SignalFlow Agent</span>
        <span className="text-xs text-[#00ff88] font-semibold">LIVE</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 text-xs rounded-full border border-[#00ff88] text-[#00ff88] bg-[#00ff8810]">
          Connected
        </span>
        <span className="px-3 py-1 text-xs rounded-full border border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff10]">
          SoDEX
        </span>
        <span className="px-3 py-1 text-xs rounded-full border border-[#7b2fff] text-[#7b2fff] bg-[#7b2fff10]">
          AI Active
        </span>
      </div>
    </header>
  );
}

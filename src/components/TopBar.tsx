"use client";

import WalletButton from "./WalletButton";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
}

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
}: Props) {
  const statusColor =
    sodexStatus === "connected" ? "#00ff88" : sodexStatus === "loading" ? "#ff8800" : "#ff4444";
  const statusLabel =
    sodexStatus === "connected" ? "SoDEX Live" : sodexStatus === "loading" ? "Connecting..." : "SoDEX Offline";

  return (
    <header className="flex items-center justify-between px-6 h-14 bg-[#0e0e1a] border-b border-[#1a1a2e] shrink-0">
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full animate-pulse-glow"
          style={{ backgroundColor: statusColor }}
        />
        <span className="font-bold text-base">SignalFlow Agent</span>
        <span className="text-xs font-semibold" style={{ color: statusColor }}>
          {sodexStatus === "connected" ? "LIVE" : sodexStatus === "loading" ? "SYNC" : "OFFLINE"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <WalletButton />
        <span
          className="px-3 py-1 text-xs rounded-full border"
          style={{
            borderColor: statusColor,
            color: statusColor,
            backgroundColor: `${statusColor}10`,
          }}
        >
          {statusLabel}{tickerCount !== undefined ? ` (${tickerCount})` : ""}
        </span>
        <span className="px-3 py-1 text-xs rounded-full border border-[#7b2fff] text-[#7b2fff] bg-[#7b2fff10]">
          AI Standby
        </span>
      </div>
    </header>
  );
}

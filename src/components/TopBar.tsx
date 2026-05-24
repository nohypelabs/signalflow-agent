"use client";

import WalletButton from "./WalletButton";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  onMenuToggle?: () => void;
}

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  onMenuToggle,
}: Props) {
  const statusColor =
    sodexStatus === "connected" ? "#00ff88" : sodexStatus === "loading" ? "#ff8800" : "#ff4444";
  const statusLabel =
    sodexStatus === "connected" ? "SoDEX Live" : sodexStatus === "loading" ? "Connecting..." : "SoDEX Offline";

  return (
    <header className="flex items-center justify-between px-3 md:px-6 h-14 bg-[#0e0e1a] border-b border-[#1a1a2e] shrink-0">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 text-[#666677] hover:text-white transition-colors"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        <div
          className="w-2.5 h-2.5 rounded-full animate-pulse-glow shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        <span className="font-bold text-sm md:text-base truncate">SignalFlow Agent</span>
        <span className="hidden sm:inline text-[10px] md:text-xs font-semibold" style={{ color: statusColor }}>
          {sodexStatus === "connected" ? "LIVE" : sodexStatus === "loading" ? "SYNC" : "OFFLINE"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <WalletButton />
        <span
          className="hidden sm:inline px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-full border"
          style={{
            borderColor: statusColor,
            color: statusColor,
            backgroundColor: `${statusColor}10`,
          }}
        >
          {statusLabel}{tickerCount !== undefined ? ` (${tickerCount})` : ""}
        </span>
      </div>
    </header>
  );
}

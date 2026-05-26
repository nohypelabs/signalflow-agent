"use client";

import WalletButton from "./WalletButton";
import StatusDot from "@/components/ui/StatusDot";
import Badge from "@/components/ui/Badge";
import { MenuIcon } from "@/components/ui/icons";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  onMenuToggle?: () => void;
  btcPrice?: string;
  btcChange?: number;
}

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  onMenuToggle,
  btcPrice,
  btcChange,
}: Props) {
  const dotStatus =
    sodexStatus === "connected" ? "live" : sodexStatus === "loading" ? "warning" : "error";
  const badgeVariant =
    sodexStatus === "connected" ? "live" : "error";
  const statusLabel =
    sodexStatus === "connected"
      ? `SoDEX Live${tickerCount !== undefined ? ` (${tickerCount})` : ""}`
      : sodexStatus === "loading"
        ? "Connecting..."
        : "SoDEX Offline";

  return (
    <header className="flex items-center justify-between px-3 md:px-5 h-12 bg-surface border-b border-border-default shrink-0">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1 text-txt-muted hover:text-txt-primary transition-colors"
          aria-label="Menu"
        >
          <MenuIcon size={20} />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-accent/20 border border-accent-dim flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="font-bold text-sm text-txt-primary tracking-tight">SignalFlow</span>
          <span className="text-[10px] text-txt-dim font-medium hidden sm:inline">Agent</span>
        </div>

        <StatusDot status={dotStatus} pulse size="sm" />
      </div>

      {/* BTC price ticker — center */}
      {btcPrice && (
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[10px] text-txt-dim">BTC</span>
          <span className="text-txt-primary font-semibold tabular-nums">{btcPrice}</span>
          {btcChange !== undefined && (
            <span className={`text-[11px] font-semibold ${btcChange >= 0 ? "text-buy" : "text-sell"}`}>
              {btcChange >= 0 ? "+" : ""}{btcChange.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 md:gap-2">
        <Badge variant={badgeVariant} size="md" className="hidden md:inline-flex">
          {statusLabel}
        </Badge>
        <WalletButton />
      </div>
    </header>
  );
}

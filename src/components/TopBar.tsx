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
    <header className="flex items-center justify-between px-3 md:px-6 h-14 bg-surface border-b border-border-default shrink-0">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 text-txt-muted hover:text-txt-primary transition-colors"
          aria-label="Menu"
        >
          <MenuIcon size={20} />
        </button>

        <StatusDot status={dotStatus} pulse size="md" />
        <span className="font-bold text-sm text-txt-primary">SignalFlow</span>
        <span className="font-normal text-sm text-txt-muted">Agent</span>
      </div>

      {/* BTC price ticker — center */}
      {btcPrice && (
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
          <span className="text-txt-secondary">BTC</span>
          <span className="text-txt-primary font-semibold">{btcPrice}</span>
          {btcChange !== undefined && (
            <span className={btcChange >= 0 ? "text-buy" : "text-sell"}>
              {btcChange >= 0 ? "+" : ""}{btcChange.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 md:gap-2">
        <Badge variant={badgeVariant} size="md">
          {statusLabel}
        </Badge>
        <WalletButton />
      </div>
    </header>
  );
}

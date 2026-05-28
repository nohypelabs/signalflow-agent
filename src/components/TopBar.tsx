"use client";

import WalletButton from "./WalletButton";
import StatusDot from "@/components/ui/StatusDot";
import MarketTickerTape from "./MarketTickerTape";
import FavoriteTickerBar from "@/components/layout/FavoriteTickerBar";
import { useFavoriteTickers } from "@/lib/hooks/useFavoriteTickers";
import { MenuIcon } from "@/components/ui/icons";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  onMenuToggle?: () => void;
  btcPrice?: string;
  btcChange?: number;
  tickerMap?: Map<string, SoDEXTicker>;
}

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  onMenuToggle,
  btcPrice,
  btcChange,
  tickerMap,
}: Props) {
  const {
    favoriteTickers,
    isFavorite,
    toggleFavorite,
  } = useFavoriteTickers(tickerMap);

  const dotStatus =
    sodexStatus === "connected" ? "live" : sodexStatus === "loading" ? "warning" : "error";

  const statusLabel =
    sodexStatus === "connected"
      ? "SoDEX Live"
      : sodexStatus === "loading"
        ? "Connecting..."
        : "SoDEX Offline";

  const ethTicker = tickerMap?.get("vETH_vUSDC");
  const ethPrice = ethTicker
    ? `$${parseFloat(ethTicker.lastPx).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;
  const ethChange = ethTicker ? ethTicker.changePct : undefined;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

  return (
    <div className="shrink-0">
      {/* Scrolling market tape */}
      <MarketTickerTape
        tickerMap={tickerMap}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />

      {/* Favorite watchlist bar — hidden for now, too busy with market tape */}
      {/* <FavoriteTickerBar tickers={favoriteTickers} /> */}

      {/* Main header bar */}
      <header className="relative flex items-center justify-between px-3 md:px-4 h-11 bg-surface border-b border-border-default">
        {/* Subtle accent glow at bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        {/* Left: menu + brand */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1 text-txt-muted hover:text-txt-primary transition-colors"
            aria-label="Menu"
          >
            <MenuIcon size={18} />
          </button>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="font-bold text-[13px] text-txt-primary tracking-tight">SignalFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-1 ml-1">
            <StatusDot status={dotStatus} pulse size="sm" />
            <span className="text-[10px] text-txt-muted">{statusLabel}</span>
          </div>
        </div>

        {/* Center: compact price summary */}
        <div className="hidden sm:flex items-center gap-4 font-mono text-[11px]">
          {btcPrice && (
            <div className="flex items-center gap-1.5">
              <span className="text-txt-faint">BTC</span>
              <span className="text-txt-primary font-semibold tabular-nums">{btcPrice}</span>
              {btcChange !== undefined && (
                <span className={`font-semibold tabular-nums ${btcChange >= 0 ? "text-buy" : "text-sell"}`}>
                  {btcChange >= 0 ? "+" : ""}{btcChange.toFixed(2)}%
                </span>
              )}
            </div>
          )}
          {ethPrice && (
            <div className="flex items-center gap-1.5">
              <span className="text-txt-faint">ETH</span>
              <span className="text-txt-primary font-semibold tabular-nums">{ethPrice}</span>
              {ethChange !== undefined && (
                <span className={`font-semibold tabular-nums ${ethChange >= 0 ? "text-buy" : "text-sell"}`}>
                  {ethChange >= 0 ? "+" : ""}{ethChange.toFixed(2)}%
                </span>
              )}
            </div>
          )}
          {tickerCount !== undefined && tickerCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-txt-faint">Pairs</span>
              <span className="text-txt-secondary font-semibold">{tickerCount}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-txt-faint">{timeStr}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          </div>
        </div>

        {/* Right: wallet */}
        <div className="flex items-center gap-2">
          <div className="md:hidden flex items-center gap-1">
            <StatusDot status={dotStatus} pulse size="sm" />
          </div>
          <WalletButton />
        </div>
      </header>
    </div>
  );
}

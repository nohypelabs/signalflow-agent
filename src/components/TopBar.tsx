"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import WalletButton from "./WalletButton";
import StatusDot from "@/components/ui/StatusDot";
import MarketTickerTape from "./MarketTickerTape";
import { useFavoriteTickers } from "@/lib/hooks/useFavoriteTickers";
import {
  ActivityIcon,
  ChartIcon,
  ChevronDownIcon,
  DataSourceIcon,
  DocsIcon,
  HistoryIcon,
  HomeIcon,
  PerformanceIcon,
  SettingsIcon,
  SignalIcon,
  StrategyIcon,
  TradeIcon,
} from "@/components/ui/icons";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  btcPrice?: string;
  btcChange?: number;
  tickerMap?: Map<string, SoDEXTicker>;
}

const navigation = {
  overview: [
    { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
    { href: "/signals", label: "Signals", Icon: SignalIcon },
    { href: "/signal-history", label: "Signal History", Icon: HistoryIcon },
    { href: "/performance", label: "Performance", Icon: PerformanceIcon },
  ],
  trading: [
    { href: "/trading", label: "Trading", Icon: TradeIcon },
    { href: "/portfolio", label: "Portfolio", Icon: ChartIcon },
    { href: "/trade-history", label: "Trade History", Icon: HistoryIcon },
    { href: "/strategy-config", label: "Strategy Config", Icon: StrategyIcon },
  ],
  system: [
    { href: "/data-sources", label: "Data Sources", Icon: DataSourceIcon },
    { href: "/settings", label: "Settings", Icon: SettingsIcon },
    { href: "/docs", label: "Docs", Icon: DocsIcon },
  ],
};

type MenuKey = keyof typeof navigation;

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  btcPrice,
  btcChange,
  tickerMap,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const { isFavorite, toggleFavorite } = useFavoriteTickers(tickerMap);

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

  useEffect(() => {
    Object.values(navigation).flat().forEach((item) => router.prefetch(item.href));
  }, [router]);

  const navigate = (href: string) => {
    router.push(href);
    setOpenMenu(null);
  };

  const menuButton = (key: MenuKey, label: string, align: "left" | "right" = "left") => {
    const active = navigation[key].some((item) => pathname === item.href);
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === key ? null : key)}
          className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold transition-colors ${
            active
              ? "border-accent/35 bg-accent/10 text-txt-primary"
              : "border-border-default bg-elevated/35 text-txt-secondary hover:text-txt-primary"
          }`}
        >
          {label}
          <ChevronDownIcon size={12} />
        </button>
        {openMenu === key && (
          <div className={`absolute top-9 z-50 w-56 rounded-lg border border-border-default bg-surface p-2 shadow-2xl shadow-black/40 ${align === "right" ? "right-0" : "left-0"}`}>
            {navigation[key].map(({ href, label: itemLabel, Icon }) => {
              const itemActive = pathname === href;
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => navigate(href)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-semibold transition-colors ${
                    itemActive
                      ? "bg-accent/10 text-txt-primary"
                      : "text-txt-secondary hover:bg-elevated hover:text-txt-primary"
                  }`}
                >
                  <Icon size={14} className={itemActive ? "text-accent" : "text-txt-secondary"} />
                  {itemLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
      <header className="relative flex items-center justify-between gap-3 px-3 md:px-4 h-12 bg-surface border-b border-border-default">
        {/* Subtle accent glow at bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        {/* Left: brand + primary navigation */}
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ActivityIcon size={12} />
            </div>
            <span className="font-bold text-[13px] text-txt-primary tracking-tight">SignalFlow</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            {menuButton("overview", "Overview")}
            {menuButton("trading", "Trading")}
          </div>

          <div className="hidden lg:flex items-center gap-1 ml-1">
            <StatusDot status={dotStatus} pulse size="sm" />
            <span className="text-[10px] font-semibold text-txt-secondary">{statusLabel}</span>
          </div>
        </div>

        {/* Right: pair summary + system modal + wallet */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden md:flex items-center gap-3 rounded-md border border-border-default bg-inset/70 px-2.5 py-1 font-mono text-[11px]">
            {btcPrice && (
              <div className="flex items-center gap-1.5">
                <span className="text-txt-secondary">BTC</span>
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
                <span className="text-txt-secondary">ETH</span>
                <span className="text-txt-primary font-semibold tabular-nums">{ethPrice}</span>
                {ethChange !== undefined && (
                  <span className={`font-semibold tabular-nums ${ethChange >= 0 ? "text-buy" : "text-sell"}`}>
                    {ethChange >= 0 ? "+" : ""}{ethChange.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-1">
            <StatusDot status={dotStatus} pulse size="sm" />
          </div>
          {menuButton("system", "Settings", "right")}
          {tickerCount !== undefined && tickerCount > 0 && (
            <span className="hidden xl:inline-flex text-[10px] font-mono font-semibold text-txt-secondary">
              {tickerCount} PAIRS
            </span>
          )}
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-txt-secondary">
            {timeStr}
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          </span>
          <WalletButton />
        </div>
      </header>
    </div>
  );
}

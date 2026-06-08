"use client";

import TopBar from "@/components/TopBar";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface HeaderProps {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  tickerMap?: Map<string, SoDEXTicker>;
  onTickerClick?: (symbol: string) => void;
  sidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
  onMenuClick?: () => void;
}

export default function Header(props: HeaderProps) {
  return <TopBar {...props} />;
}

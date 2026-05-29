"use client";

import TopBar from "@/components/TopBar";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface HeaderProps {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  tickerMap?: Map<string, SoDEXTicker>;
  selectedPair?: string;
  onTickerClick?: (symbol: string) => void;
}

export default function Header(props: HeaderProps) {
  return <TopBar {...props} />;
}

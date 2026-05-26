"use client";

import TopBar from "@/components/TopBar";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface HeaderProps {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  onMenuToggle?: () => void;
  btcPrice?: string;
  btcChange?: number;
  tickerMap?: Map<string, SoDEXTicker>;
}

export default function Header(props: HeaderProps) {
  return <TopBar {...props} />;
}

"use client";

import TopBar from "@/components/TopBar";

interface HeaderProps {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  onMenuToggle?: () => void;
  btcPrice?: string;
  btcChange?: number;
}

export default function Header(props: HeaderProps) {
  return <TopBar {...props} />;
}

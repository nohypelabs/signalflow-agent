"use client";

import type { TradingType, TradingTypeConfig } from "@/lib/types/trading-type";
import { TRADING_TYPES } from "@/lib/types/trading-type";

interface Props {
  type: TradingType;
  size?: number;
  className?: string;
}

export default function TradingTypeIcon({ type, size = 14, className = "" }: Props) {
  const config: TradingTypeConfig = TRADING_TYPES[type];
  const Icon = config.icon;
  return <Icon size={size} className={className} style={{ color: config.color }} />;
}

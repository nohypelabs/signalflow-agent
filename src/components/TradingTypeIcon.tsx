"use client";

import type { TradingType } from "@/lib/types/trading-type";
import { BarChartIcon, BriefcaseIcon, TrendUpIcon, ZapIcon } from "@/components/ui/icons";

interface Props {
  type: TradingType;
  size?: number;
  className?: string;
}

export default function TradingTypeIcon({ type, size = 14, className = "" }: Props) {
  if (type === "scalping") return <ZapIcon size={size} className={className} />;
  if (type === "intraday") return <BarChartIcon size={size} className={className} />;
  if (type === "swing") return <TrendUpIcon size={size} className={className} />;
  return <BriefcaseIcon size={size} className={className} />;
}

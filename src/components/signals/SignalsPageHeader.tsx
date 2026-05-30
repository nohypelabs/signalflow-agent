"use client";

import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import TypeSwitcher from "@/components/TypeSwitcher";
import type { TradingType } from "@/lib/types/trading-type";

interface Props {
  signalCount: number;
  timestamp?: string;
  currentType: TradingType | null;
  onTypeChange: (type: TradingType | null) => void;
  needsAttention?: boolean;
}

export default function SignalsPageHeader({ signalCount, timestamp, currentType, onTypeChange, needsAttention = false }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border-default mb-5">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-txt-primary tracking-tight">Live Signals</h2>
        <div className="flex items-center gap-1.5">
          <StatusDot status="live" size="sm" pulse />
          <span className="text-[10px] text-buy font-semibold uppercase tracking-wider">Live</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {needsAttention && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-hold">
            Try another signal type
          </span>
        )}
        <TypeSwitcher currentType={currentType} onTypeChange={onTypeChange} attention={needsAttention} />
        <Badge variant="accent" size="md">
          {signalCount} {signalCount === 1 ? "signal" : "signals"}
        </Badge>
        {timestamp && (
          <span className="text-[11px] text-txt-muted font-mono">{timestamp}</span>
        )}
      </div>
    </div>
  );
}

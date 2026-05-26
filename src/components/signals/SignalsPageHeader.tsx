"use client";

import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";

interface Props {
  signalCount: number;
  timestamp?: string;
}

export default function SignalsPageHeader({ signalCount, timestamp }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border-default mb-5">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-txt-primary tracking-tight">Live Signals</h2>
        <div className="flex items-center gap-1.5">
          <StatusDot status="live" size="sm" pulse />
          <span className="text-[10px] text-buy font-semibold uppercase tracking-wider">Live</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
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

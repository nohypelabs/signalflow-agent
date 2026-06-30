"use client";

import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";

interface Props {
  signalCount: number;
  timestamp?: string;
}

export default function SignalsPageHeader({ signalCount, timestamp }: Props) {
  return (
    <div className="signals-glass-card flex flex-col justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Intraday Signals</h2>
          <div className="flex items-center gap-1.5">
            <StatusDot status="live" size="sm" pulse />
            <span className="text-[10px] text-buy font-semibold uppercase tracking-wider">Live</span>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-txt-secondary">
          SignalFlow is currently tuned for same-day crypto setups. Use these signals for entries and exits within roughly
          {" "}1 to 8 hours, and avoid carrying positions into a multi-day hold unless the setup is revalidated.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="glass-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
          Intraday Only
        </span>
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

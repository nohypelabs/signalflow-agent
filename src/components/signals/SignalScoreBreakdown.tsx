"use client";

import type { Signal, SignalDimensions } from "@/lib/types/signal";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import ProgressBar from "@/components/ui/ProgressBar";

interface DimensionDef {
  key: keyof SignalDimensions;
  label: string;
  color: string;
}

const dimensions: DimensionDef[] = [
  { key: "etfFlow", label: "ETF Flow", color: "var(--dim-etf)" },
  { key: "sentiment", label: "Sentiment", color: "var(--dim-sentiment)" },
  { key: "macro", label: "Macro", color: "var(--dim-macro)" },
  { key: "momentum", label: "Momentum", color: "var(--dim-momentum)" },
  { key: "treasury", label: "Treasury", color: "var(--dim-treasury)" },
];

interface Props {
  dims: SignalDimensions;
  dimDetails?: Signal["dimensionDetails"];
  liveDims?: LiveSignalDimensions | null;
  compact?: boolean;
}

export default function SignalScoreBreakdown({ dims, dimDetails, liveDims, compact = false }: Props) {
  return (
    <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
      {dimensions.map((d) => {
        const liveScore = liveDims?.[d.key]?.score;
        const liveDetail = liveDims?.[d.key]?.detail;
        const score = Math.round(liveScore ?? dims[d.key]);
        const detail = liveDetail || dimDetails?.[d.key]?.detail;

        return (
          <div key={d.key}>
            <ProgressBar
              value={score}
              color={d.color}
              height={compact ? "sm" : "sm"}
              label={d.label}
              showValue
            />
            {!compact && detail && (
              <p className="text-[9px] text-txt-dim mt-0.5 ml-[4.5rem] truncate" title={detail}>
                {detail}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { dimensions as dimensionDefs };

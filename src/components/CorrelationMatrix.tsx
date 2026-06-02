"use client";

import { useState } from "react";
import { useCorrelation } from "@/lib/hooks/useCorrelation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { Grid3x3 } from "lucide-react";

const DEFAULT_SYMBOLS = ["vBTC_vUSDC", "vETH_vUSDC", "vSOL_vUSDC", "vBNB_vUSDC", "vXRP_vUSDC", "vDOGE_vUSDC"];
const TIMEFRAMES = [
  { value: "1d", label: "7D" },
  { value: "1h", label: "24H" },
];

function correlationColor(v: number): string {
  if (v >= 0.7) return "var(--color-buy)";
  if (v >= 0.3) return "color-mix(in srgb, var(--color-buy) 40%, transparent)";
  if (v >= -0.3) return "var(--color-bg-inset)";
  if (v >= -0.7) return "color-mix(in srgb, var(--color-sell) 40%, transparent)";
  return "var(--color-sell)";
}

function cleanSymbol(s: string): string {
  return s.replace(/^v/, "").replace(/_vUSDC$/, "");
}

export default function CorrelationMatrix() {
  const [timeframe, setTimeframe] = useState("1d");
  const { data, loading, error } = useCorrelation(DEFAULT_SYMBOLS, timeframe, 30);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3x3 size={14} className="text-accent" />
            <h3 className="text-sm font-semibold text-txt-primary">Correlation Matrix</h3>
          </div>
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  timeframe === tf.value
                    ? "bg-accent-muted text-accent border border-accent-dim"
                    : "bg-elevated/30 text-txt-secondary border border-border-default hover:border-border-muted"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="table-row" className="h-10" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-sell">{error}</p>
        ) : !data ? (
          <p className="text-xs text-txt-muted text-center">No data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-[11px] text-txt-secondary uppercase tracking-wider p-1 text-left" />
                  {data.symbols.map((s) => (
                    <th key={s} className="text-[11px] text-txt-secondary font-mono font-semibold p-1 text-center min-w-[48px]">
                      {cleanSymbol(s)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.matrix.map((row, i) => (
                  <tr key={data.symbols[i]}>
                    <td className="text-[11px] text-txt-secondary font-mono p-1 text-left font-semibold">
                      {cleanSymbol(data.symbols[i])}
                    </td>
                    {row.map((v, j) => (
                      <td key={j} className="p-0.5">
                        <div
                          className="w-full aspect-square rounded-sm flex items-center justify-center"
                          style={{ backgroundColor: correlationColor(v) }}
                          title={`${cleanSymbol(data.symbols[i])} vs ${cleanSymbol(data.symbols[j])}: ${v.toFixed(2)}`}
                        >
                          <span className={`text-[10px] font-mono font-bold ${Math.abs(v) >= 0.3 ? "text-white" : "text-txt-secondary"}`}>
                            {v.toFixed(2)}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-sell" />
                <span className="text-[8px] text-txt-faint">-1.0</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-border-default" />
                <span className="text-[8px] text-txt-faint">0</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-buy" />
                <span className="text-[8px] text-txt-faint">+1.0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

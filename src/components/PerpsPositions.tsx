"use client";

import { useSodexPerpsPositions } from "@/lib/hooks/useSodexPerpsPositions";
import type { SoDEXPerpsPosition } from "@/lib/sodex-perps";

function firstValue(position: SoDEXPerpsPosition, keys: string[], fallback = "—"): string {
  for (const key of keys) {
    const value = position[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return fallback;
}

function formatNumber(value: string, prefix = ""): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return `${prefix}${number.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}

export default function PerpsPositions({ address }: { address?: string }) {
  const { data, positions, loading, error } = useSodexPerpsPositions(address);

  if (!address) {
    return <div className="flex h-full items-center justify-center text-xs text-txt-dim">Connect wallet to read SoDEX perps positions</div>;
  }
  if (loading && !data) {
    return <div className="flex h-full items-center justify-center text-xs text-txt-dim">Loading SoDEX perps positions…</div>;
  }
  if (error && !data) {
    return <div className="flex h-full items-center justify-center text-xs text-sell">{error}</div>;
  }

  return (
    <div className="min-w-full">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <span className="text-[10px] font-semibold text-txt-secondary">SoDEX Perps positions</span>
        <span className="rounded border border-hold/25 bg-hold/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-hold">Read-only</span>
      </div>
      {positions.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-txt-muted">No open SoDEX perps positions</div>
      ) : (
        <>
          <div className="grid grid-cols-[1.2fr_.7fr_1fr_1fr_1fr_.7fr] gap-2 border-b border-border-default px-3 py-1.5 text-[8px] uppercase tracking-wider text-txt-faint">
            <span>Market</span><span>Side</span><span className="text-right">Size</span><span className="text-right">Entry</span><span className="text-right">uPnL</span><span className="text-right">Leverage</span>
          </div>
          <div className="divide-y divide-border-default">
            {positions.map((position, index) => {
              const side = firstValue(position, ["side", "positionSide"], "—");
              const pnl = firstValue(position, ["unrealizedPnl", "unrealizedPnL"], "0");
              const pnlNumber = Number(pnl);
              return (
                <div key={`${firstValue(position, ["symbol"], "position")}-${index}`} className="grid grid-cols-[1.2fr_.7fr_1fr_1fr_1fr_.7fr] gap-2 px-3 py-2 font-mono text-[10px]">
                  <span className="font-semibold text-txt-primary">{firstValue(position, ["symbol"])}</span>
                  <span className={side.toUpperCase().includes("LONG") || side.toUpperCase().includes("BUY") ? "text-buy" : "text-sell"}>{side}</span>
                  <span className="text-right text-txt-secondary">{formatNumber(firstValue(position, ["quantity", "size", "positionAmt"]))}</span>
                  <span className="text-right text-txt-secondary">{formatNumber(firstValue(position, ["entryPrice"]), "$")}</span>
                  <span className={`text-right ${pnlNumber > 0 ? "text-buy" : pnlNumber < 0 ? "text-sell" : "text-txt-secondary"}`}>{formatNumber(pnl, "$")}</span>
                  <span className="text-right text-hold">{firstValue(position, ["leverage"])}x</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

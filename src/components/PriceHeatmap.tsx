"use client";

import { useMemo } from "react";
import { useScreener } from "@/lib/hooks/useScreener";
import type { ScreenerPair } from "@/lib/api/screener";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { TrendingUp } from "lucide-react";

function fmtPrice(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

/** Map 24h change to a background color with opacity scaled by magnitude */
function heatmapBg(change: number): string {
  const abs = Math.min(Math.abs(change), 15); // cap at 15% for color intensity
  const intensity = 0.15 + (abs / 15) * 0.55; // 15%–70% opacity
  if (change >= 0) {
    return `color-mix(in srgb, var(--color-buy) ${Math.round(intensity * 100)}%, var(--color-bg-inset))`;
  }
  return `color-mix(in srgb, var(--color-sell) ${Math.round(intensity * 100)}%, var(--color-bg-inset))`;
}

/** Simple squarified treemap layout */
function treemapLayout(items: Array<ScreenerPair & { sizeProxy: number }>, width: number, height: number) {
  if (items.length === 0 || width <= 0 || height <= 0) return [];

  const totalMcap = items.reduce((s, p) => s + Math.max(p.sizeProxy, 1), 0);
  const rects: Array<{ pair: ScreenerPair; x: number; y: number; w: number; h: number }> = [];

  // Sort by sizeProxy descending for better layout
  const sorted = [...items].sort((a, b) => b.sizeProxy - a.sizeProxy);

  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const rowItems: ScreenerPair[] = [];
  let rowArea = 0;

  const flushRow = () => {
    if (rowItems.length === 0) return;
    const rowWidth = width - x;
    if (rowWidth <= 0) return;
    let cx = x;
    for (const item of rowItems) {
      const share = Math.max(item.marketcap, 1) / rowArea;
      const w = rowWidth * share;
      rects.push({ pair: item, x: cx, y, w, h: rowHeight });
      cx += w;
    }
    y += rowHeight;
    x = 0;
    rowItems.length = 0;
    rowArea = 0;
  };

  for (const item of sorted) {
    const area = (Math.max(item.sizeProxy, 1) / totalMcap) * width * height;
    const remainingHeight = height - y;
    if (remainingHeight <= 0) break;

    // Estimate row dimensions
    const testRowArea = rowArea + area;
    const testRowWidth = width;
    const testRowHeight = testRowArea / testRowWidth;

    // Check if adding this item would make the row too tall relative to remaining space
    if (rowItems.length > 0 && testRowHeight > remainingHeight * 0.6) {
      flushRow();
    }

    rowItems.push(item);
    rowArea += area;
    rowHeight = Math.min(rowArea / width, remainingHeight);
  }
  flushRow();

  return rects;
}

export default function PriceHeatmap() {
  const { data, loading, error } = useScreener();

  // Filter to crypto, use marketcap or quoteVolume24h as size proxy
  const pairs = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .filter((p) => p.category === "crypto")
      .map((p) => ({
        ...p,
        sizeProxy: p.marketcap > 0 ? p.marketcap : p.quoteVolume24h * 1000, // rough scale for volume-based sizing
      }))
      .sort((a, b) => b.sizeProxy - a.sizeProxy)
      .slice(0, 20);
  }, [data]);

  const containerWidth = 800;
  const containerHeight = 300;
  const rects = useMemo(() => treemapLayout(pairs, containerWidth, containerHeight), [pairs]);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-accent" />
            <h3 className="text-sm font-semibold text-txt-primary">Price Heatmap</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-buy" />
              <span className="text-[8px] text-txt-faint">Up</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-sell" />
              <span className="text-[8px] text-txt-faint">Down</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="table-row" className="h-16" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-sell">{error}</p>
        ) : pairs.length === 0 ? (
          <p className="text-xs text-txt-muted text-center py-8">No data</p>
        ) : (
          <div
            className="relative w-full overflow-hidden rounded-lg"
            style={{ height: containerHeight }}
          >
            {rects.map(({ pair: p, x, y, w, h }) => {
              const isUp = p.change24h >= 0;
              const showTicker = w > 50;
              const showPrice = w > 70 && h > 40;
              const showChange = w > 60 && h > 50;

              return (
                <div
                  key={p.symbol}
                  className="absolute border border-border-default/30 flex flex-col items-center justify-center overflow-hidden transition-opacity hover:opacity-90 cursor-pointer"
                  style={{
                    left: `${(x / containerWidth) * 100}%`,
                    top: `${(y / containerHeight) * 100}%`,
                    width: `${(w / containerWidth) * 100}%`,
                    height: `${(h / containerHeight) * 100}%`,
                    backgroundColor: heatmapBg(p.change24h),
                  }}
                  title={`${p.displayName} — ${fmtPrice(p.price)} — ${isUp ? "+" : ""}${p.change24h.toFixed(2)}%`}
                >
                  {showTicker && (
                    <span className="font-bold text-txt-primary leading-none" style={{ fontSize: w > 120 ? 13 : 10 }}>
                      {p.baseCoin}
                    </span>
                  )}
                  {showPrice && (
                    <span className="text-txt-secondary font-mono mt-0.5" style={{ fontSize: 9 }}>
                      {fmtPrice(p.price)}
                    </span>
                  )}
                  {showChange && (
                    <span className={`font-mono font-semibold ${isUp ? "text-buy" : "text-sell"}`} style={{ fontSize: 10 }}>
                      {isUp ? "+" : ""}{p.change24h.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

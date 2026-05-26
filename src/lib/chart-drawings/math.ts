import type { Point } from "./types";

/* ── Price formatting with asset precision ── */

export function fmtDrawingPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

/* ── Percentage change ── */

export function priceChangePercent(start: number, end: number): number {
  if (start === 0) return 0;
  return ((end - start) / start) * 100;
}

/* ── Price difference ── */

export function priceDifference(start: number, end: number): number {
  return end - start;
}

/* ── Candle count between two timestamps ── */

export function candleCount(start: number, end: number, intervalMs: number): number {
  if (intervalMs <= 0) return 0;
  return Math.abs(Math.round((end - start) / intervalMs));
}

/* ── Get interval milliseconds from timeframe string ── */

export function timeframeToMs(timeframe: string): number {
  const map: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
  };
  return map[timeframe] ?? 60 * 60 * 1000;
}

/* ── Measure label ── */

export function formatMeasureLabel(start: Point, end: Point, timeframe: string): string {
  const pct = priceChangePercent(start.price, end.price);
  const diff = priceDifference(start.price, end.price);
  const intervalMs = timeframeToMs(timeframe);
  const candles = candleCount(start.time, end.time, intervalMs);

  const sign = pct >= 0 ? "+" : "";
  const pctStr = `${sign}${pct.toFixed(2)}%`;
  const diffStr = `${sign}$${fmtDrawingPrice(Math.abs(diff))}`;
  const candleStr = candles > 0 ? `${candles} candle${candles !== 1 ? "s" : ""}` : "";

  return candleStr ? `${pctStr} · ${diffStr} · ${candleStr}` : `${pctStr} · ${diffStr}`;
}

/* ── Measure color ── */

export function measureColor(start: number, end: number): string {
  return end >= start ? "#00E5A8" : "#EF4444";
}

/* ── Fibonacci price at level ── */

export function fibPriceAtLevel(high: number, low: number, level: number): number {
  return high - (high - low) * level;
}

/* ── Format fib level label ── */

export function fmtFibLevel(level: number): string {
  if (level === 0 || level === 1) return level.toString();
  return level.toFixed(3);
}

/* ── Generate unique ID ── */

export function generateDrawingId(): string {
  return `draw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

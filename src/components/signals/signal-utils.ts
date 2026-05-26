"use client";

/**
 * Format price based on coin type.
 * BTC: no decimals, ETH: 2 decimals, small caps: 4-5 decimals.
 */
export function formatPrice(price: number, coin: string): string {
  const upper = coin.toUpperCase();
  if (upper === "BTC") return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (upper === "ETH") return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 100) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
}

/**
 * Format percent with sign.
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

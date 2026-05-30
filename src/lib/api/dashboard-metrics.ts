import type { SoDEXTicker } from "../types/trade";
import type { Signal } from "../types/signal";

/* ──────────────────────────────────────────────
   Validation Helpers
   ────────────────────────────────────────────── */

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,+%]/g, "").trim();
    if (cleaned === "") return null;
    // Handle "1.5M", "2.3B", "500K"
    const suffixMatch = cleaned.match(/^(-?[\d.]+)\s*([KMBkmb])$/);
    if (suffixMatch) {
      const num = parseFloat(suffixMatch[1]);
      if (!Number.isFinite(num)) return null;
      const mult = suffixMatch[2].toUpperCase();
      if (mult === "K") return num * 1e3;
      if (mult === "M") return num * 1e6;
      if (mult === "B") return num * 1e9;
    }
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function isFresh(lastUpdated: number | null | undefined, maxAgeMs = 60_000): boolean {
  if (!lastUpdated) return false;
  return Date.now() - lastUpdated < maxAgeMs;
}

/* ──────────────────────────────────────────────
   Ticker Helpers
   ────────────────────────────────────────────── */

export function isValidTicker(t: SoDEXTicker): boolean {
  const price = parseFloat(t.lastPx);
  return !isNaN(price) && price > 0 && !!t.symbol;
}

export function getTickerChangePct(t: SoDEXTicker): number | null {
  const v = t.changePct;
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

export function symbolToBase(symbol: string): string {
  return symbol.replace(/^v/, "").replace(/_vUSDC$/, "");
}

/* ──────────────────────────────────────────────
   KPI Computations
   ────────────────────────────────────────────── */

export interface KPIResult<T> {
  value: T;
  source: string;
  computedAt: number;
  rawCount: number;
}

/** Sum 24h quote volume across all valid tickers */
export function compute24hVolume(tickers: SoDEXTicker[] | null): KPIResult<number> {
  const now = Date.now();
  if (!tickers || tickers.length === 0) {
    return { value: 0, source: "No data", computedAt: now, rawCount: 0 };
  }
  const valid = tickers.filter(isValidTicker);
  const total = valid.reduce((sum, t) => {
    const vol = parseFloat(t.quoteVolume || "0");
    return sum + (Number.isFinite(vol) && vol > 0 ? vol : 0);
  }, 0);
  return {
    value: total,
    source: "SoDEX live",
    computedAt: now,
    rawCount: valid.length,
  };
}

/** Count valid active pairs */
export function computeActivePairs(tickers: SoDEXTicker[] | null): KPIResult<number> {
  const now = Date.now();
  if (!tickers || tickers.length === 0) {
    return { value: 0, source: "No data", computedAt: now, rawCount: 0 };
  }
  const count = tickers.filter(isValidTicker).length;
  return {
    value: count,
    source: "SoDEX live",
    computedAt: now,
    rawCount: tickers.length,
  };
}

export interface SignalBreakdown {
  total: number;
  buy: number;
  hold: number;
  sell: number;
  highConfidence: number;
  avgConfidence: number;
}

/** Count active signals and compute breakdown */
export function computeSignalBreakdown(signals: Signal[] | null | undefined): KPIResult<SignalBreakdown> {
  const now = Date.now();
  if (!signals || signals.length === 0) {
    return {
      value: { total: 0, buy: 0, hold: 0, sell: 0, highConfidence: 0, avgConfidence: 0 },
      source: "Signal Engine",
      computedAt: now,
      rawCount: 0,
    };
  }

  // Active = signals with valid action and confidence
  const active = signals.filter(
    (s) => s.action && typeof s.confidence === "number" && Number.isFinite(s.confidence),
  );

  const buy = active.filter((s) => s.action === "LONG").length;
  const hold = active.filter((s) => s.action === "HOLD").length;
  const sell = active.filter((s) => s.action === "SHORT").length;
  const highConfidence = active.filter((s) => s.confidence >= 70).length;
  const avgConfidence =
    active.length > 0
      ? active.reduce((sum, s) => sum + s.confidence, 0) / active.length
      : 0;

  return {
    value: { total: active.length, buy, hold, sell, highConfidence, avgConfidence },
    source: "Signal Engine",
    computedAt: now,
    rawCount: signals.length,
  };
}

export interface TopGainerResult {
  pair: string;
  base: string;
  price: number;
  change24h: number;
  volume24h: number;
}

/** Find top positive 24h mover */
export function computeTopGainer(tickers: SoDEXTicker[] | null): KPIResult<TopGainerResult | null> {
  const now = Date.now();
  if (!tickers || tickers.length === 0) {
    return { value: null, source: "No data", computedAt: now, rawCount: 0 };
  }

  const valid = tickers
    .filter(isValidTicker)
    .map((t) => ({
      t,
      change: getTickerChangePct(t),
      price: parseFloat(t.lastPx),
      volume: parseFloat(t.quoteVolume || "0"),
    }))
    .filter((x) => x.change !== null && x.change > 0);

  if (valid.length === 0) {
    return { value: null, source: "SoDEX live", computedAt: now, rawCount: tickers.length };
  }

  // Sort by change descending
  valid.sort((a, b) => (b.change as number) - (a.change as number));
  const best = valid[0];

  return {
    value: {
      pair: `${symbolToBase(best.t.symbol)}/USDC`,
      base: symbolToBase(best.t.symbol),
      price: best.price,
      change24h: best.change as number,
      volume24h: best.volume,
    },
    source: "SoDEX live",
    computedAt: now,
    rawCount: tickers.length,
  };
}

/* ──────────────────────────────────────────────
   Top Loser
   ────────────────────────────────────────────── */

/** Find top negative 24h mover */
export function computeTopLoser(tickers: SoDEXTicker[] | null): KPIResult<TopGainerResult | null> {
  const now = Date.now();
  if (!tickers || tickers.length === 0) {
    return { value: null, source: "No data", computedAt: now, rawCount: 0 };
  }

  const valid = tickers
    .filter(isValidTicker)
    .map((t) => ({
      t,
      change: getTickerChangePct(t),
      price: parseFloat(t.lastPx),
      volume: parseFloat(t.quoteVolume || "0"),
    }))
    .filter((x) => x.change !== null && x.change < 0);

  if (valid.length === 0) {
    return { value: null, source: "SoDEX live", computedAt: now, rawCount: tickers.length };
  }

  valid.sort((a, b) => (a.change as number) - (b.change as number));
  const worst = valid[0];

  return {
    value: {
      pair: `${symbolToBase(worst.t.symbol)}/USDC`,
      base: symbolToBase(worst.t.symbol),
      price: worst.price,
      change24h: worst.change as number,
      volume24h: worst.volume,
    },
    source: "SoDEX live",
    computedAt: now,
    rawCount: tickers.length,
  };
}

/* ──────────────────────────────────────────────
   Debug Logging (dev only)
   ────────────────────────────────────────────── */

export function logKPI(name: string, result: KPIResult<unknown>, extra?: string) {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const age = Date.now() - result.computedAt;
    console.log(
      `[KPI] ${name}: source=${result.source}, rawCount=${result.rawCount}, value=${JSON.stringify(result.value)}, computed ${age}ms ago${extra ? `, ${extra}` : ""}`,
    );
  }
}

/* ──────────────────────────────────────────────
   Inline Validation Examples (test cases)
   ────────────────────────────────────────────── */

/*
  parseNumber tests:
    parseNumber("+1.25%")   => 1.25
    parseNumber("-0.8%")    => -0.8
    parseNumber("$1,500,000") => 1500000
    parseNumber("1.5M")     => 1500000
    parseNumber("2.3B")     => 2300000000
    parseNumber("500K")     => 500000
    parseNumber(null)       => null
    parseNumber(undefined)  => null
    parseNumber(NaN)        => null
    parseNumber("")         => null

  formatUsd tests:
    formatUsd(1500)         => "$1.5K"
    formatUsd(1500000)      => "$1.5M"
    formatUsd(1500000000)   => "$1.5B"
    formatUsd(null)         => "—"
    formatUsd(NaN)          => "—"

  formatPercent tests:
    formatPercent(1.25)     => "+1.25%"
    formatPercent(-0.8)     => "-0.80%"
    formatPercent(0)        => "+0.00%"
    formatPercent(null)     => "—"

  getTopGainer tests:
    []                      => null
    all negative            => null
    [{changePct: -5}]       => null
    [{changePct: 1.6}]      => { pair: "SOL/USDC", change24h: 1.6 }
    mixed                   => highest positive

  computeSignalBreakdown tests:
    []                      => { total: 0, buy: 0, hold: 0, sell: 0 }
    [BUY, BUY, HOLD, SELL]  => { total: 4, buy: 2, hold: 1, sell: 1 }
*/

import { getPerpsTickers, perpsBaseSymbol } from "./sodex-perps";

export interface VenueComparisonData {
  source: "Hyperliquid";
  fundingRate: number;
  openInterest: number;
  markPrice: number;
}

export interface FundingRateData {
  symbol: string;
  marketSymbol: string;
  source: "SoDEX Perps";
  fundingRate: number;
  openInterest: number;
  markPrice: number;
  indexPrice: number;
  nextFundingTime: number;
  comparison?: VenueComparisonData;
}

let cachedData: Map<string, FundingRateData> = new Map();
let lastFetchTime = 0;
let cachedComparison: Map<string, VenueComparisonData> = new Map();
let comparisonFetchTime = 0;
const CACHE_TTL = 60_000;

async function fetchHyperliquidComparison(): Promise<Map<string, VenueComparisonData>> {
  if (cachedComparison.size > 0 && Date.now() - comparisonFetchTime < CACHE_TTL) {
    return cachedComparison;
  }

  try {
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Hyperliquid ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2) throw new Error("Invalid response");

    const universe = data[0]?.universe ?? [];
    const contexts = data[1] ?? [];
    const comparison = new Map<string, VenueComparisonData>();
    for (let i = 0; i < universe.length; i++) {
      const asset = universe[i] as { name?: string } | undefined;
      const ctx = contexts[i] as {
        funding?: string;
        openInterest?: string;
        markPx?: string;
      } | undefined;
      if (!asset || !ctx) continue;
      const symbol = asset.name?.toUpperCase();
      const markPrice = Number(ctx.markPx ?? 0);
      if (!symbol || !Number.isFinite(markPrice) || markPrice <= 0) continue;
      comparison.set(symbol, {
        source: "Hyperliquid",
        fundingRate: Number(ctx.funding ?? 0),
        openInterest: Number(ctx.openInterest ?? 0),
        markPrice,
      });
    }
    cachedComparison = comparison;
    comparisonFetchTime = Date.now();
  } catch (error) {
    console.error("Failed to fetch Hyperliquid comparison data:", error);
  }
  return cachedComparison;
}

export async function fetchFundingRates(): Promise<Map<string, FundingRateData>> {
  if (cachedData.size > 0 && Date.now() - lastFetchTime < CACHE_TTL) return cachedData;

  try {
    const [tickers, comparisons] = await Promise.all([
      getPerpsTickers(),
      fetchHyperliquidComparison(),
    ]);
    const next = new Map<string, FundingRateData>();

    for (const ticker of tickers) {
      const symbol = perpsBaseSymbol(ticker.symbol);
      const markPrice = Number(ticker.markPrice);
      if (!Number.isFinite(markPrice) || markPrice <= 0) continue;
      next.set(symbol, {
        symbol,
        marketSymbol: ticker.symbol,
        source: "SoDEX Perps",
        fundingRate: Number(ticker.fundingRate ?? 0),
        openInterest: Number(ticker.openInterest ?? 0),
        markPrice,
        indexPrice: Number(ticker.indexPrice ?? 0),
        nextFundingTime: ticker.nextFundingTime,
        comparison: comparisons.get(symbol),
      });
    }

    cachedData = next;
    lastFetchTime = Date.now();
  } catch (error) {
    console.error("Failed to fetch SoDEX perps market data:", error);
  }
  return cachedData;
}

export async function getFundingRate(symbol: string): Promise<FundingRateData | null> {
  const rates = await fetchFundingRates();
  const base = perpsBaseSymbol(symbol);
  return rates.get(base) ?? null;
}

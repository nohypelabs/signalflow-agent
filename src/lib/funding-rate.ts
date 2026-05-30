// Funding rate data from public perpetual DEX API
// Used as reference for market sentiment

export interface FundingRateData {
  symbol: string;
  fundingRate: number; // Per 8h (e.g., 0.0000125 = 0.00125%)
  openInterest: number;
  markPrice: number;
}

// Map SoDEX symbols to Hyperliquid symbols
const SYMBOL_MAP: Record<string, string> = {
  "BTC": "BTC",
  "ETH": "ETH",
  "SOL": "SOL",
  "AVAX": "AVAX",
  "LINK": "LINK",
  "DOGE": "DOGE",
  "ADA": "ADA",
  "XRP": "XRP",
  "BNB": "BNB",
  "MATIC": "MATIC",
  "DOT": "DOT",
  "LTC": "LTC",
  "UNI": "UNI",
  "ATOM": "ATOM",
  "FIL": "FIL",
  "APT": "APT",
  "NEAR": "NEAR",
  "ARB": "ARB",
  "OP": "OP",
  "SUI": "SUI",
  "SEI": "SEI",
  "TIA": "TIA",
  "WLD": "WLD",
  "PEPE": "PEPE",
  "SHIB": "SHIB",
};

// Cache in memory
let cachedData: Map<string, FundingRateData> = new Map();
let lastFetchTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function fetchFundingRates(): Promise<Map<string, FundingRateData>> {
  // Return cached if fresh
  if (cachedData.size > 0 && Date.now() - lastFetchTime < CACHE_TTL) {
    return cachedData;
  }

  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) throw new Error("Invalid response");

    const meta = data[0];
    const ctxs = data[1];
    const universe = meta?.universe || [];

    const newCache = new Map<string, FundingRateData>();

    for (let i = 0; i < universe.length; i++) {
      const asset = universe[i];
      const ctx = ctxs[i];
      if (!asset || !ctx) continue;

      const hlSymbol = asset.name;
      // Find matching SoDEX symbol
      const sodexSymbol = Object.entries(SYMBOL_MAP).find(([, v]) => v === hlSymbol)?.[0];
      if (!sodexSymbol) continue;

      const fundingRate = parseFloat(ctx.funding || "0");
      const openInterest = parseFloat(ctx.openInterest || "0");
      const markPrice = parseFloat(ctx.markPx || "0");

      if (markPrice > 0) {
        newCache.set(sodexSymbol, {
          symbol: sodexSymbol,
          fundingRate,
          openInterest,
          markPrice,
        });
      }
    }

    cachedData = newCache;
    lastFetchTime = Date.now();
    return cachedData;
  } catch (err) {
    console.error("Failed to fetch funding rates:", err);
    // Return stale cache if available
    return cachedData;
  }
}

export async function getFundingRate(symbol: string): Promise<FundingRateData | null> {
  const rates = await fetchFundingRates();
  const base = symbol.replace(/^v/, "").replace(/_vUSDC$/, "").split("/")[0].toUpperCase();
  return rates.get(base) ?? null;
}

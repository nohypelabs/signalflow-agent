import { fetchFundingRates } from "@/lib/funding-rate";
import type { FundingRateData } from "@/lib/funding-rate";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

// Cache in memory (1 minute)
let cachedData: Record<string, FundingRateData> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

function selectSymbol(data: Record<string, FundingRateData>, symbol?: string) {
  if (!symbol) return data;
  return data[symbol] ? { [symbol]: data[symbol] } : {};
}

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase();

  // Return cached if fresh
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return jsonNoCache(selectSymbol(cachedData, symbol));
  }

  try {
    const rates = await fetchFundingRates();
    const data = Object.fromEntries(rates);
    cachedData = data;
    cacheTime = Date.now();
    return jsonNoCache(selectSymbol(data, symbol));
  } catch (err) {
    if (cachedData) return jsonNoCache(selectSymbol(cachedData, symbol));
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Funding rate fetch failed" },
      { status: 502 }
    );
  }
}

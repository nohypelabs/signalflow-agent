import { fetchFundingRates } from "@/lib/funding-rate";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

// Cache in memory (1 minute)
let cachedData: unknown = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function GET() {
  // Return cached if fresh
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return jsonNoCache(cachedData);
  }

  try {
    const rates = await fetchFundingRates();
    const data = Object.fromEntries(rates);
    cachedData = data;
    cacheTime = Date.now();
    return jsonNoCache(data);
  } catch (err) {
    if (cachedData) return jsonNoCache(cachedData);
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Funding rate fetch failed" },
      { status: 502 }
    );
  }
}

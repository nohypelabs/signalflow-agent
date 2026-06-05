/**
 * GET /api/v1/market/klines — OHLCV candlestick data from SoDEX.
 * Query: ?symbol=BTC/USDC&interval=1h&limit=100
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { marketKlinesQuerySchema } from "@/lib/api-v1/zod-schemas";
import { fetchMarketKlines } from "@/lib/api-v1/data-fetcher";
import { pairToSodexSymbol } from "@/lib/pair-map";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = marketKlinesQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "MARKET_KLINES");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("MARKET_KLINES")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  // Convert display pair to SoDEX symbol
  const sodexSymbol = pairToSodexSymbol(parsed.data.symbol) ?? parsed.data.symbol;
  const cacheKey = buildCacheKey("market-klines", `s=${sodexSymbol}&i=${parsed.data.interval}&l=${parsed.data.limit}`, ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "MARKET_KLINES", Date.now());

  try {
    const data = await fetchMarketKlines(sodexSymbol, parsed.data.interval, parsed.data.limit);
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "MARKET_KLINES");
  } catch (error) {
    console.error("[V1 Market Klines] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

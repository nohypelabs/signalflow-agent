/**
 * GET /api/v1/market/tickers — Live market tickers from SoDEX.
 * Query: ?symbol= (optional filter)
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { marketTickersQuerySchema } from "@/lib/api-v1/zod-schemas";
import { fetchMarketTickers } from "@/lib/api-v1/data-fetcher";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = marketTickersQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "MARKET_TICKERS");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("MARKET_TICKERS")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const cacheKey = buildCacheKey("market-tickers", url.searchParams.toString(), ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "MARKET_TICKERS", Date.now());

  try {
    const data = await fetchMarketTickers(parsed.data.symbol);
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "MARKET_TICKERS");
  } catch (error) {
    console.error("[V1 Market Tickers] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

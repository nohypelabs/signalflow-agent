/**
 * GET /api/v1/market/orderbook — Order book depth from SoDEX.
 * Pro+ only. Query: ?symbol=BTC/USDC&limit=20
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { marketOrderbookQuerySchema } from "@/lib/api-v1/zod-schemas";
import { fetchOrderbook } from "@/lib/api-v1/data-fetcher";
import { pairToSodexSymbol } from "@/lib/pair-map";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = marketOrderbookQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "MARKET_ORDERBOOK");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("MARKET_ORDERBOOK")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const sodexSymbol = pairToSodexSymbol(parsed.data.symbol) ?? parsed.data.symbol;
  const cacheKey = buildCacheKey("orderbook", `s=${sodexSymbol}&l=${parsed.data.limit}`, ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "MARKET_ORDERBOOK", Date.now());

  try {
    const data = await fetchOrderbook(sodexSymbol, parsed.data.limit);
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "MARKET_ORDERBOOK");
  } catch (error) {
    console.error("[V1 Orderbook] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

/**
 * GET /api/v1/backtest — Walk-forward strategy backtesting.
 * Whale only. Query: ?pair=BTC/USDC&type=scalping&resolution=12&step=4
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { backtestQuerySchema } from "@/lib/api-v1/zod-schemas";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = backtestQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "BACKTEST");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // Whale only
  if (!ctx.tierConfig.canBacktest) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const cacheKey = buildCacheKey("backtest", url.searchParams.toString(), ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "BACKTEST", Date.now());

  try {
    // Proxy to existing backtest endpoint
    const upstreamUrl = new URL("/api/backtest", req.url);
    upstreamUrl.searchParams.set("pair", parsed.data.pair);
    if (parsed.data.type) upstreamUrl.searchParams.set("type", parsed.data.type);
    upstreamUrl.searchParams.set("resolution", String(parsed.data.resolution));
    upstreamUrl.searchParams.set("step", String(parsed.data.step));

    const res = await fetch(upstreamUrl.toString());
    if (!res.ok) return v1ApiError("UPSTREAM_ERROR");

    const data = await res.json();
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "BACKTEST");
  } catch (error) {
    console.error("[V1 Backtest] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

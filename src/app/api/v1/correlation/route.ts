/**
 * GET /api/v1/correlation — Price correlation matrix.
 * Pro+ only. Query: ?symbols=BTC,ETH,SOL&limit=100&timeframe=1h
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { correlationQuerySchema } from "@/lib/api-v1/zod-schemas";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = correlationQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "CORRELATION");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("CORRELATION")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const cacheKey = buildCacheKey("correlation", url.searchParams.toString(), ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "CORRELATION", Date.now());

  try {
    // Proxy to existing correlation endpoint
    const upstreamUrl = new URL("/api/correlation", req.url);
    upstreamUrl.searchParams.set("symbols", parsed.data.symbols);
    upstreamUrl.searchParams.set("limit", String(parsed.data.limit));
    upstreamUrl.searchParams.set("timeframe", parsed.data.timeframe);

    const res = await fetch(upstreamUrl.toString());
    if (!res.ok) return v1ApiError("UPSTREAM_ERROR");

    const data = await res.json();
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "CORRELATION");
  } catch (error) {
    console.error("[V1 Correlation] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

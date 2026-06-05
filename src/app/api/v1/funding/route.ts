/**
 * GET /api/v1/funding — Perpetual funding rates.
 * Query: ?symbol= (optional)
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { fundingQuerySchema } from "@/lib/api-v1/zod-schemas";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = fundingQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "FUNDING");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("FUNDING")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const cacheKey = buildCacheKey("funding", parsed.data.symbol ?? "all", ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "FUNDING", Date.now());

  try {
    // Proxy to existing funding endpoint
    const upstreamUrl = new URL("/api/funding", req.url);
    if (parsed.data.symbol) upstreamUrl.searchParams.set("symbol", parsed.data.symbol);

    const res = await fetch(upstreamUrl.toString());
    if (!res.ok) return v1ApiError("UPSTREAM_ERROR");

    const data = await res.json();
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "FUNDING");
  } catch (error) {
    console.error("[V1 Funding] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

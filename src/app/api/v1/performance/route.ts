/**
 * GET /api/v1/performance — Performance metrics for top coins.
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { fetchPerformance } from "@/lib/api-v1/data-fetcher";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const authResult = await authenticateV1Request(req, "PERFORMANCE");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("PERFORMANCE")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const cacheKey = buildCacheKey("performance", "", ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "PERFORMANCE", Date.now());

  try {
    const data = await fetchPerformance();
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "PERFORMANCE");
  } catch (error) {
    console.error("[V1 Performance] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

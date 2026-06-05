/**
 * GET /api/v1/etf-flow — Bitcoin ETF flow data from SoSoValue.
 * Query: ?symbol=BTC&country=US&limit=30
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { etfFlowQuerySchema } from "@/lib/api-v1/zod-schemas";
import { fetchEtfFlow } from "@/lib/api-v1/data-fetcher";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = etfFlowQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "ETF_FLOW");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("ETF_FLOW")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const cacheKey = buildCacheKey("etf-flow", url.searchParams.toString(), ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "ETF_FLOW", Date.now());

  try {
    const data = await fetchEtfFlow(parsed.data.symbol, parsed.data.country, parsed.data.limit);
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "ETF_FLOW");
  } catch (error) {
    console.error("[V1 ETF Flow] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

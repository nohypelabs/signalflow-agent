/**
 * GET /api/v1/news — Crypto news with sentiment analysis from SoSoValue.
 * Query: ?page=1&pageSize=10
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { newsQuerySchema } from "@/lib/api-v1/zod-schemas";
import { fetchNews } from "@/lib/api-v1/data-fetcher";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = newsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "NEWS");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  if (!ctx.tierConfig.allowedEndpoints.has("NEWS")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  // Free tier: page 1 only
  const page = ctx.tier === "FREE" ? 1 : parsed.data.page;
  const cacheKey = buildCacheKey("news", `p=${page}&ps=${parsed.data.pageSize}`, ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) return buildTierResponse(cached, ctx, "NEWS", Date.now());

  try {
    const data = await fetchNews(page, parsed.data.pageSize);
    setCachedResponse(cacheKey, data, ctx.tier);
    return buildTierResponse(data, ctx, "NEWS");
  } catch (error) {
    console.error("[V1 News] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}

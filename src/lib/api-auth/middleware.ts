/**
 * Central authentication & authorization middleware for V1 API.
 * Every v1 route calls authenticateV1Request() as the first step.
 *
 * Flow: Extract credentials → Validate identity → Resolve tier → Check quota → Return AuthContext
 */

import type { ApiEndpoint } from "@prisma/client";
import type { AuthContext, SubscriptionTier } from "@/lib/api-auth/context";
import { TIER_CONFIGS } from "@/lib/api-v1/tier-limits";
import { v1ApiError } from "@/lib/api-v1/errors";
import { extractApiKeyFromRequest, validateApiKey } from "@/lib/api-auth/api-key";
import {
  getSessionFromCookies,
  validateSessionToken,
} from "@/lib/api-auth/session";
import { resolveEffectiveTier } from "@/lib/subscription/tier-resolver";
import { checkAndIncrementUsage } from "@/lib/api-v1/usage-tracker";
import { getPrismaClient } from "@/lib/db/client";

// ─── In-memory rate limiter (per-minute, per-IP+tier) ───

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function checkPerMinuteRate(
  key: string,
  limitPerMin: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count <= limitPerMin) {
    return { allowed: true, retryAfter: 0 };
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return { allowed: false, retryAfter };
}

// ─── Main Auth Middleware ───

/**
 * Authenticate a V1 API request.
 * Returns AuthContext on success, or a Response (error) on failure.
 * Every v1 route should call this as the first line.
 */
export async function authenticateV1Request(
  req: Request,
  endpoint: ApiEndpoint,
): Promise<AuthContext | Response> {
  // Step 1: Extract and validate credentials
  const identity = await resolveIdentity(req);
  if (identity instanceof Response) return identity;

  // Step 2: Resolve subscription tier
  const { tier, gracePeriod } = await resolveEffectiveTier(identity.walletProfileId);
  const tierConfig = TIER_CONFIGS[tier];

  // Step 3: Check per-minute rate limit
  const rateKey = `${identity.normalizedWallet}:${endpoint}`;
  const rateResult = checkPerMinuteRate(rateKey, tierConfig.rateLimitPerMin);
  if (!rateResult.allowed) {
    return v1ApiError("RATE_LIMITED", 429, {
      tier,
      retryAfter: rateResult.retryAfter,
    });
  }

  // Step 4: Check daily quota
  const quota = await checkAndIncrementUsage(
    identity.walletProfileId,
    endpoint,
    tier,
  );
  if (!quota.allowed) {
    // Calculate seconds until midnight UTC for Retry-After
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const retryAfter = Math.ceil((midnight.getTime() - now.getTime()) / 1000);

    return v1ApiError("QUOTA_EXCEEDED", 429, {
      tier,
      quotaUsed: quota.used,
      quotaLimit: quota.limit,
      retryAfter,
    });
  }

  return {
    walletAddress: identity.walletAddress,
    normalizedWallet: identity.normalizedWallet,
    walletProfileId: identity.walletProfileId,
    tier,
    tierConfig,
    authMethod: identity.authMethod,
    apiKeyId: identity.apiKeyId,
    usageToday: quota.used,
    quotaRemaining: quota.limit === Infinity ? -1 : quota.limit - quota.used,
  };
}

// ─── Identity Resolution ───

interface ResolvedIdentity {
  walletAddress: string;
  normalizedWallet: string;
  walletProfileId: string;
  authMethod: "session" | "api_key";
  apiKeyId: string | null;
}

async function resolveIdentity(
  req: Request,
): Promise<ResolvedIdentity | Response> {
  // Try API key first
  const rawKey = extractApiKeyFromRequest(req);
  if (rawKey) {
    const result = await validateApiKey(rawKey);
    if (!result) {
      return v1ApiError("AUTH_INVALID");
    }

    // Look up wallet profile for full address
    const prisma = getPrismaClient();
    const profile = await prisma.walletProfile.findUnique({
      where: { id: result.walletProfileId },
      select: { walletAddress: true },
    });

    if (!profile) {
      return v1ApiError("AUTH_INVALID");
    }

    return {
      walletAddress: profile.walletAddress,
      normalizedWallet: result.normalizedWallet,
      walletProfileId: result.walletProfileId,
      authMethod: "api_key",
      apiKeyId: result.apiKeyId,
    };
  }

  // Try session cookie
  const sessionToken = getSessionFromCookies(req);
  if (sessionToken) {
    const payload = validateSessionToken(sessionToken);
    if (!payload) {
      return v1ApiError("AUTH_INVALID");
    }

    const prisma = getPrismaClient();
    const profile = await prisma.walletProfile.findUnique({
      where: { normalizedWallet: payload.sub },
      select: { id: true, walletAddress: true },
    });

    if (!profile) {
      return v1ApiError("AUTH_INVALID");
    }

    return {
      walletAddress: profile.walletAddress,
      normalizedWallet: payload.sub,
      walletProfileId: profile.id,
      authMethod: "session",
      apiKeyId: null,
    };
  }

  // No credentials found
  return v1ApiError("AUTH_REQUIRED");
}

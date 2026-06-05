/**
 * Auth context types for the V1 paid API.
 * Every v1 route receives an AuthContext after successful authentication.
 */

import type { ApiEndpoint } from "@prisma/client";

export type SubscriptionTier = "FREE" | "PRO" | "WHALE";

export interface TierConfig {
  readonly requestsPerDay: number;
  readonly rateLimitPerMin: number;
  readonly cacheTtlSeconds: number;
  readonly dataFreshness: "delayed_15m" | "realtime";
  readonly maxSignals: number;
  readonly allowedEndpoints: ReadonlySet<ApiEndpoint>;
  readonly canAnalyze: boolean;
  readonly canBacktest: boolean;
  readonly maxApiKeys: number;
}

export interface AuthContext {
  readonly walletAddress: string;
  readonly normalizedWallet: string;
  readonly walletProfileId: string;
  readonly tier: SubscriptionTier;
  readonly tierConfig: TierConfig;
  readonly authMethod: "session" | "api_key";
  readonly apiKeyId: string | null;
  readonly usageToday: number;
  readonly quotaRemaining: number;
}

export interface QuotaResult {
  readonly allowed: boolean;
  readonly used: number;
  readonly limit: number;
}

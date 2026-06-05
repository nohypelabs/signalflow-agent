/**
 * Tier-aware in-memory response cache.
 * TTL varies by subscription tier. Free-tier 15min cache serves stale data as the "delay" mechanism.
 * LRU eviction when max entries reached.
 */

import type { SubscriptionTier } from "@/lib/api-auth/context";
import { TIER_CONFIGS } from "@/lib/api-v1/tier-limits";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
  insertedAt: number;
}

const MAX_ENTRIES = 500;
const cache = new Map<string, CacheEntry>();

/** Get a cached response. Returns null if not found or expired. */
export function getCachedResponse(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/** Store a response in cache with tier-specific TTL. */
export function setCachedResponse(
  key: string,
  data: unknown,
  tier: SubscriptionTier,
): void {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_ENTRIES) {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [k, v] of cache) {
      if (v.insertedAt < oldestTime) {
        oldest = k;
        oldestTime = v.insertedAt;
      }
    }

    if (oldest) cache.delete(oldest);
  }

  const ttlMs = TIER_CONFIGS[tier].cacheTtlSeconds * 1000;
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    insertedAt: Date.now(),
  });
}

/** Build a cache key from endpoint, query params, and tier. */
export function buildCacheKey(
  endpoint: string,
  searchParams: string,
  tier: SubscriptionTier,
): string {
  return `${endpoint}:${searchParams}:${tier}`;
}

/** Get stale data even if expired (for degraded service). */
export function getStaleResponse(key: string): unknown | null {
  return cache.get(key)?.data ?? null;
}

/** Clear all cached entries. Useful for testing. */
export function clearCache(): void {
  cache.clear();
}

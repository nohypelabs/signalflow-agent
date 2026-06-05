/**
 * Daily usage tracking with in-memory hot path + DB upsert.
 * Minimizes database load by batching writes.
 */

import { getPrismaClient } from "@/lib/db/client";
import type { ApiEndpoint } from "@prisma/client";
import type { SubscriptionTier, QuotaResult } from "@/lib/api-auth/context";
import { TIER_CONFIGS } from "@/lib/api-v1/tier-limits";

// ─── In-memory counter (hot path) ───

interface UsageCounter {
  count: number;
  date: string; // YYYY-MM-DD
  dirty: boolean;
  lastFlushAt: number;
}

// Key: `${walletProfileId}:${endpoint}`
const counters = new Map<string, UsageCounter>();

const FLUSH_INTERVAL_MS = 60_000; // 1 minute

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Check daily quota and increment counter. Returns quota status. */
export async function checkAndIncrementUsage(
  walletProfileId: string,
  endpoint: ApiEndpoint,
  tier: SubscriptionTier,
): Promise<QuotaResult> {
  const config = TIER_CONFIGS[tier];
  const limit = config.requestsPerDay;

  // Unlimited quota for Whale tier
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const key = `${walletProfileId}:${endpoint}`;
  const today = todayKey();
  const counter = counters.get(key);

  // Counter exists for today
  if (counter && counter.date === today) {
    if (counter.count >= limit) {
      return { allowed: false, used: counter.count, limit };
    }

    counter.count += 1;
    counter.dirty = true;

    // Periodic flush to DB
    if (Date.now() - counter.lastFlushAt >= FLUSH_INTERVAL_MS) {
      flushToDb(walletProfileId, endpoint, today, counter.count).catch(() => {
        // Intentionally ignored — will retry on next flush
      });
      counter.lastFlushAt = Date.now();
    }

    return { allowed: true, used: counter.count, limit };
  }

  // New day or first request — check DB for existing count
  const prisma = getPrismaClient();
  const existing = await prisma.usageLog.findUnique({
    where: {
      walletProfileId_endpoint_requestDate: {
        walletProfileId,
        endpoint,
        requestDate: new Date(today),
      },
    },
    select: { requestCount: true },
  });

  const currentCount = (existing?.requestCount ?? 0) + 1;

  counters.set(key, {
    count: currentCount,
    date: today,
    dirty: true,
    lastFlushAt: Date.now(),
  });

  if (currentCount > limit) {
    return { allowed: false, used: currentCount - 1, limit };
  }

  return { allowed: true, used: currentCount, limit };
}

/** Flush a single counter to database. */
async function flushToDb(
  walletProfileId: string,
  endpoint: ApiEndpoint,
  date: string,
  count: number,
): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.usageLog.upsert({
    where: {
      walletProfileId_endpoint_requestDate: {
        walletProfileId,
        endpoint,
        requestDate: new Date(date),
      },
    },
    create: {
      walletProfileId,
      endpoint,
      requestDate: new Date(date),
      requestCount: count,
      lastRequestAt: new Date(),
    },
    update: {
      requestCount: count,
      lastRequestAt: new Date(),
    },
  });
}

/** Flush all dirty counters to database. Call on server shutdown or periodically. */
export async function flushAllCounters(): Promise<void> {
  const dirtyEntries: Array<{
    key: string;
    walletProfileId: string;
    endpoint: ApiEndpoint;
    date: string;
    count: number;
  }> = [];

  for (const [key, counter] of counters) {
    if (counter.dirty) {
      const [walletProfileId, endpoint] = key.split(":") as [string, ApiEndpoint];
      dirtyEntries.push({
        key,
        walletProfileId,
        endpoint,
        date: counter.date,
        count: counter.count,
      });
      counter.dirty = false;
    }
  }

  // Batch flush
  await Promise.allSettled(
    dirtyEntries.map((entry) =>
      flushToDb(entry.walletProfileId, entry.endpoint, entry.date, entry.count),
    ),
  );
}

/** Get total usage for today across all endpoints. */
export async function getTotalUsageToday(
  walletProfileId: string,
): Promise<number> {
  const today = todayKey();
  const prisma = getPrismaClient();

  const result = await prisma.usageLog.aggregate({
    _sum: { requestCount: true },
    where: {
      walletProfileId,
      requestDate: new Date(today),
    },
  });

  // Also count in-memory counters not yet flushed
  let memCount = 0;
  for (const [key, counter] of counters) {
    if (key.startsWith(walletProfileId) && counter.date === today) {
      memCount += counter.count;
    }
  }

  return (result._sum.requestCount ?? 0) + memCount;
}

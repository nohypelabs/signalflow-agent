interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_STALE_MS = 10_000;
const DEFAULT_EXPIRE_MS = 60_000;

export function getCached<T>(key: string, staleMs = DEFAULT_STALE_MS, expireMs = DEFAULT_EXPIRE_MS): {
  data: T | null;
  fresh: boolean;
  stale: boolean;
} {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return { data: null, fresh: false, stale: false };

  const now = Date.now();
  if (now > entry.expiresAt) {
    cache.delete(key);
    return { data: null, fresh: false, stale: false };
  }

  const fresh = now < entry.staleAt;
  const stale = now >= entry.staleAt;
  return { data: entry.data, fresh, stale };
}

export function setCache<T>(key: string, data: T, staleMs = DEFAULT_STALE_MS, expireMs = DEFAULT_EXPIRE_MS): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    staleAt: now + staleMs,
    expiresAt: now + expireMs,
  });
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

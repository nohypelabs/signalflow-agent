import { getPerpsOrderbook, toPerpsSymbol } from "@/lib/sodex-perps";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

// ── In-memory cache (short TTL for orderbook) ──────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_MS = 2_000; // 2s — orderbook changes fast but no need to hammer API

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) return jsonNoCache({ error: "symbol required" }, { status: 400 });

  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;
  let perpsSymbol: string;
  try {
    perpsSymbol = toPerpsSymbol(symbol);
  } catch (error) {
    return jsonNoCache(
      { error: error instanceof Error ? error.message : "invalid symbol" },
      { status: 400 },
    );
  }
  const cacheKey = `${perpsSymbol}:${limit ?? "default"}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return jsonNoCache(cached.data);
  }

  try {
    const data = await getPerpsOrderbook(perpsSymbol, limit);
    cache.set(cacheKey, { data, ts: Date.now() });
    return jsonNoCache(data);
  } catch (err) {
    // Return stale cache if available
    if (cached) return jsonNoCache(cached.data);
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Orderbook fetch failed" },
      { status: 502 },
    );
  }
}

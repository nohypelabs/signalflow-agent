import { NextRequest } from "next/server";
import { getTickers, getSymbols } from "@/lib/sodex";
import { getCurrencies, getMarketSnapshot } from "@/lib/sosovalue";
import type { SoDEXTicker } from "@/lib/sodex";
import type { MarketSnapshot } from "@/lib/sosovalue";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

interface ScreenerPair {
  symbol: string;
  displayName: string;
  baseCoin: string;
  quoteCoin: string;
  price: number;
  change24h: number;
  volume24h: number;
  quoteVolume24h: number;
  high24h: number;
  low24h: number;
  bid: number;
  ask: number;
  spread: number;
  marketcap: number;
  marketcapRank: number;
  category: string;
  status: string;
}

// Map SoDEX symbol to base asset for SoSoValue lookup
function sodexBaseToSosoId(base: string, currencies: { symbol: string; currency_id: string }[]): string | null {
  const clean = base.replace(/^v/, "").toLowerCase();
  const match = currencies.find((c) => c.symbol.toLowerCase() === clean);
  return match?.currency_id ?? null;
}

function categorize(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes("MAG7") || s.includes("DEFI") || s.includes("MEME") || s.includes("USSI")) return "index";
  if (["AAPL", "MSFT", "NVDA", "TSLA", "META", "GOOGL", "AMZN"].some((st) => s.includes(st))) return "stock";
  if (s.includes("XAUT")) return "commodity";
  if (s.includes("SOSO")) return "utility";
  return "crypto";
}

let cache: { data: ScreenerPair[]; ts: number } | null = null;
const CACHE_MS = 60_000;

export async function GET(req: NextRequest) {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return applyFilters(cache.data, req);
  }

  try {
    const [tickers, symbols, currencies] = await Promise.all([
      getTickers().catch(() => [] as SoDEXTicker[]),
      getSymbols().catch(() => [] as { name: string; displayName: string; baseCoin: string; quoteCoin: string; status: string }[]),
      getCurrencies().catch(() => [] as { symbol: string; currency_id: string }[]),
    ]);

    // Build symbol info map
    const symMap = new Map<string, { displayName: string; baseCoin: string; quoteCoin: string; status: string }>();
    for (const s of symbols) {
      symMap.set(s.name, { displayName: s.displayName, baseCoin: s.baseCoin, quoteCoin: s.quoteCoin, status: s.status });
    }

    // Fetch SoSoValue snapshots for crypto pairs (limited to avoid rate limits)
    const cryptoBases = [...new Set(tickers.map((t) => {
      const base = t.symbol.split("_")[0]?.replace(/^v/, "") ?? "";
      return base.toLowerCase();
    }))].filter((b) => b && !["usdt", "usdc"].includes(b));

    const snapshotMap = new Map<string, MarketSnapshot>();
    // Fetch snapshots for top assets only (max 10 to stay within rate limits)
    const topBases = cryptoBases.slice(0, 10);
    const snapshotResults = await Promise.all(
      topBases.map(async (base) => {
        const cid = sodexBaseToSosoId(base, currencies as { symbol: string; currency_id: string }[]);
        if (!cid) return null;
        const snap = await getMarketSnapshot(cid).catch(() => null);
        return snap ? { base, snap } : null;
      }),
    );
    for (const r of snapshotResults) {
      if (r) snapshotMap.set(r.base, r.snap);
    }

    const pairs: ScreenerPair[] = tickers.map((t) => {
      const info = symMap.get(t.symbol);
      const base = t.symbol.split("_")[0]?.replace(/^v/, "") ?? "";
      const snap = snapshotMap.get(base.toLowerCase());
      const bid = parseFloat(t.bidPx) || 0;
      const ask = parseFloat(t.askPx) || 0;

      return {
        symbol: t.symbol,
        displayName: info?.displayName ?? t.symbol,
        baseCoin: info?.baseCoin ?? base,
        quoteCoin: info?.quoteCoin ?? "USDC",
        price: parseFloat(t.lastPx) || 0,
        change24h: t.changePct || 0,
        volume24h: parseFloat(t.volume) || 0,
        quoteVolume24h: parseFloat(t.quoteVolume) || 0,
        high24h: parseFloat(t.highPx) || 0,
        low24h: parseFloat(t.lowPx) || 0,
        bid,
        ask,
        spread: ask > 0 ? ((ask - bid) / ask) * 100 : 0,
        marketcap: snap?.marketcap ?? 0,
        marketcapRank: snap?.marketcap_rank ?? 0,
        category: categorize(t.symbol),
        status: info?.status ?? "UNKNOWN",
      };
    });

    cache = { data: pairs, ts: Date.now() };
    return applyFilters(pairs, req);
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed to fetch screener data" },
      { status: 502 },
    );
  }
}

function applyFilters(pairs: ScreenerPair[], req: NextRequest) {
  const q = req.nextUrl.searchParams;
  let filtered = [...pairs];

  const category = q.get("category");
  if (category && category !== "all") {
    filtered = filtered.filter((p) => p.category === category);
  }

  const minVolume = q.get("minVolume");
  if (minVolume) {
    filtered = filtered.filter((p) => p.quoteVolume24h >= Number(minVolume));
  }

  const status = q.get("status");
  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  const sortBy = q.get("sortBy") || "volume";
  const sortDir = q.get("sortDir") === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    const av = sortBy === "volume" ? a.quoteVolume24h : sortBy === "change" ? a.change24h : sortBy === "marketcap" ? a.marketcap : a.price;
    const bv = sortBy === "volume" ? b.quoteVolume24h : sortBy === "change" ? b.change24h : sortBy === "marketcap" ? b.marketcap : b.price;
    return (av - bv) * sortDir;
  });

  return jsonNoCache({ pairs: filtered, total: filtered.length, updated: cache?.ts ?? Date.now() });
}

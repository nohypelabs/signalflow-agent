import { NextRequest } from "next/server";
import { getKlines } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

function computeCorrelation(returnsA: number[], returnsB: number[]): number {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < 3) return 0;

  const a = returnsA.slice(-n);
  const b = returnsB.slice(-n);

  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  return denom > 0 ? cov / denom : 0;
}

function computeReturnsFromKlines(klines: { c: string }[]): number[] {
  const closes = klines.map((k) => parseFloat(k.c));
  return closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
}

interface CacheEntry {
  matrix: number[][];
  symbols: string[];
  ts: number;
}

let cache: CacheEntry | null = null;
const CACHE_MS = 5 * 60_000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const defaultSymbols = ["vBTC_vUSDC", "vETH_vUSDC", "vSOL_vUSDC", "vBNB_vUSDC", "vXRP_vUSDC", "vDOGE_vUSDC"];
  const symbolsParam = q.get("symbols");
  const symbols = symbolsParam ? symbolsParam.split(",") : defaultSymbols;

  const limit = q.get("limit") ? Number(q.get("limit")) : 30;
  const interval = q.get("timeframe") === "1h" ? "1h" : "1d";

  // Check cache
  const cacheKey = symbols.join(",") + interval + limit;
  if (cache && Date.now() - cache.ts < CACHE_MS && cache.symbols.join(",") === symbols.join(",")) {
    return jsonNoCache({ matrix: cache.matrix, symbols: cache.symbols, updated: cache.ts });
  }

  try {
    const allReturns = await Promise.all(
      symbols.map(async (sym) => {
        const klines = await getKlines(sym, interval, limit).catch(() => []);
        return computeReturnsFromKlines(klines);
      }),
    );

    const n = symbols.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (j < i) {
          matrix[i][j] = matrix[j][i]; // symmetric
        } else {
          matrix[i][j] = Math.round(computeCorrelation(allReturns[i], allReturns[j]) * 100) / 100;
        }
      }
    }

    const ts = Date.now();
    cache = { matrix, symbols, ts };
    return jsonNoCache({ matrix, symbols, updated: ts });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed to compute correlation" },
      { status: 502 },
    );
  }
}

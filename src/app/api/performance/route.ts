import { getCurrencies, getKlines, getMarketSnapshot } from "@/lib/sosovalue";
import { getTickers } from "@/lib/sodex";
import type { KlineItem } from "@/lib/sosovalue";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

interface CoinPerf {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  high30d: number;
  low30d: number;
  volatility7d: number;
  volatility30d: number;
  maxDrawdown: number;
  sharpeRatio: number;
  klines: { t: number; c: number }[];
}

function computeReturns(klines: KlineItem[]) {
  const empty = { change7d: 0, change30d: 0, high30d: 0, low30d: 0, volatility7d: 0, volatility30d: 0, maxDrawdown: 0, sharpeRatio: 0 };
  if (klines.length < 2) return empty;

  const closes = klines.map((k) => k.close);
  const current = closes[closes.length - 1];

  const d7 = Math.min(7, closes.length - 1);
  const change7d = ((current - closes[closes.length - 1 - d7]) / closes[closes.length - 1 - d7]) * 100;
  const change30d = ((current - closes[0]) / closes[0]) * 100;

  const high30d = Math.max(...closes);
  const low30d = Math.min(...closes);

  // Daily returns
  const dailyReturns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / dailyReturns.length;
  const volatility30d = Math.sqrt(variance) * 100;

  // 7-day volatility
  const recent7 = dailyReturns.slice(-7);
  const mean7 = recent7.length > 0 ? recent7.reduce((a, b) => a + b, 0) / recent7.length : 0;
  const var7 = recent7.length > 0 ? recent7.reduce((a, r) => a + (r - mean7) ** 2, 0) / recent7.length : 0;
  const volatility7d = Math.sqrt(var7) * 100;

  // Max drawdown
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  maxDrawdown = maxDrawdown * 100;

  // Sharpe ratio (annualized, risk-free = 0)
  const annualizedReturn = mean * 365;
  const annualizedVol = Math.sqrt(variance) * Math.sqrt(365);
  const sharpeRatio = annualizedVol > 0 ? annualizedReturn / annualizedVol : 0;

  return { change7d, change30d, high30d, low30d, volatility7d, volatility30d, maxDrawdown, sharpeRatio };
}

let cache: { data: CoinPerf[]; ts: number } | null = null;
const CACHE_MS = 300_000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return jsonNoCache({ coins: cache.data, updated: cache.ts });
  }

  try {
    const [currencies, sodexTickers] = await Promise.all([
      getCurrencies().catch(() => []),
      getTickers().catch(() => []),
    ]);

    const tickerMap = new Map(sodexTickers.map((t) => [t.symbol, t]));

    const targets = ["btc", "eth", "sol"];
    const coinResults = await Promise.all(
      targets.map(async (sym) => {
        const currency = currencies.find((c) => c.symbol.toLowerCase() === sym);
        if (!currency) return null;

        const [klines, snapshot] = await Promise.all([
          getKlines(currency.currency_id, "1d", 30).catch(() => []),
          getMarketSnapshot(currency.currency_id).catch(() => null),
        ]);

        const sodexSym = `v${sym.toUpperCase()}_vUSDC`;
        const ticker = tickerMap.get(sodexSym);
        const price = ticker ? parseFloat(ticker.lastPx) : snapshot?.price ?? 0;
        const change24h = ticker ? ticker.changePct : snapshot?.change_pct_24h ?? 0;

        const { change7d, change30d, high30d, low30d, volatility7d, volatility30d, maxDrawdown, sharpeRatio } = computeReturns(klines);

        return {
          symbol: sym.toUpperCase(),
          price,
          change24h,
          change7d,
          change30d,
          high30d,
          low30d,
          volatility7d,
          volatility30d,
          maxDrawdown,
          sharpeRatio,
          klines: klines.map((k) => ({ t: k.timestamp, c: k.close })),
        } satisfies CoinPerf;
      }),
    );

    const coins = coinResults.filter((c): c is CoinPerf => c !== null);

    cache = { data: coins, ts: Date.now() };
    return jsonNoCache({ coins, updated: cache.ts });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}

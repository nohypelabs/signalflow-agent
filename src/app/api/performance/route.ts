import { NextResponse } from "next/server";
import { getCurrencies, getKlines, getMarketSnapshot } from "@/lib/sosovalue";
import { getTickers } from "@/lib/sodex";
import type { KlineItem } from "@/lib/sosovalue";

interface CoinPerf {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  high30d: number;
  low30d: number;
  volatility30d: number;
  klines: { t: number; c: number }[];
}

function computeReturns(klines: KlineItem[]) {
  if (klines.length < 2) return { change7d: 0, change30d: 0, high30d: 0, low30d: 0, volatility30d: 0 };

  const closes = klines.map((k) => k.close);
  const current = closes[closes.length - 1];

  const d7 = Math.min(7, closes.length - 1);
  const change7d = ((current - closes[closes.length - 1 - d7]) / closes[closes.length - 1 - d7]) * 100;
  const change30d = ((current - closes[0]) / closes[0]) * 100;

  const high30d = Math.max(...closes);
  const low30d = Math.min(...closes);

  // Volatility = stdev of daily returns
  const dailyReturns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / dailyReturns.length;
  const volatility30d = Math.sqrt(variance) * 100;

  return { change7d, change30d, high30d, low30d, volatility30d };
}

let cache: { data: CoinPerf[]; ts: number } | null = null;
const CACHE_MS = 300_000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json({ coins: cache.data, updated: cache.ts });
  }

  try {
    const currencies = await getCurrencies().catch(() => []);
    const sodexTickers = await getTickers().catch(() => []);

    const targets = ["btc", "eth", "sol"];
    const coins: CoinPerf[] = [];

    for (const sym of targets) {
      const currency = currencies.find((c) => c.symbol.toLowerCase() === sym);
      if (!currency) continue;

      const [klines, snapshot] = await Promise.all([
        getKlines(currency.currency_id, "1d", 30).catch(() => []),
        getMarketSnapshot(currency.currency_id).catch(() => null),
      ]);

      const sodexSym = `v${sym.toUpperCase()}_vUSDC`;
      const ticker = sodexTickers.find((t) => t.symbol === sodexSym);
      const price = ticker ? parseFloat(ticker.lastPx) : snapshot?.price ?? 0;
      const change24h = ticker ? ticker.changePct : snapshot?.change_pct_24h ?? 0;

      const { change7d, change30d, high30d, low30d, volatility30d } = computeReturns(klines);

      coins.push({
        symbol: sym.toUpperCase(),
        price,
        change24h,
        change7d,
        change30d,
        high30d,
        low30d,
        volatility30d,
        klines: klines.map((k) => ({ t: k.timestamp, c: k.close })),
      });
    }

    cache = { data: coins, ts: Date.now() };
    return NextResponse.json({ coins, updated: cache.ts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}

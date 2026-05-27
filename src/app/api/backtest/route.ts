import { getKlines as getSodexKlines } from "@/lib/sodex";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { runBacktest } from "@/lib/strategy/backtest";
import type { TradingType } from "@/lib/types/trading-type";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

const VALID_PAIRS = ["BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC", "LINK/USDC"];
const VALID_TYPES = ["scalping", "intraday", "swing", "position"];

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pair = url.searchParams.get("pair") ?? "BTC/USDC";
    const typeParam = url.searchParams.get("type");
    const resolutionParam = url.searchParams.get("resolution") ?? "12";
    const stepParam = url.searchParams.get("step") ?? "4";

    if (!VALID_PAIRS.includes(pair)) {
      return jsonNoCache({ error: `Invalid pair. Valid: ${VALID_PAIRS.join(", ")}` }, { status: 400 });
    }

    const tradingType: TradingType | null =
      typeParam && VALID_TYPES.includes(typeParam) ? typeParam as TradingType : null;

    const resolution = Math.max(4, Math.min(48, parseInt(resolutionParam) || 12));
    const step = Math.max(1, Math.min(24, parseInt(stepParam) || 4));

    const symbol = pairToSodexSymbol(pair);
    if (!symbol) {
      return jsonNoCache({ error: "Pair not found on SoDEX" }, { status: 400 });
    }

    // Fetch 1H klines (250 bars for lookback + enough for backtesting)
    const klines = await withTimeout(
      getSodexKlines(symbol, "1h", 500).catch(() => []),
      15_000,
      [],
    );

    if (klines.length < 100) {
      return jsonNoCache({ error: "Insufficient kline data for backtest" }, { status: 400 });
    }

    // Run backtest
    const result = runBacktest(klines, pair, {
      lookback: 60,
      step,
      resolution,
      tradingType: tradingType ?? undefined,
    });

    return jsonNoCache(result);
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Backtest failed" },
      { status: 500 },
    );
  }
}

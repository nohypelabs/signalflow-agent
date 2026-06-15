import { NextRequest } from "next/server";
import { getTickers, getKlines, getSymbols, getOrderbook, getRecentTrades } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";
import { getCached, setCache } from "@/lib/api/server-cache";
import {
  marketKlinesQuerySchema,
  marketOrderbookQuerySchema,
  marketSymbolsQuerySchema,
  marketTickersQuerySchema,
  marketTradesQuerySchema,
  marketTypeSchema,
} from "@/lib/validation/api-schemas";
import { searchParamsToObject, validateRequest } from "@/lib/validation";

export const dynamic = "force-dynamic";

const TICKERS_CACHE_KEY = "tickers";
const KLINE_CACHE_PREFIX = "klines:";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const paramValidation = validateRequest(marketTypeSchema, await params);
  if (!paramValidation.ok) return paramValidation.response;

  const { type } = paramValidation.data;
  const query = searchParamsToObject(req.nextUrl.searchParams);

  try {
    switch (type) {
      case "tickers": {
        const validation = validateRequest(marketTickersQuerySchema, query);
        if (!validation.ok) return validation.response;
        const { symbol } = validation.data;
        const cacheKey = symbol ? `${TICKERS_CACHE_KEY}:${symbol}` : TICKERS_CACHE_KEY;

        const cached = getCached(cacheKey);
        if (cached.fresh) return jsonNoCache(cached.data);

        try {
          const data = await getTickers(symbol);
          setCache(cacheKey, data);
          return jsonNoCache(data);
        } catch (err) {
          if (cached.stale && cached.data) {
            return jsonNoCache(cached.data);
          }
          throw err;
        }
      }
      case "klines": {
        const validation = validateRequest(marketKlinesQuerySchema, query);
        if (!validation.ok) return validation.response;
        const { symbol, interval, limit } = validation.data;
        const cacheKey = `${KLINE_CACHE_PREFIX}${symbol}:${interval}:${limit ?? 30}`;

        const cached = getCached(cacheKey, 15_000, 120_000);
        if (cached.fresh) return jsonNoCache(cached.data);

        try {
          const data = await getKlines(symbol, interval, limit);
          setCache(cacheKey, data, 15_000, 120_000);
          return jsonNoCache(data);
        } catch (err) {
          if (cached.stale && cached.data) {
            return jsonNoCache(cached.data);
          }
          throw err;
        }
      }
      case "symbols": {
        const validation = validateRequest(marketSymbolsQuerySchema, query);
        if (!validation.ok) return validation.response;
        const { symbol } = validation.data;
        const data = await getSymbols(symbol);
        return jsonNoCache(data);
      }
      case "orderbook": {
        const validation = validateRequest(marketOrderbookQuerySchema, query);
        if (!validation.ok) return validation.response;
        const { symbol, limit } = validation.data;
        const data = await getOrderbook(symbol, limit);
        return jsonNoCache(data);
      }
      case "trades": {
        const validation = validateRequest(marketTradesQuerySchema, query);
        if (!validation.ok) return validation.response;
        const { symbol, limit } = validation.data;
        const data = await getRecentTrades(symbol, limit);
        return jsonNoCache(data);
      }
    }
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "SoDEX fetch failed" },
      { status: 502 },
    );
  }
}

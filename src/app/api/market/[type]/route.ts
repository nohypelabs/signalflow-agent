import { NextRequest } from "next/server";
import { getTickers, getKlines, getSymbols, getOrderbook, getRecentTrades } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";
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
        const data = await getTickers(symbol);
        return jsonNoCache(data);
      }
      case "klines": {
        const validation = validateRequest(marketKlinesQuerySchema, query);
        if (!validation.ok) return validation.response;
        const { symbol, interval, limit } = validation.data;
        const data = await getKlines(symbol, interval, limit);
        return jsonNoCache(data);
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

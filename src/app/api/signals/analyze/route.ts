import { NextRequest } from "next/server";
import { chat } from "@/lib/deepseek";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";
import {
  getETFSummary,
  getMacroEvents,
  getBTCTreasuries,
  getMarketSnapshot,
  getNewsHot,
  getCurrencies,
} from "@/lib/sosovalue";
import type { ETFSummaryItem, MarketSnapshot, NewsItem, MacroEvent } from "@/lib/sosovalue";
import { getTickers } from "@/lib/sodex";

// ── Data fetching (reuse heuristic scoring as AI reference) ──

async function gatherMarketData(coin: string) {
  const [currencies, etfSummary, macroEvents, btcTreasuries, hotNews] = await Promise.all([
    getCurrencies().catch(() => []),
    getETFSummary("BTC", "US", 5).catch(() => []),
    getMacroEvents().catch(() => []),
    getBTCTreasuries().catch(() => []),
    getNewsHot(1, 20).catch(() => ({ list: [], page: 1, page_size: 20, total: 0 })),
  ]);

  const currency = currencies.find((c) => c.symbol.toLowerCase() === coin.toLowerCase());
  const snap = currency
    ? await getMarketSnapshot(currency.currency_id).catch(() => null)
    : null;
  const newsList = "list" in hotNews ? hotNews.list : [];

  // SoDEX ticker for live price
  const sodexSymbol = `v${coin.toUpperCase()}_vUSDC`;
  const tickers = await getTickers().catch(() => []);
  const ticker = tickers.find((t) => t.symbol === sodexSymbol);

  return {
    coin,
    price: ticker ? Number(ticker.lastPx) : snap?.price ?? 0,
    change24h: ticker ? ticker.changePct : snap?.change_pct_24h ?? 0,
    volume24h: ticker ? Number(ticker.quoteVolume) : snap?.turnover_24h ?? 0,
    etfSummary,
    news: newsList.slice(0, 10),
    macroEvents,
    btcTreasuries,
    snap,
  };
}

// ── Build structured prompt ──────────────────────────────

function buildPrompt(data: Awaited<ReturnType<typeof gatherMarketData>>) {
  const { coin, price, change24h, volume24h, etfSummary, news, macroEvents, btcTreasuries } = data;

  const etfLines = etfSummary.slice(0, 3).map((e) =>
    `  ${e.date}: net_inflow=$${(e.total_net_inflow / 1e6).toFixed(1)}M, AUM=$${(e.total_net_assets / 1e9).toFixed(1)}B, cum_inflow=$${(e.cum_net_inflow / 1e9).toFixed(1)}B`
  ).join("\n");

  const newsLines = news.slice(0, 8).map((n) => `  - ${n.title}`).join("\n");

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMacro = macroEvents.filter((e) => e.date === todayStr);
  const macroLines = todayMacro.flatMap((e) => e.events).slice(0, 5).map((e) => `  - ${e}`).join("\n") || "  No major macro events today";

  const treasuryLines = btcTreasuries.slice(0, 5).map((c) => `  - ${c.ticker} (${c.name})`).join("\n");

  return `You are SignalFlow, an institutional-grade crypto trading signal agent. Analyze the following real-time market data for ${coin} and produce a trading signal (BUY, SELL, or HOLD).

## ${coin} Price Data
- Price: $${price.toLocaleString()}
- 24h Change: ${change24h > 0 ? "+" : ""}${change24h.toFixed(2)}%
- 24h Volume: $${(volume24h / 1e6).toFixed(1)}M

## ETF Flow Data (Bitcoin ETFs)
${etfLines || "  No ETF data available"}

## Hot News Headlines
${newsLines || "  No news data available"}

## Macro Events (${todayStr})
${macroLines}

## BTC Treasury Holdings (Public Companies)
${treasuryLines || "  No treasury data available"}

## Instructions
Analyze all 5 dimensions below. Score each 0-100. Do NOT use the heuristic scores — apply your own judgment based on the raw data provided.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "reasoning": "<2-4 sentence thesis synthesizing the data>",
  "dimensions": {
    "etfFlow": { "score": <0-100>, "detail": "<1 sentence specific to current ETF data>" },
    "sentiment": { "score": <0-100>, "detail": "<1 sentence about news sentiment>" },
    "macro": { "score": <0-100>, "detail": "<1 sentence about macro conditions>" },
    "momentum": { "score": <0-100>, "detail": "<1 sentence about price action>" },
    "treasury": { "score": <0-100>, "detail": "<1 sentence about institutional adoption>" }
  },
  "execution": {
    "orderType": "<Limit Buy on SoDEX | Limit Sell on SoDEX | No action>",
    "entry": <current price>,
    "takeProfit": <0 if HOLD, else price * 1.05 for BUY or price * 0.95 for SELL>,
    "stopLoss": <0 if HOLD, else price * 0.95 for BUY or price * 1.05 for SELL>,
    "positionSize": "<X% of portfolio | —>",
    "riskReward": "<1 : X.XX | —>"
  }
}

Critical: takeProfit and stopLoss must be numbers, not null. For HOLD signals, use 0 for takeProfit and stopLoss. For BUY: TP > entry > SL. For SELL: SL > entry > TP.`;
}

// ── Route handler ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const coin = (body.coin || body.pair || "BTC").replace(/\/.*$/, "").toUpperCase();

    if (!["BTC", "ETH", "SOL"].includes(coin)) {
      return jsonNoCache(
        { error: `Unsupported coin: ${coin}. Supported: BTC, ETH, SOL.` },
        { status: 400 },
      );
    }

    const marketData = await gatherMarketData(coin);
    const prompt = buildPrompt(marketData);

    // User-provided AI config takes precedence over server defaults
    const userProvider = body.provider && body.apiKey
      ? { baseUrl: body.provider, apiKey: body.apiKey, model: body.model || "deepseek-chat" }
      : undefined;

    const raw = await chat(
      [
        { role: "system", content: "You are SignalFlow, a crypto trading signal agent. You output only valid JSON. No markdown, no code fences." },
        { role: "user", content: prompt },
      ],
      userProvider ? { provider: userProvider } : undefined,
    );

    // Deepseek may wrap JSON in ``` fences — strip if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate shape
    if (!parsed.action || !parsed.confidence || !parsed.dimensions || !parsed.execution) {
      throw new Error("AI response missing required fields");
    }

    return jsonNoCache({
      ...parsed,
      coin,
      pair: `${coin}/USDC`,
      price: marketData.price,
      change24h: marketData.change24h,
      generated: Date.now(),
      sources: [
        "ETF Module (SoSoValue)",
        "News Feeds (SoSoValue)",
        "Macro Events (SoSoValue)",
        "BTC Treasuries (SoSoValue)",
        `Price Data (SoDEX)`,
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signal analysis failed";
    console.error("/api/signals/analyze error:", msg);
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}

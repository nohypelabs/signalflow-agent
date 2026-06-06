import { NextRequest } from "next/server";
import { chat } from "@/lib/deepseek";
import { jsonNoCache } from "@/lib/api/no-cache";
import { mapAIError } from "@/lib/ai/providerErrors";
import type { Provider } from "@/lib/ai-providers";
import { getAllowedProvider } from "@/lib/ai-providers";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { signalGenerationSchema } from "@/lib/validation/api-schemas";
import { validateRequest } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s on Vercel Pro for AI calls
import {
  getETFSummary,
  getMacroEvents,
  getBTCTreasuries,
  getMarketSnapshot,
  getNewsHot,
  getCurrencies,
} from "@/lib/sosovalue";
import { getTickers, getKlines, getOrderbook, getRecentTrades } from "@/lib/sodex";
import type { OrderBook } from "@/lib/sodex";
import type { SoDEXTrade } from "@/lib/types/trade";
import { generateSignal } from "@/lib/strategy/signal-engine";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { deserializeStrategyConfig } from "@/lib/strategy/config";
import { generateLiquidityFlowSignals } from "@/lib/strategy/policy-engine";
import { generateSignalsV2 } from "@/lib/strategy/signal-engine-v2";
import type { Signal } from "@/lib/types/signal";
import { getPerpsTickers } from "@/lib/sodex-perps";
import type { SoDEXPerpsTicker } from "@/lib/sodex-perps";

// ── Data fetching (reuse heuristic scoring as AI reference) ──

function withTimeout<T>(promise: Promise<T>, ms: number, label: string, signal?: AbortSignal): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  const onAbort = () => ac.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  return Promise.race([
    promise.finally(() => { clearTimeout(t); signal?.removeEventListener("abort", onAbort); }),
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        clearTimeout(t);
        signal?.removeEventListener("abort", onAbort);
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms),
    ),
  ]);
}

async function gatherMarketData(coin: string, signal?: AbortSignal) {
  const DATA_TIMEOUT = 15_000; // 15s for all external data

  const [currencies, etfSummary, macroEvents, btcTreasuries, hotNews] = await withTimeout(
    Promise.all([
      getCurrencies(signal).catch(() => []),
      getETFSummary("BTC", "US", 5, signal).catch(() => []),
      getMacroEvents(signal).catch(() => []),
      getBTCTreasuries(signal).catch(() => []),
      getNewsHot(1, 20, signal).catch(() => ({ list: [], page: 1, page_size: 20, total: 0 })),
    ]),
    DATA_TIMEOUT,
    "SoSoValue data gathering",
    signal,
  );

  const currency = currencies.find((c) => c.symbol.toLowerCase() === coin.toLowerCase());
  const snap = currency
    ? await withTimeout(
        getMarketSnapshot(currency.currency_id, signal).catch(() => null),
        DATA_TIMEOUT,
        "Market snapshot",
        signal,
      )
    : null;
  const newsList = "list" in hotNews ? hotNews.list : [];

  // SoDEX ticker for live price + klines for TA engine
  const sodexSymbol = pairToSodexSymbol(`${coin}/USDC`) || `v${coin.toUpperCase()}_vUSDC`;
  const [tickers, klines] = await withTimeout(
    Promise.all([
      getTickers().catch(() => []),
      getKlines(sodexSymbol, "1h", 100).catch(() => []),
    ]),
    DATA_TIMEOUT,
    "SoDEX data gathering",
    signal,
  );
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
    klines,
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
    "takeProfit": <0 if HOLD, else your best estimate of a realistic target based on recent volatility and structure levels>,
    "stopLoss": <0 if HOLD, else your best estimate of an invalidation level based on recent structure>,
    "positionSize": "<X% of portfolio | —>",
    "riskReward": "<1 : X.XX | —>"
  }
}

Critical: takeProfit and stopLoss must be numbers, not null. For HOLD signals, use 0 for takeProfit and stopLoss. For BUY: TP > entry > SL. For SELL: SL > entry > TP.`;
}

// ── Route handler ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "signalAnalyze");
  if (limited) return limited;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateRequest(signalGenerationSchema, rawBody);
    if (!validation.ok) return validation.response;

    const body = validation.data;
    const coin = (body.coin || body.pair || "BTC").replace(/\/.*$/, "").toUpperCase();
    console.log(`[/api/signals/analyze] coin=${coin} provider=${body.provider || "none"} model=${body.model || "none"} includeAI=${body.includeAI}`);

    if (!["BTC", "ETH", "SOL"].includes(coin)) {
      return jsonNoCache(
        { error: `Unsupported coin: ${coin}. Supported: BTC, ETH, SOL.` },
        { status: 400 },
      );
    }

    const includeAI = body.includeAI !== false; // default true for backward compat

    // Abort wiring for upstreams
    const ac = new AbortController();
    const reqSignal = (req as Request & { signal?: AbortSignal }).signal;
    if (reqSignal) reqSignal.addEventListener("abort", () => ac.abort(), { once: true });

    const marketData = await gatherMarketData(coin, ac.signal);

    // Always fetch micro for the coin (orderbook, trades, perps) so V3 can use it
    const sodexSymbol = pairToSodexSymbol(`${coin}/USDC`) || `v${coin.toUpperCase()}_vUSDC`;
    const [orderbook, recentTradesRaw, perpsList] = await Promise.all([
      getOrderbook(sodexSymbol).catch(() => null as OrderBook | null),
      getRecentTrades(sodexSymbol, 80).catch(() => [] as SoDEXTrade[]),
      getPerpsTickers().catch(() => [] as SoDEXPerpsTicker[]),
    ]);
    const perpsTicker = perpsList.find((t: SoDEXPerpsTicker) => t.symbol?.toUpperCase().startsWith(coin)) || null;
    const recentTrades = recentTradesRaw;

    // ── Base signal: respect active strategy (liquidityFlow is legacy; main path is Confluence V3 with micro fused) ──
    const strategyConfig = body.strategy ? deserializeStrategyConfig(body.strategy) : undefined;
    const isLiquidity = strategyConfig?.engine === "liquidityFlow";

    let baseSignal: Signal | null = null;

    if (isLiquidity) {
      const klinesMap = new Map([[coin, marketData.klines]]);
      const orderbooksMap = orderbook ? new Map([[coin, orderbook]]) : new Map();

      const liqSignals = generateLiquidityFlowSignals({
        pairs: [`${coin}/USDC`],
        klinesMap,
        orderbooks: orderbooksMap,
        config: strategyConfig!,
      });
      baseSignal = liqSignals[0] ?? null;
    } else {
      // Confluence V3 unified path for manual "Generate Signal"
      const klinesMap = new Map([[coin, marketData.klines]]);
      const orderbooksMap = orderbook ? new Map([[coin, orderbook]]) : new Map();
      const recentTradesMap = recentTrades.length > 0 ? new Map([[coin, recentTrades]]) : new Map();
      const perpsTickersMap = perpsTicker ? new Map([[coin, perpsTicker]]) : new Map();

      const v3Signals = generateSignalsV2({
        pairs: [`${coin}/USDC`],
        klinesMap,
        orderbooks: orderbooksMap,
        recentTrades: recentTradesMap,
        perpsTickers: perpsTickersMap,
        tradingType: "intraday",
      });
      const rawV3 = v3Signals[0] ?? null;
      // Convert V2 to simple Signal (action LONG/SHORT/HOLD) for compatibility with analyze response
      baseSignal = rawV3 ? {
        ...rawV3,
        action: rawV3.action.includes("LONG") ? "LONG" : rawV3.action.includes("SHORT") ? "SHORT" : "HOLD",
        actionV2: rawV3.action,
      } as Signal : null;
    }

    if (!baseSignal) {
      return jsonNoCache(
        { error: "Insufficient market data for signal generation. SoDEX klines may be unavailable." },
        { status: 422 },
      );
    }

    const baseSources = [
      "ETF Module (SoSoValue)",
      "News Feeds (SoSoValue)",
      "Macro Events (SoSoValue)",
      "BTC Treasuries (SoSoValue)",
      "Price Data (SoDEX)",
      "Technical Analysis",
    ];

    // ── No AI requested — return base signal only ──
    if (!includeAI) {
      return jsonNoCache({
        baseSignal,
        aiThesis: null,
        aiError: null,
        sources: baseSources,
        generated: Date.now(),
      });
    }

    // ── AI enrichment requested ──
    try {
      const prompt = buildPrompt(marketData);

      // User-provided AI config takes precedence, but provider URLs are always resolved from an allowlist.
      const requestedProvider =
        typeof body.provider === "string" ? getAllowedProvider(body.provider) : undefined;
      if (body.apiKey && !requestedProvider) {
        return jsonNoCache({ error: "Unsupported AI provider" }, { status: 400 });
      }
      const userProvider = requestedProvider && typeof body.apiKey === "string"
        ? {
            id: requestedProvider.id as Provider,
            apiKey: body.apiKey,
            model: typeof body.model === "string" && body.model ? body.model : requestedProvider.defaultModel,
          }
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

      // Override AI's TP/SL with signal engine's ATR-based execution.
      // The AI is good at reasoning but bad at precise price levels —
      // the signal engine computes proper TP/SL from ATR, regime, and structure.
      const baseExec = baseSignal.execution;
      const aiExec = parsed.execution;
      const mergedExecution = {
        orderType: aiExec.orderType || baseExec.orderType,
        entry: baseExec.entry || aiExec.entry || marketData.price,
        takeProfit: baseExec.takeProfit || aiExec.takeProfit || 0,
        stopLoss: baseExec.stopLoss || aiExec.stopLoss || 0,
        positionSize: baseExec.positionSize || aiExec.positionSize || "—",
        riskReward: baseExec.riskReward || aiExec.riskReward || "—",
      };

      const aiThesis = {
        reasoning: parsed.reasoning as string,
        dimensionDetails: {
          etfFlow: { score: parsed.dimensions.etfFlow.score, detail: parsed.dimensions.etfFlow.detail },
          sentiment: { score: parsed.dimensions.sentiment.score, detail: parsed.dimensions.sentiment.detail },
          macro: { score: parsed.dimensions.macro.score, detail: parsed.dimensions.macro.detail },
          momentum: { score: parsed.dimensions.momentum.score, detail: parsed.dimensions.momentum.detail },
          treasury: { score: parsed.dimensions.treasury.score, detail: parsed.dimensions.treasury.detail },
        },
        execution: mergedExecution,
      };

      return jsonNoCache({
        baseSignal,
        aiThesis,
        aiError: null,
        sources: [...baseSources, "AI Thesis"],
        generated: Date.now(),
      });
    } catch (aiErr) {
      // AI failed but base signal is still valid
      const mapped = mapAIError(aiErr);
      console.error("/api/signals/analyze AI error:", mapped.code, mapped.message);
      return jsonNoCache({
        baseSignal,
        aiThesis: null,
        aiError: mapped,
        sources: baseSources,
        generated: Date.now(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signal analysis failed";
    console.error("/api/signals/analyze error:", msg);
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}

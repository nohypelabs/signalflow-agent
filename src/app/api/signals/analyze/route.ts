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
  getBTCPurchaseHistory,
  getBTCTreasuries,
  getMarketSnapshot,
  getNewsHot,
  getCurrencies,
} from "@/lib/sosovalue";
import type {
  BTCPurchaseHistory,
  BTCTreasuryCompany,
  CurrencyInfo,
  ETFSummaryItem,
  MacroEvent,
  MarketSnapshot,
  NewsItem,
} from "@/lib/sosovalue";
import { getTickers, getKlines, getOrderbook, getRecentTrades } from "@/lib/sodex";
import type { OrderBook } from "@/lib/sodex";
import type { SoDEXTrade } from "@/lib/types/trade";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { deserializeStrategyConfig } from "@/lib/strategy/config";
import { applyConfluenceStrategyPolicy, generateLiquidityFlowSignals } from "@/lib/strategy/policy-engine";
import { generateSignalsV2, type SignalV2 } from "@/lib/strategy/signal-engine-v2";
import type { Signal } from "@/lib/types/signal";
import { getPerpsTickers } from "@/lib/sodex-perps";
import type { SoDEXPerpsTicker } from "@/lib/sodex-perps";
import type { TradingType } from "@/lib/types/trading-type";

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
  const DATA_TIMEOUT = 8_000; // reduced for faster manual generate
  type CurrencySnapshot = {
    currency: CurrencyInfo | null;
    snap: MarketSnapshot | null;
  };
  type SoSoData = [
    Awaited<ReturnType<typeof getETFSummary>>,
    Awaited<ReturnType<typeof getMacroEvents>>,
    Awaited<ReturnType<typeof getBTCTreasuries>>,
    Awaited<ReturnType<typeof getNewsHot>>,
  ];

  let etfSummary: ETFSummaryItem[] = [];
  let macroEvents: MacroEvent[] = [];
  let btcTreasuries: BTCTreasuryCompany[] = [];
  let purchaseHistory: BTCPurchaseHistory[] = [];
  let newsList: NewsItem[] = [];
  let snap: MarketSnapshot | null = null;

  const currencyPromise: Promise<CurrencySnapshot> = getCurrencies(signal)
    .catch((): CurrencyInfo[] => [])
    .then((currencies) => {
      const currency = currencies.find((candidate) => (
        candidate.symbol.toLowerCase() === coin.toLowerCase()
      ));
      if (currency) {
        return withTimeout(
          getMarketSnapshot(currency.currency_id, signal).catch(() => null),
          DATA_TIMEOUT,
          "Market snapshot",
          signal
        ).then((snapshot) => ({ currency, snap: snapshot }));
      }
      return { currency: null, snap: null };
    });

  const fetchSoSoData = async (): Promise<SoSoData> => Promise.all([
    getETFSummary("BTC", "US", 5, signal).catch(() => []),
    getMacroEvents(signal).catch(() => []),
    getBTCTreasuries(signal).catch(() => []),
    getNewsHot(1, 20, signal).catch(() => ({ list: [], page: 1, page_size: 20, total: 0 })),
  ]);

  const soSoPromise = withTimeout(
    fetchSoSoData(),
    DATA_TIMEOUT,
    "SoSoValue data gathering",
    signal
  );

  const [[etf, macro, treas, hot], { snap: marketSnap }] = await Promise.all([
    soSoPromise,
    currencyPromise,
  ]);

  etfSummary = etf;
  macroEvents = macro;
  btcTreasuries = treas;
  newsList = hot.list;
  snap = marketSnap;

  const topTickers = btcTreasuries.slice(0, 5);
  purchaseHistory = (await Promise.all(
    topTickers.map((company) =>
      withTimeout(
        getBTCPurchaseHistory(company.ticker, 30, signal).catch(() => []),
        DATA_TIMEOUT,
        `BTC purchase history ${company.ticker}`,
        signal
      )
    )
  )).flat();

  // SoDEX ticker for live price + klines for TA engine — always needed for V3 base
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
  const ticker = tickers.find((candidate) => candidate.symbol === sodexSymbol);

  return {
    coin,
    price: ticker ? Number(ticker.lastPx) : snap?.price ?? 0,
    change24h: ticker ? ticker.changePct : snap?.change_pct_24h ?? 0,
    volume24h: ticker ? Number(ticker.quoteVolume) : snap?.turnover_24h ?? 0,
    etfSummary,
    news: newsList.slice(0, 10),
    macroEvents,
    btcTreasuries,
    purchaseHistory,
    snap,
    klines,
  };
}

async function fetchHyperliquidFundingRate(coin: string, signal?: AbortSignal): Promise<number | null> {
  try {
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
      signal,
    });
    if (!response.ok) return null;

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length < 2) return null;

    const universe = payload[0]?.universe ?? [];
    const contexts = payload[1] ?? [];
    const targetIndex = universe.findIndex((asset: { name?: string }) => asset?.name?.toUpperCase() === coin);
    if (targetIndex < 0) return null;

    const funding = Number((contexts[targetIndex] as { funding?: string } | undefined)?.funding);
    return Number.isFinite(funding) ? funding : null;
  } catch {
    return null;
  }
}

function toCompatibleSignal(signal: SignalV2): Signal {
  return {
    ...signal,
    action: signal.action.includes("LONG")
      ? "LONG"
      : signal.action.includes("SHORT")
        ? "SHORT"
        : "HOLD",
    actionV2: signal.action,
  };
}

// ── Build structured prompt ──────────────────────────────

function buildPrompt(
  data: Awaited<ReturnType<typeof gatherMarketData>>,
  baseSignal: Signal,
  strategyLabel: string,
  tradingType: TradingType,
) {
  const {
    coin,
    price,
    change24h,
    volume24h,
    etfSummary,
    news,
    macroEvents,
    btcTreasuries,
    purchaseHistory,
    snap,
  } = data;

  const actionAlias = baseSignal.action === "LONG" ? "BUY" : baseSignal.action === "SHORT" ? "SELL" : "HOLD";
  const factorLines = (baseSignal.factors ?? []).map((factor) =>
    `  - ${factor.name}: score=${factor.score}, weight=${(factor.weight * 100).toFixed(0)}%, detail=${factor.detail}`
  ).join("\n");
  const dimensionLines = Object.entries(baseSignal.dimensionDetails ?? {}).map(([key, detail]) =>
    `  - ${key}: ${detail.score}/100, ${detail.detail ?? "No detail"}`
  ).join("\n");
  const evidenceLines = baseSignal.setup?.evidence?.slice(0, 5).map((item) => `  - ${item}`).join("\n") || "  No setup evidence provided";
  const frameworkLines = baseSignal.frameworkApplication
    ? `  - Trading type: ${baseSignal.frameworkApplication.tradingType}\n  - Principles: ${baseSignal.frameworkApplication.principlesApplied.join(", ")}\n  - Note: ${baseSignal.frameworkApplication.note}`
    : "  - No custom framework override was attached";

  const etfLines = etfSummary.slice(0, 3).map((e) =>
    `  ${e.date}: net_inflow=$${(e.total_net_inflow / 1e6).toFixed(1)}M, AUM=$${(e.total_net_assets / 1e9).toFixed(1)}B, cum_inflow=$${(e.cum_net_inflow / 1e9).toFixed(1)}B`
  ).join("\n");

  const newsLines = news.slice(0, 8).map((n) => `  - ${n.title}`).join("\n");

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMacro = macroEvents.filter((e) => e.date === todayStr);
  const macroLines = todayMacro.flatMap((e) => e.events).slice(0, 5).map((e) => `  - ${e}`).join("\n") || "  No major macro events today";

  const treasuryLines = btcTreasuries.slice(0, 5).map((c) => `  - ${c.ticker} (${c.name})`).join("\n");
  const treasuryActivityLines = purchaseHistory.slice(0, 5).map((entry) =>
    `  - ${entry.date}: +${entry.btc_acq} BTC (holding ${entry.btc_holding} BTC, avg cost $${entry.avg_btc_cost})`
  ).join("\n");

  return `You are SignalFlow's AI analyst layer. The backend has already fused SoSoValue macro/news/ETF/treasury data with SoDEX TA and microstructure into a base signal. Review that fused output, confirm or challenge it, and produce a transparent analyst thesis for ${coin}.

## Active Backend Context
- Strategy engine: ${strategyLabel}
- Trading type: ${tradingType}
- Backend action: ${actionAlias}
- Backend confidence: ${baseSignal.confidence}%
- Backend regime: ${baseSignal.regime ?? "N/A"}
- Backend confluence: ${baseSignal.confluence ?? "N/A"}
- Backend sources: ${baseSignal.sources.join(", ")}
- Backend reasoning: ${baseSignal.reasoning}

## Backend Factor Stack
${factorLines || "  No backend factor details available"}

## Backend Dimension Stack
${dimensionLines || "  No backend dimension details available"}

## Backend Setup Evidence
${evidenceLines}

## Framework Application
${frameworkLines}

## ${coin} Price Data
- Price: $${price.toLocaleString()}
- 24h Change: ${change24h > 0 ? "+" : ""}${change24h.toFixed(2)}%
- 24h Volume: $${(volume24h / 1e6).toFixed(1)}M
- Snapshot price: ${snap?.price ? `$${snap.price.toLocaleString()}` : "Unavailable"}

## ETF Flow Data (Bitcoin ETFs)
${etfLines || "  No ETF data available"}

## Hot News Headlines
${newsLines || "  No news data available"}

## Macro Events (${todayStr})
${macroLines}

## BTC Treasury Holdings (Public Companies)
${treasuryLines || "  No treasury data available"}

## BTC Treasury Purchase Activity
${treasuryActivityLines || "  No recent treasury purchase activity available"}

## Instructions
Your job is to synthesize macro, ETF, treasury, price action, and backend TA/microstructure together. Do not ignore the backend signal stack. If you disagree with the backend, say so clearly in your reasoning and return the action you would personally take.

Analyze all 5 dimensions below. Score each 0-100. Use the raw market data plus the backend factor stack and setup evidence together.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "reasoning": "<2-4 sentence thesis synthesizing the data>",
  "dimensions": {
    "etfFlow": { "score": <0-100>, "detail": "<1 sentence specific to current ETF data>" },
    "sentiment": { "score": <0-100>, "detail": "<1 sentence about news sentiment>" },
    "macro": { "score": <0-100>, "detail": "<1 sentence about macro conditions>" },
    "momentum": { "score": <0-100>, "detail": "<1 sentence about price action and TA/microstructure>" },
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

    const includeAI = body.includeAI !== false; // default true for backward compat
    const tradingType: TradingType = body.tradingType ?? "intraday";
    const strategyConfig = deserializeStrategyConfig(body.strategy ?? null);
    const isLiquidity = strategyConfig.engine === "liquidityFlow";

    // Abort wiring for upstreams
    const ac = new AbortController();
    const reqSignal = (req as Request & { signal?: AbortSignal }).signal;
    if (reqSignal) reqSignal.addEventListener("abort", () => ac.abort(), { once: true });

    const marketData = await gatherMarketData(coin, ac.signal);

    // Always fetch micro for the coin (orderbook, trades, perps) so V3 can use it
    const sodexSymbol = pairToSodexSymbol(`${coin}/USDC`) || `v${coin.toUpperCase()}_vUSDC`;
    const [orderbook, recentTradesRaw, perpsList, hlFundingRate] = await Promise.all([
      getOrderbook(sodexSymbol).catch(() => null as OrderBook | null),
      getRecentTrades(sodexSymbol, 80).catch(() => [] as SoDEXTrade[]),
      getPerpsTickers().catch(() => [] as SoDEXPerpsTicker[]),
      fetchHyperliquidFundingRate(coin, ac.signal),
    ]);
    const perpsTicker = perpsList.find((t: SoDEXPerpsTicker) => t.symbol?.toUpperCase().startsWith(coin)) || null;
    const recentTrades = recentTradesRaw;

    let baseSignal: Signal | null = null;
    const klinesMap = new Map([[coin, marketData.klines]]);
    const orderbooksMap = orderbook ? new Map([[coin, orderbook]]) : new Map<string, OrderBook>();
    const recentTradesMap = recentTrades.length > 0 ? new Map([[coin, recentTrades]]) : new Map<string, SoDEXTrade[]>();
    const perpsTickersMap = perpsTicker ? new Map([[coin, perpsTicker]]) : new Map<string, SoDEXPerpsTicker>();
    const hlFundingRates = hlFundingRate === null ? new Map<string, number>() : new Map([[coin, hlFundingRate]]);

    if (isLiquidity) {
      const liqSignals = generateLiquidityFlowSignals({
        pairs: [`${coin}/USDC`],
        klinesMap,
        orderbooks: orderbooksMap,
        config: strategyConfig,
        recentTrades: recentTradesMap,
        perpsTickers: perpsTickersMap,
        hlFundingRates,
      });
      baseSignal = liqSignals[0] ?? null;
    } else {
      const snapshots = marketData.snap ? new Map([[coin, marketData.snap]]) : new Map<string, MarketSnapshot>();
      const v3Signals = generateSignalsV2({
        pairs: [`${coin}/USDC`],
        klinesMap,
        news: marketData.news,
        etfSummary: marketData.etfSummary,
        macroEvents: marketData.macroEvents,
        btcTreasuries: marketData.btcTreasuries,
        purchaseHistory: marketData.purchaseHistory,
        snapshots,
        orderbooks: orderbooksMap,
        recentTrades: recentTradesMap,
        perpsTickers: perpsTickersMap,
        hlFundingRates,
        tradingType,
        typeProfiles: strategyConfig.typeProfiles,
      });
      const policySignals = applyConfluenceStrategyPolicy(v3Signals.map(toCompatibleSignal), strategyConfig);
      baseSignal = policySignals[0] ?? null;
    }

    if (!baseSignal) {
      return jsonNoCache(
        { error: "Insufficient market data for signal generation. SoDEX klines may be unavailable." },
        { status: 422 },
      );
    }

    const baseSources = baseSignal.sources;

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
      const prompt = buildPrompt(
        marketData,
        baseSignal,
        strategyConfig.engine === "liquidityFlow" ? "Liquidity Flow" : "Confluence V3",
        tradingType,
      );

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
      if (
        typeof parsed?.action !== "string"
        || typeof parsed?.confidence !== "number"
        || !parsed?.dimensions
        || !parsed?.execution
      ) {
        throw new Error("AI response missing required fields");
      }

      // Override AI's TP/SL with signal engine's ATR-based execution.
      // The AI is good at reasoning but bad at precise price levels —
      // the signal engine computes proper TP/SL from ATR, regime, and structure.
      const baseExec = baseSignal.execution;
      const aiExec = parsed.execution;
      const mergedExecution = {
        orderType: baseExec.orderType ?? aiExec.orderType ?? "LIMIT",
        entry: baseExec.entry ?? aiExec.entry ?? marketData.price,
        takeProfit: baseExec.takeProfit ?? aiExec.takeProfit ?? 0,
        stopLoss: baseExec.stopLoss ?? aiExec.stopLoss ?? 0,
        positionSize: baseExec.positionSize ?? aiExec.positionSize ?? "—",
        riskReward: baseExec.riskReward ?? aiExec.riskReward ?? "—",
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
    // Sanitize error message — don't leak internal details to client
    const internalMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/signals/analyze error:", internalMsg);
    return jsonNoCache(
      { error: "Signal analysis failed. Please try again." },
      { status: 502 },
    );
  }
}

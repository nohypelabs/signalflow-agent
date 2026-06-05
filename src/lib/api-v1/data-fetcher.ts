/**
 * Aggregated data fetcher for the V1 API.
 * Reuses existing data fetching functions from sodex.ts, sosovalue.ts, signal-engine-v2.ts.
 * Each module fetches independently so failures don't cascade.
 */

import {
  getETFSummary,
  getMacroEvents,
  getBTCTreasuries,
  getBTCPurchaseHistory,
  getMarketSnapshot,
  getIndexSnapshot,
  getNewsHot,
  getCurrencies,
} from "@/lib/sosovalue";
import type { ETFSummaryItem, MarketSnapshot, NewsItem, MacroEvent, BTCPurchaseHistory } from "@/lib/sosovalue";
import { getKlines as getSodexKlines, getOrderbook, getTickers } from "@/lib/sodex";
import type { OrderBook, SoDEXKline } from "@/lib/sodex-types";
import { pairToSodexSymbol, SUPPORTED_SIGNAL_PAIRS } from "@/lib/pair-map";
import { generateSignalsV2 } from "@/lib/strategy/signal-engine-v2";
import {
  scoreETF,
  scoreSentiment,
  scoreMacro,
  scoreMomentum,
  scoreTreasury,
  dynamicWeightScore,
} from "@/lib/strategy/signal-engine";
import {
  applyConfluenceStrategyPolicy,
  generateLiquidityFlowSignals,
  liquidityDimensionsFromSignals,
} from "@/lib/strategy/policy-engine";
import {
  deserializeStrategyConfig,
} from "@/lib/strategy/config";
import type { Signal } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
import type { IncludeModule } from "@/lib/api-v1/zod-schemas";

// Unused imports removed — type-only used in function signatures

// ─── Timeout helper ───

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Signal Generation ───

export interface SignalModuleResult {
  updated: number;
  engine: string;
  signals: Signal[];
  sources: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  overall: Record<string, number>;
  weights: Record<string, unknown>;
  capped: Record<string, unknown>;
}

export async function fetchSignals(
  tradingType?: TradingType,
  engine?: string,
): Promise<SignalModuleResult> {
  const strategyConfig = deserializeStrategyConfig(null);

  // Fast path: liquidity flow
  if (engine === "liquidityFlow") {
    return fetchLiquidityFlowSignals(strategyConfig);
  }

  // Default: confluence V2
  const [currencies, etfSummary, macroEvents, btcTreasuries, hotNews] = await Promise.all([
    getCurrencies().catch(() => []),
    getETFSummary("BTC", "US", 5).catch(() => []),
    getMacroEvents().catch(() => []),
    getBTCTreasuries().catch(() => []),
    getNewsHot(1, 20).catch(() => ({ list: [], page: 1, page_size: 20, total: 0 })),
  ]);

  const btc = currencies.find((c) => c.symbol.toLowerCase() === "btc");
  const eth = currencies.find((c) => c.symbol.toLowerCase() === "eth");
  const sol = currencies.find((c) => c.symbol.toLowerCase() === "sol");
  const newsList = "list" in hotNews ? hotNews.list : [];

  const topTickers = (btcTreasuries as { ticker: string; name: string }[]).slice(0, 5);
  const [purchaseHistory, btcIndex, ethIndex] = await Promise.all([
    Promise.all(topTickers.map((t) =>
      withTimeout(getBTCPurchaseHistory(t.ticker, 30).catch(() => []), 5_000, [] as BTCPurchaseHistory[]),
    )).then((r) => r.flat()),
    withTimeout(getIndexSnapshot("BTC").catch(() => null), 5_000, null),
    withTimeout(getIndexSnapshot("ETH").catch(() => null), 5_000, null),
  ]);

  const snapshotCoins = [btc, eth, sol].filter(Boolean);
  const snapshotResults = await Promise.all(
    snapshotCoins.map((c) =>
      withTimeout(
        getMarketSnapshot(c!.currency_id).then((s) => ({ id: c!.currency_id, s })),
        5_000, null,
      ).catch(() => null),
    ),
  );
  const snapshots: Record<string, MarketSnapshot> = {};
  for (const r of snapshotResults) {
    if (r) snapshots[r.id] = r.s;
  }

  // Fetch SoDEX klines
  const klinesMap = new Map<string, SoDEXKline[]>();
  const klinesMap4H = new Map<string, SoDEXKline[]>();
  const klinesMap1D = new Map<string, SoDEXKline[]>();

  await Promise.all(
    SUPPORTED_SIGNAL_PAIRS.flatMap((pair) => {
      const base = pair.split("/")[0];
      const symbol = pairToSodexSymbol(pair);
      if (!symbol) return [];
      return [
        getSodexKlines(symbol, "1h", 250).catch(() => []).then((k) => {
          if (k.length > 0) { k.sort((a, b) => a.t - b.t); klinesMap.set(base, k); }
        }),
        getSodexKlines(symbol, "4h", 120).catch(() => []).then((k) => {
          if (k.length > 0) { k.sort((a, b) => a.t - b.t); klinesMap4H.set(base, k); }
        }),
        getSodexKlines(symbol, "1d", 60).catch(() => []).then((k) => {
          if (k.length > 0) { k.sort((a, b) => a.t - b.t); klinesMap1D.set(base, k); }
        }),
      ];
    }),
  );

  const snapshotMap = new Map<string, MarketSnapshot>();
  if (btc && snapshots[btc.currency_id]) snapshotMap.set("BTC", snapshots[btc.currency_id]);
  if (eth && snapshots[eth.currency_id]) snapshotMap.set("ETH", snapshots[eth.currency_id]);
  if (sol && snapshots[sol.currency_id]) snapshotMap.set("SOL", snapshots[sol.currency_id]);

  const v2Signals = generateSignalsV2({
    pairs: SUPPORTED_SIGNAL_PAIRS,
    klinesMap,
    news: newsList as NewsItem[],
    etfSummary: etfSummary as ETFSummaryItem[],
    macroEvents: macroEvents as MacroEvent[],
    btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
    purchaseHistory,
    snapshots: snapshotMap,
    tradingType: tradingType ?? undefined,
    typeProfiles: strategyConfig.typeProfiles,
  });

  const v2Signals4H = generateSignalsV2({
    pairs: SUPPORTED_SIGNAL_PAIRS, klinesMap: klinesMap4H,
    news: newsList as NewsItem[], etfSummary: etfSummary as ETFSummaryItem[],
    macroEvents: macroEvents as MacroEvent[],
    btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
    purchaseHistory, snapshots: snapshotMap,
    tradingType: tradingType ?? undefined, typeProfiles: strategyConfig.typeProfiles,
  });

  const v2Signals1D = generateSignalsV2({
    pairs: SUPPORTED_SIGNAL_PAIRS, klinesMap: klinesMap1D,
    news: newsList as NewsItem[], etfSummary: etfSummary as ETFSummaryItem[],
    macroEvents: macroEvents as MacroEvent[],
    btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
    purchaseHistory, snapshots: snapshotMap,
    tradingType: tradingType ?? undefined, typeProfiles: strategyConfig.typeProfiles,
  });

  const signal4HMap = new Map(v2Signals4H.map((s) => [s.pair.split("/")[0], s]));
  const signal1DMap = new Map(v2Signals1D.map((s) => [s.pair.split("/")[0], s]));

  function getDirection(action: string): "bullish" | "bearish" | "neutral" {
    if (action === "STRONG_LONG" || action === "LONG" || action === "WEAK_LONG") return "bullish";
    if (action === "STRONG_SHORT" || action === "SHORT" || action === "WEAK_SHORT") return "bearish";
    return "neutral";
  }

  const multiTFResults = new Map<string, { score: number; details: { tf: string; action: string; direction: string; confidence: number }[] }>();
  for (const signal of v2Signals) {
    const base = signal.pair.split("/")[0];
    const s4H = signal4HMap.get(base);
    const s1D = signal1DMap.get(base);
    const primaryDir = getDirection(signal.action);
    const dir4H = s4H ? getDirection(s4H.action) : "neutral";
    const dir1D = s1D ? getDirection(s1D.action) : "neutral";

    const directions = [primaryDir, dir4H, dir1D].filter((d) => d !== "neutral");
    let score = 30;
    if (directions.length === 3) {
      const bullish = directions.filter((d) => d === "bullish").length;
      const bearish = directions.filter((d) => d === "bearish").length;
      score = (bullish === 3 || bearish === 3) ? 95 : (bullish === 2 || bearish === 2) ? 70 : 30;
    } else if (directions.length === 2) {
      score = directions[0] === directions[1] ? 80 : 40;
    }
    if (signal.confidence >= 80 && score >= 70) score = Math.min(100, score + 5);

    multiTFResults.set(base, {
      score,
      details: [
        { tf: "1H", action: signal.action, direction: primaryDir, confidence: signal.confidence },
        ...(s4H ? [{ tf: "4H", action: s4H.action, direction: dir4H, confidence: s4H.confidence }] : []),
        ...(s1D ? [{ tf: "1D", action: s1D.action, direction: dir1D, confidence: s1D.confidence }] : []),
      ],
    });
  }

  const baseSignals: Signal[] = v2Signals.map((s) => ({
    ...s,
    action: s.action === "STRONG_LONG" || s.action === "LONG" || s.action === "WEAK_LONG"
      ? "LONG" as const
      : s.action === "STRONG_SHORT" || s.action === "SHORT" || s.action === "WEAK_SHORT"
        ? "SHORT" as const : "HOLD" as const,
    actionV2: s.action,
    regime: s.regime,
    factors: s.factors,
    confluence: s.confluence,
    tradingType: s.tradingType,
    setup: s.setup,
    quality: s.quality,
    multiTF: multiTFResults.get(s.pair.split("/")[0]),
  }));
  const signals = applyConfluenceStrategyPolicy(baseSignals, strategyConfig);

  // Build dimensions
  function buildDimensions(snap: MarketSnapshot | undefined) {
    return {
      etfFlow: scoreETF(etfSummary as ETFSummaryItem[]),
      sentiment: scoreSentiment(newsList as NewsItem[]),
      macro: scoreMacro(macroEvents as MacroEvent[]),
      momentum: snap ? scoreMomentum(snap) : { score: 50, detail: "No price data" },
      treasury: scoreTreasury(btcTreasuries as { ticker: string; name: string }[], purchaseHistory),
    };
  }

  const btcDims = buildDimensions(btc ? snapshots[btc.currency_id] : undefined);
  const ethDims = buildDimensions(eth ? snapshots[eth.currency_id] : undefined);
  const solDims = buildDimensions(sol ? snapshots[sol.currency_id] : undefined);
  const btcWeighted = dynamicWeightScore(btcDims);
  const ethWeighted = dynamicWeightScore(ethDims);
  const solWeighted = dynamicWeightScore(solDims);

  return {
    updated: Date.now(),
    engine: "v2",
    signals,
    sources: {
      etf: (etfSummary as ETFSummaryItem[]).length > 0,
      macro: (macroEvents as MacroEvent[]).length > 0,
      treasuries: (btcTreasuries as { ticker: string; name: string }[]).length > 0,
      news: (newsList as NewsItem[]).length > 0,
      snapshots: Object.keys(snapshots).length,
      sodexKlines: klinesMap.size,
    },
    dimensions: { BTC: btcDims, ETH: ethDims, SOL: solDims },
    overall: { BTC: btcWeighted.overall, ETH: ethWeighted.overall, SOL: solWeighted.overall },
    weights: { BTC: btcWeighted.weights, ETH: ethWeighted.weights, SOL: solWeighted.weights },
    capped: { BTC: btcWeighted.capped, ETH: ethWeighted.capped, SOL: solWeighted.capped },
  };
}

async function fetchLiquidityFlowSignals(
  strategyConfig: ReturnType<typeof deserializeStrategyConfig>,
): Promise<SignalModuleResult> {
  const klinesMap = new Map<string, SoDEXKline[]>();
  const orderbooks = new Map<string, OrderBook>();

  await Promise.all(
    SUPPORTED_SIGNAL_PAIRS.map(async (pair) => {
      const base = pair.split("/")[0];
      const symbol = pairToSodexSymbol(pair);
      if (!symbol) return;
      const [klines, orderbook] = await Promise.all([
        withTimeout(getSodexKlines(symbol, "1h", 120).catch(() => []), 8_000, [] as SoDEXKline[]),
        withTimeout(getOrderbook(symbol, 5).catch(() => null), 5_000, null),
      ]);
      if (klines.length > 0) { klines.sort((a, b) => a.t - b.t); klinesMap.set(base, klines); }
      if (orderbook) orderbooks.set(base, orderbook);
    }),
  );

  const signals = generateLiquidityFlowSignals({ pairs: SUPPORTED_SIGNAL_PAIRS, klinesMap, orderbooks, config: strategyConfig });
  const dimensions = liquidityDimensionsFromSignals(signals);

  return {
    updated: Date.now(),
    engine: "liquidity-flow",
    signals,
    sources: { sodexKlines: klinesMap.size, orderbooks: orderbooks.size },
    dimensions,
    overall: Object.fromEntries(signals.map((s) => [s.pair.split("/")[0], s.confidence])),
    weights: Object.fromEntries(signals.map((s) => [s.pair.split("/")[0], { momentum: 100 }])),
    capped: {},
  };
}

// ─── Market Data ───

export async function fetchMarketTickers(symbol?: string) {
  return getTickers(symbol);
}

export async function fetchMarketKlines(symbol: string, interval: string, limit: number) {
  return getSodexKlines(symbol, interval, limit);
}

export async function fetchOrderbook(symbol: string, limit: number) {
  return getOrderbook(symbol, limit);
}

// ─── External Data ───

export async function fetchEtfFlow(symbol?: string, country?: string, limit?: number) {
  return getETFSummary(symbol ?? "BTC", country ?? "US", limit ?? 30);
}

export async function fetchMacroEvents() {
  return getMacroEvents();
}

export async function fetchNews(page: number, pageSize: number) {
  return getNewsHot(page, pageSize);
}

export async function fetchPerformance() {
  const currencies = await getCurrencies().catch(() => []);
  const coins = ["btc", "eth", "sol"];
  const results: Array<{ symbol: string; price: number; change24h: number }> = [];

  for (const coin of coins) {
    const c = currencies.find((cu) => cu.symbol.toLowerCase() === coin);
    if (c) {
      const snap = await getMarketSnapshot(c.currency_id).catch(() => null);
      if (snap) {
        results.push({
          symbol: coin.toUpperCase(),
          price: snap.price ?? 0,
          change24h: snap.change_pct_24h ?? 0,
        });
      }
    }
  }

  return results;
}

// ─── System Data Aggregator ───

export interface SystemDataResult {
  [module: string]: unknown;
}

export async function fetchSystemData(
  modules: IncludeModule[],
): Promise<SystemDataResult> {
  const result: SystemDataResult = {};

  const fetchers: Array<[IncludeModule, () => Promise<unknown>]> = [];

  if (modules.includes("signals")) {
    fetchers.push(["signals", () => fetchSignals().then((r) => ({ signals: r.signals, dimensions: r.dimensions, overall: r.overall }))]);
  }
  if (modules.includes("market")) {
    fetchers.push(["market", () => fetchMarketTickers().then((t) => ({ tickers: t }))]);
  }
  if (modules.includes("etf")) {
    fetchers.push(["etf", () => fetchEtfFlow()]);
  }
  if (modules.includes("macro")) {
    fetchers.push(["macro", () => fetchMacroEvents()]);
  }
  if (modules.includes("news")) {
    fetchers.push(["news", () => fetchNews(1, 10)]);
  }
  if (modules.includes("performance")) {
    fetchers.push(["performance", () => fetchPerformance()]);
  }
  if (modules.includes("funding")) {
    fetchers.push(["funding", () => import("@/lib/funding-rate").then((m) => m.fetchFundingRates())]);
  }

  const settled = await Promise.allSettled(
    fetchers.map(async ([module, fetcher]) => {
      const data = await fetcher();
      return { module, data };
    }),
  );

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      result[outcome.value.module] = outcome.value.data;
    } else {
      result[fetchers.find((f) => f[0] === (outcome as PromiseRejectedResult).reason?.module)?.[0] ?? "unknown"] = {
        error: "Failed to fetch",
      };
    }
  }

  return result;
}

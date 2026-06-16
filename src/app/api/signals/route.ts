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
import { getKlines as getSodexKlines, getOrderbook, getRecentTrades } from "@/lib/sodex";
import type { OrderBook, SoDEXKline } from "@/lib/sodex-types";
import type { SoDEXTrade } from "@/lib/types/trade";
import { getPerpsTickers } from "@/lib/sodex-perps";
import type { SoDEXPerpsTicker } from "@/lib/sodex-perps";
import { pairToSodexSymbol, SUPPORTED_SIGNAL_PAIRS } from "@/lib/pair-map";
import { generateSignalsV2 } from "@/lib/strategy/signal-engine-v2";
import {
  deserializeStrategyConfig,
  strategyConfigKey,
  toActiveStrategySummary,
} from "@/lib/strategy/config";
import {
  applyConfluenceStrategyPolicy,
  generateLiquidityFlowSignals,
  liquidityDimensionsFromSignals,
} from "@/lib/strategy/policy-engine";
import {
  scoreETF,
  scoreSentiment,
  scoreMacro,
  scoreMomentum,
  scoreTreasury,
  dynamicWeightScore,
} from "@/lib/strategy/signal-engine";
import type { Signal } from "@/lib/types/signal";
import { jsonNoCache } from "@/lib/api/no-cache";
import type { TradingType } from "@/lib/types/trading-type";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// ── Pairs to generate signals for ────────────────────────

const SIGNAL_PAIRS = SUPPORTED_SIGNAL_PAIRS;

// ── Trading Type → Primary Timeframe ─────────────────────

const PRIMARY_TF: Record<TradingType, { interval: string; limit: number; label: string }> = {
  scalping: { interval: "15m", limit: 250, label: "15M" },
  intraday: { interval: "1h", limit: 250, label: "1H" },
  swing: { interval: "4h", limit: 250, label: "4H" },
  position: { interval: "1d", limit: 250, label: "1D" },
};

const CONFLUENCE_TF: Record<TradingType, Array<{ interval: string; limit: number; label: string }>> = {
  scalping: [
    { interval: "1h", limit: 120, label: "1H" },
    { interval: "4h", limit: 60, label: "4H" },
  ],
  intraday: [
    { interval: "4h", limit: 120, label: "4H" },
    { interval: "1d", limit: 60, label: "1D" },
  ],
  swing: [
    { interval: "1h", limit: 120, label: "1H" },
    { interval: "1d", limit: 120, label: "1D" },
  ],
  position: [
    { interval: "4h", limit: 120, label: "4H" },
    { interval: "1h", limit: 120, label: "1H" },
  ],
};

// ── In-memory cache ──────────────────────────────────────

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_MS = 5 * 60_000;
const LIQUIDITY_CACHE_MS = 5_000;
const MAX_CACHE_ENTRIES = 50;

function setCachedResult(key: string, data: unknown) {
  const now = Date.now();
  for (const [cachedKey, entry] of cache) {
    if (now - entry.ts >= CACHE_MS) cache.delete(cachedKey);
  }
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = [...cache.entries()]
      .sort(([, a], [, b]) => a.ts - b.ts)[0]?.[0];
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, ts: now });
}

// ── Fetch with timeout + abort ───────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  const timeoutP = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));

  return Promise.race([
    promise.finally(() => {
      clearTimeout(t);
      signal?.removeEventListener("abort", onAbort);
    }),
    timeoutP.finally(() => {
      clearTimeout(t);
      signal?.removeEventListener("abort", onAbort);
    }),
  ]);
}

// ── Route handler ─────────────────────────────────────────

export async function GET(request: Request) {
  const limited = checkRateLimit(request, "signals");
  if (limited) return limited;

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const tradingType: TradingType | null =
    typeParam && ["scalping", "intraday", "swing", "position"].includes(typeParam)
      ? typeParam as TradingType
      : null;
  const strategyConfig = deserializeStrategyConfig(url.searchParams.get("strategy"));
  const cacheKey = `${tradingType ?? "all"}:${strategyConfigKey(strategyConfig)}`;
  const cached = cache.get(cacheKey);
  const cacheTtl = strategyConfig.engine === "liquidityFlow" ? LIQUIDITY_CACHE_MS : CACHE_MS;

  if (cached && Date.now() - cached.ts < cacheTtl) {
    return jsonNoCache(cached.data);
  }

  const ac = new AbortController();
  const reqSignal = (request as unknown as { signal?: AbortSignal }).signal;
  if (reqSignal) {
    reqSignal.addEventListener("abort", () => ac.abort(), { once: true });
  }

  if (cached) {
    const age = Date.now() - cached.ts;
    if (age >= cacheTtl) {
      setTimeout(() => cache.delete(cacheKey), 4000);
    }
    return jsonNoCache(cached.data);
  }

  try {
    logRecalc("🔄", `Signal generation started — ${tradingType ?? "all"} mode, ${strategyConfig.engine} engine`);

    // ── LIQUIDITY FLOW PATH (legacy separate generator) ───────────────────────────────
    if (strategyConfig.engine === "liquidityFlow") {
      logData("📊", "Fetching klines, orderbook, and trades for all pairs...");
      const klinesMap = new Map<string, SoDEXKline[]>();
      const orderbooks = new Map<string, OrderBook>();
      const tradesMap = new Map<string, SoDEXTrade[]>();

      await Promise.all(
        SIGNAL_PAIRS.map(async (pair) => {
          const base = pair.split("/")[0];
          const symbol = pairToSodexSymbol(pair);
          if (!symbol) return;

          const [klines, orderbook, trades] = await Promise.all([
            withTimeout(
              getSodexKlines(symbol, "1h", 120).catch(() => []),
              8_000,
              [] as SoDEXKline[],
              ac.signal,
            ),
            withTimeout(
              getOrderbook(symbol, 20).catch(() => null),
              5_000,
              null,
              ac.signal,
            ),
            withTimeout(
              getRecentTrades(symbol, 200).catch(() => []),
              5_000,
              [] as SoDEXTrade[],
              ac.signal,
            ),
          ]);

          if (klines.length > 0) {
            klines.sort((a, b) => a.t - b.t);
            klinesMap.set(base, klines);
          }
          if (orderbook) orderbooks.set(base, orderbook);
          if (trades.length > 0) tradesMap.set(base, trades);
        }),
      );

      // Fetch perps tickers for funding rate + OI
      const perpsTickersMap = new Map<string, SoDEXPerpsTicker>();
      const hlFundingRates = new Map<string, number>();
      try {
        const perpsTickers = await withTimeout(
          getPerpsTickers().catch(() => []),
          5_000,
          [] as SoDEXPerpsTicker[],
          ac.signal,
        );
        for (const ticker of perpsTickers) {
          const base = ticker.symbol.split("-")[0]?.toUpperCase();
          if (base) perpsTickersMap.set(base, ticker);
        }

        // Hyperliquid cross-venue funding comparison
        try {
          const hlResponse = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "metaAndAssetCtxs" }),
            cache: "no-store",
            signal: ac.signal,
          });
          if (hlResponse.ok) {
            const hlData = await hlResponse.json();
            if (Array.isArray(hlData) && hlData.length >= 2) {
              const universe = hlData[0]?.universe ?? [];
              const contexts = hlData[1] ?? [];
              for (let i = 0; i < universe.length; i++) {
                const asset = universe[i] as { name?: string };
                const ctx = contexts[i] as { funding?: string };
                if (asset?.name && ctx?.funding) {
                  hlFundingRates.set(asset.name.toUpperCase(), Number(ctx.funding));
                }
              }
            }
          }
        } catch { /* Hyperliquid optional */ }
      } catch { /* Perps optional */ }

      const signals = generateLiquidityFlowSignals({
        pairs: SIGNAL_PAIRS,
        klinesMap,
        orderbooks,
        config: strategyConfig,
        perpsTickers: perpsTickersMap,
        recentTrades: tradesMap,
        hlFundingRates,
      });
      const dimensions = liquidityDimensionsFromSignals(signals);
      const overall = Object.fromEntries(signals.map((s) => [
        s.pair.split("/")[0],
        s.confidence,
      ]));
      const weights = Object.fromEntries(signals.map((s) => [
        s.pair.split("/")[0],
        { etfFlow: 0, sentiment: 0, macro: 0, momentum: 100, treasury: 0 },
      ]));
      const result = {
        updated: Date.now(),
        engine: "liquidity-flow",
        strategy: toActiveStrategySummary(strategyConfig),
        signals,
        sources: {
          etf: false,
          macro: false,
          treasuries: false,
          treasuryActivity: false,
          news: false,
          snapshots: 0,
          sodexKlines: klinesMap.size,
          orderbooks: orderbooks.size,
          trades: tradesMap.size,
          perps: perpsTickersMap.size,
          hyperliquid: hlFundingRates.size,
        },
        indices: {},
        dimensions,
        overall,
        weights,
        capped: {},
      };

      setCachedResult(cacheKey, result);
      return jsonNoCache(result);
    }

    // ── CONFLUENCE V3 PATH (unified: 5 TA factors + ORDER_FLOW + DEPTH + FUNDING micro) ────────────────────────────────

    logData("📰", "Fetching SoSoValue data (ETF, macro, news, treasuries)...");
    const [currencies, etfSummary, macroEvents, btcTreasuries, hotNews] = await Promise.all([
      getCurrencies(ac.signal).catch(() => []),
      getETFSummary("BTC", "US", 5, ac.signal).catch(() => []),
      getMacroEvents(ac.signal).catch(() => []),
      getBTCTreasuries(ac.signal).catch(() => []),
      getNewsHot(1, 20, ac.signal).catch(() => ({ list: [], page: 1, page_size: 20, total: 0 })),
    ]);

    const btc = currencies.find((c) => c.symbol.toLowerCase() === "btc");
    const eth = currencies.find((c) => c.symbol.toLowerCase() === "eth");
    const sol = currencies.find((c) => c.symbol.toLowerCase() === "sol");

    const newsList = "list" in hotNews ? hotNews.list : [];

    logData("✅", `SoSoValue data loaded: ${etfSummary.length} ETF, ${macroEvents.length} macro, ${newsList.length} news`);
    logData("📊", `Market snapshot: BTC=${btc ? "✓" : "✗"} ETH=${eth ? "✓" : "✗"} SOL=${sol ? "✓" : "✗"}`);

    const topTickers = (btcTreasuries as { ticker: string; name: string }[]).slice(0, 5);
    const [purchaseHistory, btcIndex, ethIndex] = await Promise.all([
      Promise.all(
        topTickers.map((t) =>
          withTimeout(
            getBTCPurchaseHistory(t.ticker, 30, ac.signal).catch(() => []),
            5_000,
            [] as BTCPurchaseHistory[],
            ac.signal,
          ),
        ),
      ).then((results) => results.flat()),
      withTimeout(getIndexSnapshot("BTC", ac.signal).catch(() => null), 5_000, null, ac.signal),
      withTimeout(getIndexSnapshot("ETH", ac.signal).catch(() => null), 5_000, null, ac.signal),
    ]);

    const snapshotCoins = [btc, eth, sol].filter(Boolean);
    const snapshotResults = await Promise.all(
      snapshotCoins.map((c) =>
        withTimeout(
          getMarketSnapshot(c!.currency_id, ac.signal).then((s) => ({ id: c!.currency_id, s })),
          5_000,
          null,
          ac.signal,
        ).catch(() => null),
      ),
    );
    const snapshots: Record<string, MarketSnapshot> = {};
    for (const r of snapshotResults) {
      if (r) snapshots[r.id] = r.s;
    }

    // ── Primary TF klines (trading-type-aware) ───────────
    const effectiveType = tradingType ?? "intraday";
    const primaryTF = PRIMARY_TF[effectiveType];
    const confluenceTFs = CONFLUENCE_TF[effectiveType];

    const klinesMap = new Map<string, SoDEXKline[]>();
    await Promise.all(
      SIGNAL_PAIRS.map(async (pair) => {
        const base = pair.split("/")[0];
        const symbol = pairToSodexSymbol(pair);
        if (!symbol) return;
        const klines = await withTimeout(
          getSodexKlines(symbol, primaryTF.interval, primaryTF.limit).catch(() => []),
          8_000,
          [] as SoDEXKline[],
          ac.signal,
        );
        if (klines.length > 0) {
          klines.sort((a, b) => a.t - b.t);
          klinesMap.set(base, klines);
        }
      }),
    );

    // ── Confluence TF klines ─────────────────────────────
    const confluenceKlinesMaps = confluenceTFs.map(() => new Map<string, SoDEXKline[]>());

    await Promise.all(
      SIGNAL_PAIRS.flatMap((pair) => {
        const base = pair.split("/")[0];
        const symbol = pairToSodexSymbol(pair);
        if (!symbol) return [];
        return confluenceTFs.map(async (tf, idx) => {
          const klines = await withTimeout(
            getSodexKlines(symbol, tf.interval, tf.limit).catch(() => []),
            8_000,
            [] as SoDEXKline[],
            ac.signal,
          );
          if (klines.length > 0) {
            klines.sort((a, b) => a.t - b.t);
            confluenceKlinesMaps[idx].set(base, klines);
          }
        });
      }),
    );

    // Build snapshots map
    const snapshotMap = new Map<string, MarketSnapshot>();
    if (btc && snapshots[btc.currency_id]) snapshotMap.set("BTC", snapshots[btc.currency_id]);
    if (eth && snapshots[eth.currency_id]) snapshotMap.set("ETH", snapshots[eth.currency_id]);
    if (sol && snapshots[sol.currency_id]) snapshotMap.set("SOL", snapshots[sol.currency_id]);

    // ── v3 unified: always fetch microstructure (orderbook/flow/funding) for main confluence path ──
    // These are the leading, fastest signals in crypto. Fused so default engine emits more actionable decisions.
    const orderbooks = new Map<string, OrderBook>();
    const recentTrades = new Map<string, SoDEXTrade[]>();
    const perpsTickersMap = new Map<string, SoDEXPerpsTicker>();
    const hlFundingRates = new Map<string, number>();

    await Promise.all(
      SIGNAL_PAIRS.map(async (pair) => {
        const base = pair.split("/")[0];
        const symbol = pairToSodexSymbol(pair);
        if (!symbol) return;
        const [ob, trades] = await Promise.all([
          withTimeout(getOrderbook(symbol, 20).catch(() => null), 4_000, null as OrderBook | null, ac.signal),
          withTimeout(getRecentTrades(symbol, 150).catch(() => []), 4_000, [] as SoDEXTrade[], ac.signal),
        ]);
        if (ob) orderbooks.set(base, ob);
        if (trades.length) recentTrades.set(base, trades);
      }),
    );

    try {
      const perpsTickers = await withTimeout(getPerpsTickers().catch(() => []), 4_000, [] as SoDEXPerpsTicker[], ac.signal);
      for (const t of perpsTickers) {
        const base = t.symbol.split("-")[0]?.toUpperCase();
        if (base) perpsTickersMap.set(base, t);
      }
      // Optional HL divergence (best effort)
      const hlResp = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }), cache: "no-store", signal: ac.signal }).catch(() => null);
      if (hlResp?.ok) {
        const hlData = await hlResp.json().catch(() => null);
        if (Array.isArray(hlData) && hlData.length >= 2) {
          const universe = hlData[0]?.universe ?? [];
          const contexts = hlData[1] ?? [];
          for (let i = 0; i < universe.length; i++) {
            const asset = universe[i] as { name?: string };
            const ctx = contexts[i] as { funding?: string };
            if (asset?.name && ctx?.funding) hlFundingRates.set(asset.name.toUpperCase(), Number(ctx.funding));
          }
        }
      }
    } catch {}

    // ── Generate signals on PRIMARY TF (now with micro fused) ───────────────────
    const v2Signals = generateSignalsV2({
      pairs: SIGNAL_PAIRS,
      klinesMap,
      news: newsList as NewsItem[],
      etfSummary: etfSummary as ETFSummaryItem[],
      macroEvents: macroEvents as MacroEvent[],
      btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
      purchaseHistory,
      snapshots: snapshotMap,
      tradingType: tradingType ?? undefined,
      typeProfiles: strategyConfig.typeProfiles,
      // Pass micro maps — builder will pick per-pair inside the loop
      orderbooks,
      recentTrades,
      perpsTickers: perpsTickersMap,
      hlFundingRates,
    });

    // ── Generate confluence signals on each TF ───────────
    const confluenceSignals = confluenceTFs.map((_tf, idx) =>
      generateSignalsV2({
        pairs: SIGNAL_PAIRS,
        klinesMap: confluenceKlinesMaps[idx],
        news: newsList as NewsItem[],
        etfSummary: etfSummary as ETFSummaryItem[],
        macroEvents: macroEvents as MacroEvent[],
        btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
        purchaseHistory,
        snapshots: snapshotMap,
        tradingType: tradingType ?? undefined,
        typeProfiles: strategyConfig.typeProfiles,
        // same micro maps (micro not TF-dependent)
        orderbooks,
        recentTrades,
        perpsTickers: perpsTickersMap,
        hlFundingRates,
      }),
    );

    const confluenceMaps = confluenceSignals.map((sgnls) =>
      new Map(sgnls.map((s) => [s.pair.split("/")[0], s])),
    );

    // ── Compute Multi-TF Confluence ──────────────────────
    function getDirection(action: string): "bullish" | "bearish" | "neutral" {
      if (action === "STRONG_LONG" || action === "LONG" || action === "WEAK_LONG") return "bullish";
      if (action === "STRONG_SHORT" || action === "SHORT" || action === "WEAK_SHORT") return "bearish";
      return "neutral";
    }

    function computeMultiTFConfluence(
      base: string,
      primary: typeof v2Signals[0],
    ): { score: number; details: { tf: string; action: string; direction: string; confidence: number }[] } {
      const conDirs = confluenceTFs.map((_tf, idx) => {
        const s = confluenceMaps[idx].get(base);
        return s ? getDirection(s.action) : "neutral";
      });

      const primaryDir = getDirection(primary.action);

      const details = [
        { tf: primaryTF.label, action: primary.action, direction: primaryDir, confidence: primary.confidence },
        ...confluenceTFs.map((tf, idx) => {
          const s = confluenceMaps[idx].get(base);
          return {
            tf: tf.label,
            action: s?.action ?? "HOLD",
            direction: conDirs[idx],
            confidence: s?.confidence ?? 50,
          };
        }),
      ];

      const directions = [primaryDir, ...conDirs].filter((d) => d !== "neutral");
      if (directions.length === 0) return { score: 30, details };

      const bullish = directions.filter((d) => d === "bullish").length;
      const bearish = directions.filter((d) => d === "bearish").length;
      const total = directions.length;

      let score: number;
      if (total === 3) {
        if (bullish === 3 || bearish === 3) score = 95;
        else if (bullish === 2 || bearish === 2) score = 70;
        else score = 30;
      } else if (total === 2) {
        if (bullish === 2 || bearish === 2) score = 80;
        else score = 40;
      } else {
        score = 50;
      }

      if (primary.confidence >= 80 && score >= 70) score = Math.min(100, score + 5);

      return { score, details };
    }

    const multiTFResults = new Map<string, { score: number; details: { tf: string; action: string; direction: string; confidence: number }[] }>();
    for (const signal of v2Signals) {
      const base = signal.pair.split("/")[0];
      multiTFResults.set(base, computeMultiTFConfluence(base, signal));
    }

    // Convert V2 signals to Signal type (backward compat)
    const baseSignals: Signal[] = v2Signals.map((s) => ({
      ...s,
      action: s.action === "STRONG_LONG" || s.action === "LONG" || s.action === "WEAK_LONG"
        ? "LONG" as const
        : s.action === "STRONG_SHORT" || s.action === "SHORT" || s.action === "WEAK_SHORT"
          ? "SHORT" as const
          : "HOLD" as const,
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

    // ── Build dimension data (backward compat) ──────────
    function buildDimensions(_currencyId: string | undefined, snap: MarketSnapshot | undefined) {
      return {
        etfFlow: scoreETF(etfSummary as ETFSummaryItem[]),
        sentiment: scoreSentiment(newsList as NewsItem[]),
        macro: scoreMacro(macroEvents as MacroEvent[]),
        momentum: snap ? scoreMomentum(snap) : { score: 50, detail: "No price data" },
        treasury: scoreTreasury(btcTreasuries as { ticker: string; name: string }[], purchaseHistory),
      };
    }

    const btcDims = buildDimensions(btc?.currency_id, btc ? snapshots[btc.currency_id] : undefined);
    const ethDims = buildDimensions(eth?.currency_id, eth ? snapshots[eth.currency_id] : undefined);
    const solDims = buildDimensions(sol?.currency_id, sol ? snapshots[sol.currency_id] : undefined);

    const btcWeighted = dynamicWeightScore(btcDims);
    const ethWeighted = dynamicWeightScore(ethDims);
    const solWeighted = dynamicWeightScore(solDims);

    const result = {
      updated: Date.now(),
      engine: "v3",
      strategy: toActiveStrategySummary(strategyConfig),
      signals,
      sources: {
        etf: (etfSummary as ETFSummaryItem[]).length > 0,
        macro: (macroEvents as MacroEvent[]).length > 0,
        treasuries: (btcTreasuries as { ticker: string; name: string }[]).length > 0,
        treasuryActivity: purchaseHistory.length > 0,
        news: (newsList as NewsItem[]).length > 0,
        snapshots: Object.keys(snapshots).length,
        sodexKlines: klinesMap.size,
        primaryTF: primaryTF.label,
        confluenceTFs: confluenceTFs.map((tf) => tf.label),
        indices: { btc: !!btcIndex, eth: !!ethIndex },
      },
      indices: {
        BTC: btcIndex,
        ETH: ethIndex,
      },
      dimensions: {
        BTC: btcDims,
        ETH: ethDims,
        SOL: solDims,
      },
      overall: {
        BTC: btcWeighted.overall,
        ETH: ethWeighted.overall,
        SOL: solWeighted.overall,
      },
      weights: {
        BTC: btcWeighted.weights,
        ETH: ethWeighted.weights,
        SOL: solWeighted.weights,
      },
      capped: {
        BTC: btcWeighted.capped,
        ETH: ethWeighted.capped,
        SOL: solWeighted.capped,
      },
      btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
      purchaseHistory,
    };

    setCachedResult(cacheKey, result);
    return jsonNoCache(result);
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}

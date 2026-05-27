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
import { getKlines as getSodexKlines } from "@/lib/sodex";
import type { SoDEXKline } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { generateSignalsV2 } from "@/lib/strategy/signal-engine-v2";
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

export const dynamic = "force-dynamic";

// ── Pairs to generate signals for ────────────────────────

const SIGNAL_PAIRS = [
  "BTC/USDC",
  "ETH/USDC",
  "SOL/USDC",
  "AVAX/USDC",
  "LINK/USDC",
];

// ── In-memory cache ──────────────────────────────────────

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 5 * 60_000;

// ── Fetch with timeout ───────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ── Route handler ─────────────────────────────────────────

export async function GET(request: Request) {
  // Parse trading type from query params
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const tradingType: TradingType | null =
    typeParam && ["scalping", "intraday", "swing", "position"].includes(typeParam)
      ? typeParam as TradingType
      : null;

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return jsonNoCache(cache.data);
  }

  try {
    // Fetch all SoSoValue data in parallel
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

    // Fetch BTC purchase history + index snapshots (parallel)
    const topTickers = (btcTreasuries as { ticker: string; name: string }[]).slice(0, 5);
    const [purchaseHistory, btcIndex, ethIndex] = await Promise.all([
      Promise.all(
        topTickers.map((t) =>
          withTimeout(
            getBTCPurchaseHistory(t.ticker, 30).catch(() => []),
            5_000,
            [] as BTCPurchaseHistory[],
          ),
        ),
      ).then((results) => results.flat()),
      withTimeout(getIndexSnapshot("BTC").catch(() => null), 5_000, null),
      withTimeout(getIndexSnapshot("ETH").catch(() => null), 5_000, null),
    ]);

    // Fetch market snapshots
    const snapshotCoins = [btc, eth, sol].filter(Boolean);
    const snapshotResults = await Promise.all(
      snapshotCoins.map((c) =>
        withTimeout(
          getMarketSnapshot(c!.currency_id).then((s) => ({ id: c!.currency_id, s })),
          5_000,
          null,
        ).catch(() => null),
      ),
    );
    const snapshots: Record<string, MarketSnapshot> = {};
    for (const r of snapshotResults) {
      if (r) snapshots[r.id] = r.s;
    }

    // ── Fetch SoDEX klines (250 for v2 engine — needs EMA200 data) ──
    const klinesMap = new Map<string, SoDEXKline[]>();
    await Promise.all(
      SIGNAL_PAIRS.map(async (pair) => {
        const base = pair.split("/")[0];
        const symbol = pairToSodexSymbol(pair);
        if (!symbol) return;
        const klines = await withTimeout(
          getSodexKlines(symbol, "1h", 250).catch(() => []),
          8_000,
          [] as SoDEXKline[],
        );
        if (klines.length > 0) {
          klines.sort((a, b) => a.t - b.t);
          klinesMap.set(base, klines);
        }
      }),
    );

    // ── Multi-Timeframe Confluence: fetch 4H and 1D klines ──
    const MULTI_TF = [
      { interval: "4h", limit: 120, label: "4H" },
      { interval: "1d", limit: 60, label: "1D" },
    ];

    const klinesMap4H = new Map<string, SoDEXKline[]>();
    const klinesMap1D = new Map<string, SoDEXKline[]>();

    await Promise.all(
      SIGNAL_PAIRS.flatMap((pair) => {
        const base = pair.split("/")[0];
        const symbol = pairToSodexSymbol(pair);
        if (!symbol) return [];
        return MULTI_TF.map(async (tf) => {
          const klines = await withTimeout(
            getSodexKlines(symbol, tf.interval, tf.limit).catch(() => []),
            8_000,
            [] as SoDEXKline[],
          );
          if (klines.length > 0) {
            klines.sort((a, b) => a.t - b.t);
            if (tf.interval === "4h") klinesMap4H.set(base, klines);
            if (tf.interval === "1d") klinesMap1D.set(base, klines);
          }
        });
      }),
    );

    // Build snapshots map
    const snapshotMap = new Map<string, MarketSnapshot>();
    if (btc && snapshots[btc.currency_id]) snapshotMap.set("BTC", snapshots[btc.currency_id]);
    if (eth && snapshots[eth.currency_id]) snapshotMap.set("ETH", snapshots[eth.currency_id]);
    if (sol && snapshots[sol.currency_id]) snapshotMap.set("SOL", snapshots[sol.currency_id]);

    // ── Generate signals with V2 engine (batch) ─────────
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
    });

    // ── Multi-Timeframe Confluence ───────────────────────
    // Generate signals on 4H and 1D, then compute alignment score
    const v2Signals4H = generateSignalsV2({
      pairs: SIGNAL_PAIRS,
      klinesMap: klinesMap4H,
      news: newsList as NewsItem[],
      etfSummary: etfSummary as ETFSummaryItem[],
      macroEvents: macroEvents as MacroEvent[],
      btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
      purchaseHistory,
      snapshots: snapshotMap,
      tradingType: tradingType ?? undefined,
    });

    const v2Signals1D = generateSignalsV2({
      pairs: SIGNAL_PAIRS,
      klinesMap: klinesMap1D,
      news: newsList as NewsItem[],
      etfSummary: etfSummary as ETFSummaryItem[],
      macroEvents: macroEvents as MacroEvent[],
      btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
      purchaseHistory,
      snapshots: snapshotMap,
      tradingType: tradingType ?? undefined,
    });

    // Build maps for quick lookup
    const signal4HMap = new Map(v2Signals4H.map((s) => [s.pair.split("/")[0], s]));
    const signal1DMap = new Map(v2Signals1D.map((s) => [s.pair.split("/")[0], s]));

    // Compute multi-TF confluence per pair
    function getDirection(action: string): "bullish" | "bearish" | "neutral" {
      if (action === "STRONG_LONG" || action === "LONG" || action === "WEAK_LONG") return "bullish";
      if (action === "STRONG_SHORT" || action === "SHORT" || action === "WEAK_SHORT") return "bearish";
      return "neutral";
    }

    function computeMultiTFConfluence(
      base: string,
      primary: typeof v2Signals[0],
    ): { score: number; details: { tf: string; action: string; direction: string; confidence: number }[] } {
      const s4H = signal4HMap.get(base);
      const s1D = signal1DMap.get(base);

      const primaryDir = getDirection(primary.action);
      const dir4H = s4H ? getDirection(s4H.action) : "neutral";
      const dir1D = s1D ? getDirection(s1D.action) : "neutral";

      const details = [
        { tf: "1H", action: primary.action, direction: primaryDir, confidence: primary.confidence },
        ...(s4H ? [{ tf: "4H", action: s4H.action, direction: dir4H, confidence: s4H.confidence }] : []),
        ...(s1D ? [{ tf: "1D", action: s1D.action, direction: dir1D, confidence: s1D.confidence }] : []),
      ];

      const directions = [primaryDir, dir4H, dir1D].filter((d) => d !== "neutral");
      if (directions.length === 0) return { score: 30, details };

      const bullish = directions.filter((d) => d === "bullish").length;
      const bearish = directions.filter((d) => d === "bearish").length;
      const total = directions.length;

      let score: number;
      if (total === 3) {
        if (bullish === 3 || bearish === 3) score = 95; // All agree
        else if (bullish === 2 || bearish === 2) score = 70; // 2/3 agree
        else score = 30; // Mixed
      } else if (total === 2) {
        if (bullish === 2 || bearish === 2) score = 80; // Both agree
        else score = 40; // Mixed
      } else {
        score = 50; // Only one TF has signal
      }

      // Bonus: if primary TF confidence is high and aligned
      if (primary.confidence >= 80 && score >= 70) score = Math.min(100, score + 5);

      return { score, details };
    }

    const multiTFResults = new Map<string, { score: number; details: { tf: string; action: string; direction: string; confidence: number }[] }>();
    for (const signal of v2Signals) {
      const base = signal.pair.split("/")[0];
      multiTFResults.set(base, computeMultiTFConfluence(base, signal));
    }

    // Convert V2 signals to Signal type (backward compat)
    const signals: Signal[] = v2Signals.map((s) => ({
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
      multiTF: multiTFResults.get(s.pair.split("/")[0]),
    }));

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
      engine: "v2",
      signals,
      sources: {
        etf: (etfSummary as ETFSummaryItem[]).length > 0,
        macro: (macroEvents as MacroEvent[]).length > 0,
        treasuries: (btcTreasuries as { ticker: string; name: string }[]).length > 0,
        treasuryActivity: purchaseHistory.length > 0,
        news: (newsList as NewsItem[]).length > 0,
        snapshots: Object.keys(snapshots).length,
        sodexKlines: klinesMap.size,
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
    };

    cache = { data: result, ts: Date.now() };
    return jsonNoCache(result);
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}

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
import {
  generateSignals,
  scoreETF,
  scoreSentiment,
  scoreMacro,
  scoreMomentum,
  scoreTreasury,
  dynamicWeightScore,
} from "@/lib/strategy/signal-engine";
import type { BatchSignalInput } from "@/lib/strategy/signal-engine";
import type { Signal } from "@/lib/types/signal";
import { jsonNoCache } from "@/lib/api/no-cache";

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
const CACHE_MS = 5 * 60_000; // 5 min — klines & fundamentals don't change fast

// ── Fetch with timeout ───────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ── Route handler ─────────────────────────────────────────

export async function GET() {
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

    // Fetch BTC purchase history for top treasuries + index snapshots (parallel)
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

    // Fetch market snapshots in parallel with timeout
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

    // ── Fetch SoDEX klines for TA signals (parallel, 5s timeout per pair) ──
    const klinesMap = new Map<string, SoDEXKline[]>();
    await Promise.all(
      SIGNAL_PAIRS.map(async (pair) => {
        const base = pair.split("/")[0];
        const symbol = pairToSodexSymbol(pair);
        if (!symbol) return;
        const klines = await withTimeout(
          getSodexKlines(symbol, "1h", 100).catch(() => []),
          5_000,
          [] as SoDEXKline[],
        );
        if (klines.length > 0) {
          klines.sort((a, b) => a.t - b.t);
          klinesMap.set(base, klines);
        }
      }),
    );

    // Build snapshots map for signal engine
    const snapshotMap = new Map<string, MarketSnapshot>();
    if (btc && snapshots[btc.currency_id]) snapshotMap.set("BTC", snapshots[btc.currency_id]);
    if (eth && snapshots[eth.currency_id]) snapshotMap.set("ETH", snapshots[eth.currency_id]);
    if (sol && snapshots[sol.currency_id]) snapshotMap.set("SOL", snapshots[sol.currency_id]);

    // ── Generate TA-based signals ────────────────────────
    const taSignals = generateSignals({
      pairs: SIGNAL_PAIRS,
      klinesMap,
      news: newsList as NewsItem[],
      etfSummary: etfSummary as ETFSummaryItem[],
      macroEvents: macroEvents as MacroEvent[],
      btcTreasuries: btcTreasuries as { ticker: string; name: string }[],
      purchaseHistory,
      snapshots: snapshotMap,
    });

    // ── Build dimension data (for live dimensions in UI) ──
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
      signals: taSignals,
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

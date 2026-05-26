import {
  getETFSummary,
  getMacroEvents,
  getBTCTreasuries,
  getMarketSnapshot,
  getNewsHot,
  getCurrencies,
} from "@/lib/sosovalue";
import type { ETFSummaryItem, MarketSnapshot, NewsItem, MacroEvent } from "@/lib/sosovalue";
import { getKlines as getSodexKlines } from "@/lib/sodex";
import type { SoDEXKline } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { generateSignals } from "@/lib/strategy/signal-engine";
import type { BatchSignalInput } from "@/lib/strategy/signal-engine";
import type { Signal } from "@/lib/types/signal";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

// ── Dimension scoring (for hook-based live dimensions) ────

function scoreETF(summary: ETFSummaryItem[]): { score: number; detail: string } {
  if (!summary.length) return { score: 50, detail: "No ETF data" };
  const latest = summary[0];
  const score = Math.min(100, Math.max(0, 50 + (latest.total_net_inflow > 0 ? 30 : -20) + Math.min(20, Math.log10(Math.abs(latest.total_net_inflow) + 1) * 5)));
  const dir = latest.total_net_inflow > 0 ? "inflow" : "outflow";
  return {
    score: Math.round(score),
    detail: `ETF ${dir} $${(Math.abs(latest.total_net_inflow) / 1e6).toFixed(0)}M in 24h. Cum: $${(latest.cum_net_inflow / 1e9).toFixed(1)}B. AUM: $${(latest.total_net_assets / 1e9).toFixed(1)}B.`,
  };
}

function scoreSentiment(news: NewsItem[]): { score: number; detail: string } {
  if (!news.length) return { score: 50, detail: "No news data" };
  const bullish = news.filter((n) => {
    const t = (n.title + n.content).toLowerCase();
    return (
      t.includes("surge") || t.includes("rally") || t.includes("bull") || t.includes("breakout") ||
      t.includes("inflow") || t.includes("accumul") || t.includes("upgrade")
    );
  }).length;
  const bearish = news.filter((n) => {
    const t = (n.title + n.content).toLowerCase();
    return (
      t.includes("crash") || t.includes("dump") || t.includes("bear") || t.includes("outflow") ||
      t.includes("decline") || t.includes("downgrade") || t.includes("sell-off")
    );
  }).length;
  const ratio = bullish / (bearish + bullish || 1);
  const score = Math.round(30 + ratio * 50 + Math.min(20, news.length * 2));
  return {
    score: Math.min(100, score),
    detail: `${news.length} hot articles. ${bullish} bullish / ${bearish} bearish signals detected from headlines.`,
  };
}

function scoreMacro(events: MacroEvent[]): { score: number; detail: string } {
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((e) => e.date === today);
  const count = todayEvents.flatMap((e) => e.events).length;
  const score = Math.round(50 + (count > 5 ? 20 : count > 2 ? 10 : 0));
  return {
    score,
    detail: count > 0
      ? `${count} macro events today: ${todayEvents.flatMap((e) => e.events).slice(0, 3).join(", ")}${count > 3 ? "..." : ""}`
      : "No major macro events today. Fed stance remains data-dependent.",
  };
}

function scoreMomentum(snap: MarketSnapshot): { score: number; detail: string } {
  const chg = snap.change_pct_24h;
  const score = Math.round(50 + Math.max(-40, Math.min(40, chg * 8)));
  return {
    score: Math.min(100, Math.max(0, score)),
    detail: `$${snap.price.toLocaleString()} (${chg > 0 ? "+" : ""}${chg.toFixed(1)}% 24h). Rank #${snap.marketcap_rank}. Vol $${(snap.turnover_24h / 1e9).toFixed(1)}B.`,
  };
}

function scoreTreasury(companies: { ticker: string; name: string }[]): { score: number; detail: string } {
  if (!companies.length) return { score: 50, detail: "No BTC treasury data" };
  const score = Math.min(100, 50 + companies.length * 3);
  return {
    score,
    detail: `${companies.length} public companies hold BTC. Top: ${companies.slice(0, 3).map((c) => c.ticker).join(", ")}.`,
  };
}

// ── Dynamic weight engine ────────────────────────────────

const BASE_WEIGHTS = {
  etfFlow: 20,
  sentiment: 20,
  macro: 20,
  momentum: 20,
  treasury: 20,
};

interface DimScore {
  score: number;
  detail: string;
}

interface WeightedDims {
  etfFlow: DimScore;
  sentiment: DimScore;
  macro: DimScore;
  momentum: DimScore;
  treasury: DimScore;
}

function dynamicWeightScore(dims: WeightedDims): {
  overall: number;
  weights: Record<string, number>;
  capped: string[];
} {
  const scores = [
    { key: "etfFlow", score: dims.etfFlow.score },
    { key: "sentiment", score: dims.sentiment.score },
    { key: "macro", score: dims.macro.score },
    { key: "momentum", score: dims.momentum.score },
    { key: "treasury", score: dims.treasury.score },
  ];

  const mean = scores.reduce((s, d) => s + d.score, 0) / scores.length;
  const variance = scores.reduce((s, d) => s + (d.score - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  const capped: string[] = [];
  const weights: Record<string, number> = {};
  let totalWeight = 100;

  for (const d of scores) {
    if (stdDev > 8 && Math.abs(d.score - mean) > 1.5 * stdDev) {
      weights[d.key] = 8;
      capped.push(d.key);
      totalWeight -= 8;
    } else {
      weights[d.key] = BASE_WEIGHTS[d.key as keyof typeof BASE_WEIGHTS];
      totalWeight -= BASE_WEIGHTS[d.key as keyof typeof BASE_WEIGHTS];
    }
  }

  if (capped.length > 0 && totalWeight > 0) {
    const uncapped = scores.filter((d) => !capped.includes(d.key));
    const uncappedTotal = uncapped.reduce((s, d) => s + d.score, 0);
    for (const d of uncapped) {
      if (uncappedTotal > 0) {
        weights[d.key] += Math.round((d.score / uncappedTotal) * totalWeight);
      }
    }
  }

  const overall = Math.round(
    scores.reduce((s, d) => s + d.score * (weights[d.key] / 100), 0),
  );

  return { overall, weights, capped };
}

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
      snapshots: snapshotMap,
    });

    // ── Build dimension data (for live dimensions in UI) ──
    function buildDimensions(_currencyId: string | undefined, snap: MarketSnapshot | undefined) {
      return {
        etfFlow: scoreETF(etfSummary as ETFSummaryItem[]),
        sentiment: scoreSentiment(newsList as NewsItem[]),
        macro: scoreMacro(macroEvents as MacroEvent[]),
        momentum: snap ? scoreMomentum(snap) : { score: 50, detail: "No price data" },
        treasury: scoreTreasury(btcTreasuries as { ticker: string; name: string }[]),
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
        news: (newsList as NewsItem[]).length > 0,
        snapshots: Object.keys(snapshots).length,
        sodexKlines: klinesMap.size,
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
        SOL: solWeighted.capped,
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

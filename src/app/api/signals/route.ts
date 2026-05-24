import { NextResponse } from "next/server";
import {
  getETFSummary,
  getMacroEvents,
  getBTCTreasuries,
  getMarketSnapshot,
  getNewsHot,
  getCurrencies,
} from "@/lib/sosovalue";
import type { ETFSummaryItem, MarketSnapshot, NewsItem, MacroEvent } from "@/lib/sosovalue";

// ── Dimension scoring (heuristic, pre-AI agent) ────────

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

// ── Simple in-memory cache (avoids rate limits) ───────

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 60_000; // 1 minute

// ── Route handler ──────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const [currencies, etfSummary, macroEvents, btcTreasuries, hotNews] = await Promise.all([
      getCurrencies().catch(() => []),
      getETFSummary("BTC", "US", 5).catch(() => []),
      getMacroEvents().catch(() => []),
      getBTCTreasuries().catch(() => []),
      getNewsHot(1, 20).catch(() => ({ list: [], page: 1, page_size: 20, total: 0 })),
    ]);

    const btc = currencies.find(
      (c) => c.symbol.toLowerCase() === "btc",
    );
    const eth = currencies.find(
      (c) => c.symbol.toLowerCase() === "eth",
    );
    const sol = currencies.find(
      (c) => c.symbol.toLowerCase() === "sol",
    );

    const newsList = "list" in hotNews ? hotNews.list : [];

    // Fetch market snapshots for the coins we care about
    const snapshots: Record<string, MarketSnapshot> = {};
    for (const c of [btc, eth, sol].filter(Boolean)) {
      await getMarketSnapshot(c!.currency_id)
        .then((s) => {
          snapshots[c!.currency_id] = s;
        })
        .catch(() => {});
    }

    function buildDimensions(currencyId: string | undefined, snap: MarketSnapshot | undefined) {
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

    const result = {
      updated: Date.now(),
      sources: {
        etf: etfSummary.length > 0,
        macro: macroEvents.length > 0,
        treasuries: btcTreasuries.length > 0,
        news: newsList.length > 0,
        snapshots: Object.keys(snapshots).length,
      },
      dimensions: {
        BTC: btcDims,
        ETH: ethDims,
        SOL: solDims,
      },
    };
    cache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}

/**
 * Marketaux API client — financial news sentiment for crypto entities.
 * Docs: https://www.marketaux.com/documentation
 */

const BASE = "https://api.marketaux.com/v1";

function apiKey(): string {
  return process.env.MARKETAUX_API_KEY || "";
}

// ── Types ──────────────────────────────────────────────

export interface MarketauxEntity {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  type: string;
  industry: string;
  match_score: number;
  sentiment_score: number;
  highlights: Array<{
    highlight: string;
    sentiment: number;
    matched_in: string;
  }>;
}

export interface MarketauxArticle {
  uuid: string;
  title: string;
  description: string;
  keywords: string;
  snippet: string;
  url: string;
  image_url: string;
  language: string;
  published_at: string;
  source: string;
  relevance_score: number;
  entities: MarketauxEntity[];
}

export interface MarketauxMeta {
  found: number;
  returned: number;
  limit: number;
  page: number;
}

export interface MarketauxResponse {
  meta: MarketauxMeta;
  data: MarketauxArticle[];
}

// ── Aggregated sentiment result ──

export interface CryptoSentimentResult {
  /** Average sentiment score across all crypto entities (-1 to 1) */
  avgSentiment: number;
  /** Sentiment label derived from avgSentiment */
  sentimentLabel: "Bullish" | "Bearish" | "Neutral";
  /** Total articles found */
  articleCount: number;
  /** Entity with highest positive sentiment */
  mostBullish: { symbol: string; name: string; score: number } | null;
  /** Entity with lowest (most negative) sentiment */
  mostBearish: { symbol: string; name: string; score: number } | null;
  /** Top mentioned entities by article count */
  trendingEntities: Array<{ symbol: string; name: string; mentions: number; avgSentiment: number }>;
  /** Raw articles for reference */
  articles: MarketauxArticle[];
  /** Fetch timestamp */
  fetchedAt: number;
}

// ── Fetch wrapper ──

async function marketauxFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_token", apiKey());
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Marketaux ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Public API ──

/**
 * Fetch crypto news from Marketaux and compute aggregated sentiment.
 * Uses `symbols` filter with major crypto tickers since `entity_types=crypto`
 * returns 0 on the free tier.
 * Paginates to fetch more than the free-tier 3-per-request limit.
 * @param limit - Target number of articles (fetches multiple pages if needed)
 */
export async function getCryptoSentiment(limit = 9): Promise<CryptoSentimentResult> {
  const now = Date.now();
  const perPage = 3; // free-tier max
  const pagesToFetch = Math.ceil(limit / perPage);

  const params = {
    symbols: "BTCUSD,ETHUSD,SOLUSD,BNBUSD,XRPUSD,ADAUSD,DOGEUSD,AVAXUSD,DOTUSD,LINKUSD",
    filter_entities: "true",
    language: "en",
    limit: String(perPage),
  };

  // Fetch multiple pages in parallel
  const pageResults = await Promise.all(
    Array.from({ length: pagesToFetch }, (_, i) =>
      marketauxFetch<MarketauxResponse>("/news/all", {
        ...params,
        page: String(i + 1),
      }).catch(() => ({ meta: { found: 0, returned: 0, limit: perPage, page: i + 1 }, data: [] } as MarketauxResponse))
    )
  );

  // Merge articles, dedup by uuid
  const seen = new Set<string>();
  const articles: MarketauxArticle[] = [];
  let totalFound = 0;

  for (const result of pageResults) {
    if (result.meta?.found) totalFound = Math.max(totalFound, result.meta.found);
    for (const article of result.data ?? []) {
      if (!seen.has(article.uuid)) {
        seen.add(article.uuid);
        articles.push(article);
      }
    }
  }

  // Aggregate entity sentiment — only count crypto/currency entities, skip equity
  const entityMap = new Map<string, { scores: number[]; name: string }>();

  for (const article of articles) {
    for (const entity of article.entities) {
      // Skip stock matches (e.g. ETH → Ethan Allen)
      if (entity.type === "equity" || entity.type === "etf") continue;
      const key = entity.symbol.toUpperCase();
      const existing = entityMap.get(key);
      if (existing) {
        existing.scores.push(entity.sentiment_score);
      } else {
        entityMap.set(key, { scores: [entity.sentiment_score], name: entity.name });
      }
    }
  }

  // Compute per-entity averages
  const entities = Array.from(entityMap.entries()).map(([symbol, { scores, name }]) => ({
    symbol,
    name,
    mentions: scores.length,
    avgSentiment: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  // Sort by mentions for trending
  const trendingEntities = [...entities].sort((a, b) => b.mentions - a.mentions).slice(0, 5);

  // Overall average sentiment
  const allScores = entities.flatMap((e) => Array.from({ length: e.mentions }, () => e.avgSentiment));
  const avgSentiment = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;

  // Most bullish / bearish
  const sorted = [...entities].sort((a, b) => b.avgSentiment - a.avgSentiment);
  const mostBullish = sorted.length > 0 && sorted[0].avgSentiment > 0
    ? { symbol: sorted[0].symbol, name: sorted[0].name, score: sorted[0].avgSentiment }
    : null;
  const mostBearish = sorted.length > 0 && sorted[sorted.length - 1].avgSentiment < 0
    ? { symbol: sorted[sorted.length - 1].symbol, name: sorted[sorted.length - 1].name, score: sorted[sorted.length - 1].avgSentiment }
    : null;

  const sentimentLabel: CryptoSentimentResult["sentimentLabel"] =
    avgSentiment > 0.1 ? "Bullish" : avgSentiment < -0.1 ? "Bearish" : "Neutral";

  return {
    avgSentiment,
    sentimentLabel,
    articleCount: totalFound || articles.length,
    mostBullish,
    mostBearish,
    trendingEntities,
    articles,
    fetchedAt: now,
  };
}

import { getNewsHot, type NewsItem } from "@/lib/sosovalue";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") || "30", 10);

  const hotNews = await getNewsHot(page, pageSize).catch(() => ({
    list: [] as NewsItem[],
    page: 1,
    page_size: 20,
    total: 0,
  }));
  const list = hotNews.list ?? [];

  // Sentiment analysis
  const bullish = list.filter((n: NewsItem) => {
    const t = ((n.title ?? "") + (n.content ?? "")).toLowerCase();
    return (
      t.includes("surge") || t.includes("rally") || t.includes("bull") || t.includes("breakout") ||
      t.includes("inflow") || t.includes("accumul") || t.includes("upgrade")
    );
  }).length;

  const bearish = list.filter((n: NewsItem) => {
    const t = ((n.title ?? "") + (n.content ?? "")).toLowerCase();
    return (
      t.includes("crash") || t.includes("dump") || t.includes("bear") || t.includes("outflow") ||
      t.includes("decline") || t.includes("downgrade") || t.includes("sell-off")
    );
  }).length;

  const neutral = list.length - bullish - bearish;
  const sentimentScore = list.length > 0
    ? Math.round(50 + ((bullish - bearish) / list.length) * 40)
    : 50;

  // Extract mentioned coins
  const coinMentions: Record<string, number> = {};
  for (const item of list) {
    if (item.matched_currencies) {
      for (const c of item.matched_currencies) {
        coinMentions[c.symbol] = (coinMentions[c.symbol] || 0) + 1;
      }
    }
  }

  const topCoins = Object.entries(coinMentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbol, count]) => ({ symbol, count }));

  // Extract tags
  const tagCounts: Record<string, number> = {};
  for (const item of list) {
    if (item.tags) {
      for (const t of item.tags) {
        tagCounts[t.name] = (tagCounts[t.name] || 0) + 1;
      }
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  return jsonNoCache({
    list,
    page,
    pageSize,
    total: hotNews.total ?? 0,
    sentiment: {
      bullish,
      bearish,
      neutral,
      score: sentimentScore,
      label: sentimentScore > 60 ? "Bullish" : sentimentScore < 40 ? "Bearish" : "Neutral",
    },
    topCoins,
    topTags,
  });
}

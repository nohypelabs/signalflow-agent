import { getCryptoSentiment } from "@/lib/marketaux";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);

  try {
    const data = await getCryptoSentiment(limit);
    return jsonNoCache(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Marketaux fetch failed";
    return jsonNoCache(
      {
        error: message,
        avgSentiment: 0,
        sentimentLabel: "Neutral",
        articleCount: 0,
        mostBullish: null,
        mostBearish: null,
        trendingEntities: [],
        articles: [],
        fetchedAt: Date.now(),
      },
      { status: 200 } // Return 200 with error field so client can degrade gracefully
    );
  }
}

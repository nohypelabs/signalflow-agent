"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

interface NewsItem {
  id: number;
  source_link: string;
  release_time: number;
  title: string;
  content: string;
  matched_currencies: Array<{ currency_id: string; symbol: string }> | null;
  tags: Array<{ name: string }> | null;
}

interface NewsResponse {
  list: NewsItem[];
  total: number;
  sentiment: {
    bullish: number;
    bearish: number;
    neutral: number;
    score: number;
    label: string;
  };
  topCoins: Array<{ symbol: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
}

function fmtTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SentimentGauge({ score, bullish, bearish, neutral }: { score: number; bullish: number; bearish: number; neutral: number }) {
  const total = bullish + bearish + neutral;
  if (total === 0) return null;

  const bullPct = (bullish / total) * 100;
  const bearPct = (bearish / total) * 100;
  const neutralPct = (neutral / total) * 100;

  return (
    <div className="space-y-2">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: score > 60 ? "#00ff8815" : score < 40 ? "#ff444415" : "#ff880015",
            color: score > 60 ? "#00ff88" : score < 40 ? "#ff4444" : "#ff8800",
          }}
        >
          {score}
        </div>
        <div>
          <p className={`text-sm font-bold ${
            score > 60 ? "text-[#00ff88]" : score < 40 ? "text-[#ff4444]" : "text-[#ff8800]"
          }`}>
            {score > 60 ? "Bullish" : score < 40 ? "Bearish" : "Neutral"}
          </p>
          <p className="text-[9px] text-txt-faint">{total} articles analyzed</p>
        </div>
      </div>

      {/* Bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        <div className="bg-[#00ff88] rounded-l-full" style={{ width: `${bullPct}%` }} />
        <div className="bg-[#64748b]" style={{ width: `${neutralPct}%` }} />
        <div className="bg-[#ff4444] rounded-r-full" style={{ width: `${bearPct}%` }} />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[9px]">
        <span className="text-[#00ff88]">🟢 Bullish {bullish}</span>
        <span className="text-txt-faint">⚪ Neutral {neutral}</span>
        <span className="text-[#ff4444]">🔴 Bearish {bearish}</span>
      </div>
    </div>
  );
}

export default function NewsSentimentDashboard() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/news?pageSize=30")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          if (json.error) setError(json.error);
          else setData(json);
        }
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">Failed to load news: {error ?? "No data"}</p>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📰</span>
            <h3 className="text-sm font-semibold text-txt-primary">News Sentiment</h3>
          </div>
          <Badge variant={data.sentiment.score > 60 ? "live" : data.sentiment.score < 40 ? "error" : "warning"} size="sm">
            {data.sentiment.label}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Sentiment Gauge */}
        <SentimentGauge
          score={data.sentiment.score}
          bullish={data.sentiment.bullish}
          bearish={data.sentiment.bearish}
          neutral={data.sentiment.neutral}
        />

        {/* Top Coins */}
        {data.topCoins.length > 0 && (
          <div>
            <p className="text-[9px] text-txt-muted uppercase tracking-wider mb-2">Top Mentioned</p>
            <div className="flex flex-wrap gap-1.5">
              {data.topCoins.map((c) => (
                <span
                  key={c.symbol}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-elevated text-txt-secondary border border-border-default"
                >
                  {c.symbol} <span className="text-txt-faint">×{c.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Tags */}
        {data.topTags.length > 0 && (
          <div>
            <p className="text-[9px] text-txt-muted uppercase tracking-wider mb-2">Hot Topics</p>
            <div className="flex flex-wrap gap-1">
              {data.topTags.slice(0, 8).map((t) => (
                <span
                  key={t.name}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-accent/5 text-accent border border-accent/20"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Headlines */}
        <div>
          <p className="text-[9px] text-txt-muted uppercase tracking-wider mb-2">Latest Headlines</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.list.slice(0, 10).map((item) => {
              const text = (item.title + item.content).toLowerCase();
              const isBull = text.includes("surge") || text.includes("rally") || text.includes("bull") || text.includes("inflow");
              const isBear = text.includes("crash") || text.includes("dump") || text.includes("bear") || text.includes("outflow");

              return (
                <a
                  key={item.id}
                  href={item.source_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-elevated/30 transition-colors group"
                >
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    isBull ? "bg-[#00ff88]" : isBear ? "bg-[#ff4444]" : "bg-[#64748b]"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-txt-secondary leading-tight line-clamp-2 group-hover:text-txt-primary transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] text-txt-faint">{fmtTimeAgo(item.release_time)}</span>
                      {item.matched_currencies?.slice(0, 3).map((c) => (
                        <span key={c.symbol} className="text-[8px] text-accent font-mono">{c.symbol}</span>
                      ))}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

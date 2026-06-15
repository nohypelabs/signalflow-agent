export const runtime = "edge";

export const dynamic = "force-dynamic";

interface LogEntry {
  ts: string;
  type: "DATA" | "SIGNAL" | "RECALC" | "WARNING" | "ERROR";
  emoji: string;
  msg: string;
}

function formatTs(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function send(encoder: TextEncoder, controller: ReadableStreamDefaultController, entry: LogEntry): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
}

async function fetchTickers(): Promise<Array<{ symbol: string; lastPx: string; changePct: number; quoteVolume: number }>> {
  try {
    const res = await fetch("https://mainnet-gw.sodex.dev/api/v1/spot/markets/tickers", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

function formatPrice(px: number): string {
  if (px >= 10000) return `$${px.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (px >= 100) return `$${px.toFixed(2)}`;
  if (px >= 1) return `$${px.toFixed(3)}`;
  return `$${px.toFixed(5)}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toFixed(2)}`;
}

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "🚀", msg: "SignalFlow pipeline connecting..." });

      // Fetch real market data
      const tickers = await fetchTickers();
      const validTickers = tickers.filter(t => {
        const px = parseFloat(t.lastPx);
        return !isNaN(px) && px > 0;
      });

      if (validTickers.length === 0) {
        send(encoder, controller, { ts: formatTs(), type: "ERROR", emoji: "❌", msg: "SoDEX API timeout — no market data available" });
        return;
      }

      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "✅", msg: `SoDEX connected — ${validTickers.length} pairs streaming` });

      // Market overview
      const totalVolume = validTickers.reduce((sum, t) => sum + (t.quoteVolume ?? 0), 0);
      const advancers = validTickers.filter(t => (t.changePct ?? 0) > 0).length;
      const decliners = validTickers.filter(t => (t.changePct ?? 0) < 0).length;
      const breadth = Math.round((advancers / validTickers.length) * 100);

      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "📊", msg: `24H volume: ${formatVolume(totalVolume)} across ${validTickers.length} instruments` });
      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "📊", msg: `Market breadth: ${breadth}% advancing (${advancers}↑ ${decliners}↓)` });

      // Top movers
      const sorted = [...validTickers].sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0));
      const top3 = sorted.slice(0, 3);

      for (const t of top3) {
        const base = t.symbol.replace(/^v/, "").replace(/_vUSDC$/, "");
        const px = parseFloat(t.lastPx);
        const change = t.changePct ?? 0;
        send(encoder, controller, {
          ts: formatTs(),
          type: "DATA",
          emoji: change >= 0 ? "📈" : "📉",
          msg: `${base}/USDC ${formatPrice(px)} (${change >= 0 ? "+" : ""}${change.toFixed(2)}%) — ${change >= 0 ? "top gainer" : "top loser"}`
        });
      }

      // BTC specific
      const btc = validTickers.find(t => t.symbol.includes("BTC"));
      if (btc) {
        const px = parseFloat(btc.lastPx);
        const change = btc.changePct ?? 0;
        const vol = btc.quoteVolume ?? 0;
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "₿", msg: `BTC/USDC ${formatPrice(px)} — 24H volume ${formatVolume(vol)}` });
      }

      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "✅", msg: "Market data pipeline active — waiting for signal generation..." });

      // Live price updates every 5s
      let updateCount = 0;
      const priceInterval = setInterval(async () => {
        updateCount++;
        const freshTickers = await fetchTickers();
        if (freshTickers.length > 0) {
          const freshBtc = freshTickers.find(t => t.symbol.includes("BTC"));
          if (freshBtc) {
            const px = parseFloat(freshBtc.lastPx);
            const change = freshBtc.changePct ?? 0;
            send(encoder, controller, {
              ts: formatTs(),
              type: "DATA",
              emoji: "📊",
              msg: `BTC/USDC ${formatPrice(px)} (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)`
            });
          }

          // Every 5th update, show market breadth
          if (updateCount % 5 === 0) {
            const adv = freshTickers.filter(t => (t.changePct ?? 0) > 0).length;
            const dec = freshTickers.filter(t => (t.changePct ?? 0) < 0).length;
            send(encoder, controller, {
              ts: formatTs(),
              type: "DATA",
              emoji: "📊",
              msg: `Breadth update: ${adv}↑ ${dec}↓ — ${Math.round((adv / freshTickers.length) * 100)}% advancing`
            });
          }
        }
      }, 5000);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "💓", msg: "Pipeline heartbeat — all feeds active" });
      }, 30000);

      // Cleanup
      (globalThis as unknown as Record<string, unknown>).__signalLogCleanup = () => {
        clearInterval(priceInterval);
        clearInterval(heartbeat);
      };
    },
    cancel() {
      const cleanup = (globalThis as unknown as Record<string, unknown>).__signalLogCleanup;
      if (typeof cleanup === "function") cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "edge";

export const dynamic = "force-dynamic";

import { signalLogBus } from "@/lib/signal-log-bus";

interface LogEntry {
  ts: string;
  type: "DATA" | "SIGNAL" | "RECALC" | "WARNING" | "ERROR";
  emoji: string;
  msg: string;
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

      // Subscribe to signal engine events
      const unsubscribe = signalLogBus.subscribe((event) => {
        send(encoder, controller, event);
      });

      // Fetch real market data
      const tickers = await fetchTickers();
      const validTickers = tickers.filter(t => {
        const px = parseFloat(t.lastPx);
        return !isNaN(px) && px > 0;
      });

      if (validTickers.length === 0) {
        send(encoder, controller, { ts: formatTs(), type: "ERROR", emoji: "❌", msg: "SoDEX API timeout — no market data available" });
      } else {
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "✅", msg: `SoDEX connected — ${validTickers.length} pairs streaming` });

        // Market overview
        const totalVolume = validTickers.reduce((sum, t) => sum + (t.quoteVolume ?? 0), 0);
        const advancers = validTickers.filter(t => (t.changePct ?? 0) > 0).length;
        const decliners = validTickers.filter(t => (t.changePct ?? 0) < 0).length;
        const breadth = Math.round((advancers / validTickers.length) * 100);

        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "📊", msg: `24H volume: ${formatVolume(totalVolume)} across ${validTickers.length} instruments` });
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "📊", msg: `Market breadth: ${breadth}% advancing (${advancers}↑ ${decliners}↓)` });

        // BTC specific
        const btc = validTickers.find(t => t.symbol.includes("BTC"));
        if (btc) {
          const px = parseFloat(btc.lastPx);
          const change = btc.changePct ?? 0;
          send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "₿", msg: `BTC/USDC ${formatPrice(px)} (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)` });
        }
      }

      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "✅", msg: "Pipeline active — generate a signal to see engine analysis" });

      // Live price updates every 5s
      const priceInterval = setInterval(async () => {
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
        }
      }, 5000);

      // Cleanup
      (globalThis as unknown as Record<string, unknown>).__signalLogCleanup = () => {
        clearInterval(priceInterval);
        unsubscribe();
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

function formatTs(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

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
    const data = json.data ?? [];
    return data.map((t: Record<string, unknown>) => ({
      symbol: String(t.symbol ?? ""),
      lastPx: String(t.lastPx ?? "0"),
      changePct: typeof t.changePct === "number" ? t.changePct : parseFloat(String(t.changePct ?? "0")),
      quoteVolume: typeof t.quoteVolume === "number" ? t.quoteVolume : parseFloat(String(t.quoteVolume ?? "0")),
    }));
  } catch {
    return [];
  }
}

async function fetchSignals(): Promise<{
  signals?: Array<{
    pair: string;
    action: string;
    confidence: number;
    confluence?: number;
    regime?: string;
    factors?: Array<{ name: string; score: number; detail: string }>;
    setup?: { label: string; thesis: string };
    reasoning?: string;
    execution?: { entry: number; takeProfit: number; stopLoss: number; riskReward: string };
  }>;
  updated?: number;
}> {
  try {
    const res = await fetch("http://localhost:3000/api/signals", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

function formatPrice(px: number): string {
  if (!Number.isFinite(px)) return "$0";
  if (px >= 10000) return `$${px.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (px >= 100) return `$${px.toFixed(2)}`;
  if (px >= 1) return `$${px.toFixed(3)}`;
  return `$${px.toFixed(5)}`;
}

function formatVolume(vol: number): string {
  if (!Number.isFinite(vol) || vol <= 0) return "$0";
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toFixed(2)}`;
}

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let lastSignalUpdate = 0;

  const stream = new ReadableStream({
    async start(controller) {
      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "🚀", msg: "SignalFlow pipeline connecting..." });

      // Fetch initial market data
      const tickers = await fetchTickers();
      const validTickers = tickers.filter(t => {
        const px = parseFloat(t.lastPx);
        return !isNaN(px) && px > 0;
      });

      if (validTickers.length === 0) {
        send(encoder, controller, { ts: formatTs(), type: "ERROR", emoji: "❌", msg: "SoDEX API timeout — retrying..." });
      } else {
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "✅", msg: `SoDEX connected — ${validTickers.length} pairs streaming` });

        const totalVolume = validTickers.reduce((sum, t) => sum + (t.quoteVolume ?? 0), 0);
        const advancers = validTickers.filter(t => (t.changePct ?? 0) > 0).length;
        const decliners = validTickers.filter(t => (t.changePct ?? 0) < 0).length;
        const breadth = Math.round((advancers / validTickers.length) * 100);

        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "📊", msg: `24H volume: ${formatVolume(totalVolume)} | ${validTickers.length} instruments` });
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "📊", msg: `Market breadth: ${breadth}% advancing (${advancers}↑ ${decliners}↓)` });

        // Top movers
        const sorted = [...validTickers].sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0));
        for (const t of sorted.slice(0, 3)) {
          const base = t.symbol.replace(/^v/, "").replace(/_vUSDC$/, "");
          const px = parseFloat(t.lastPx);
          const change = t.changePct ?? 0;
          send(encoder, controller, {
            ts: formatTs(),
            type: "DATA",
            emoji: change >= 0 ? "📈" : "📉",
            msg: `${base}/USDC ${formatPrice(px)} (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)`
          });
        }
      }

      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "✅", msg: "Pipeline active — monitoring market data and signals" });

      // Fetch and display current signals
      async function checkSignals() {
        const data = await fetchSignals();
        if (!data.signals || data.signals.length === 0) return;
        if (data.updated === lastSignalUpdate) return;
        lastSignalUpdate = data.updated ?? 0;

        send(encoder, controller, { ts: formatTs(), type: "RECALC", emoji: "🔄", msg: `Signal engine update — ${data.signals.length} pairs analyzed` });

        // Show top signal
        const topSignal = data.signals.reduce((best, s) => (s.confidence > best.confidence ? s : best), data.signals[0]);
        if (topSignal) {
          const action = topSignal.action === "HOLD" ? "NO TRADE" : topSignal.action;
          send(encoder, controller, {
            ts: formatTs(),
            type: "SIGNAL",
            emoji: action === "LONG" ? "🟢" : action === "SHORT" ? "🔴" : "🟡",
            msg: `Top signal: ${topSignal.pair} ${action} — ${Math.round(topSignal.confidence)}% confidence`
          });

          if (topSignal.confluence != null) {
            send(encoder, controller, { ts: formatTs(), type: "SIGNAL", emoji: "📊", msg: `Confluence: ${topSignal.confluence}/100 — ${topSignal.regime?.replaceAll("_", " ") ?? "N/A"} regime` });
          }

          if (topSignal.factors && topSignal.factors.length > 0) {
            const top3 = [...topSignal.factors].sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50)).slice(0, 3);
            for (const f of top3) {
              const direction = f.score > 55 ? "▲" : f.score < 45 ? "▼" : "—";
              send(encoder, controller, {
                ts: formatTs(),
                type: "SIGNAL",
                emoji: "📊",
                msg: `${f.name.replaceAll("_", " ")}: ${f.score} ${direction} — ${f.detail}`
              });
            }
          }

          if (topSignal.execution) {
            const exec = topSignal.execution;
            send(encoder, controller, {
              ts: formatTs(),
              type: "SIGNAL",
              emoji: "🎯",
              msg: `Entry: ${formatPrice(exec.entry)} | TP: ${formatPrice(exec.takeProfit)} | SL: ${formatPrice(exec.stopLoss)} | R:R ${exec.riskReward}`
            });
          }

          if (topSignal.setup?.thesis) {
            send(encoder, controller, { ts: formatTs(), type: "SIGNAL", emoji: "💡", msg: `Thesis: ${topSignal.setup.thesis}` });
          }
        }

        // Show all signals summary
        const longs = data.signals.filter(s => s.action === "LONG").length;
        const shorts = data.signals.filter(s => s.action === "SHORT").length;
        const holds = data.signals.filter(s => s.action === "HOLD").length;
        send(encoder, controller, {
          ts: formatTs(),
          type: "DATA",
          emoji: "📊",
          msg: `All signals: ${longs} LONG, ${shorts} SHORT, ${holds} HOLD`
        });
      }

      // Initial signal check
      await checkSignals();

      // Live price updates every 5s
      const priceInterval = setInterval(async () => {
        const freshTickers = await fetchTickers();
        if (freshTickers.length > 0) {
          const btc = freshTickers.find(t => t.symbol.includes("BTC"));
          if (btc) {
            const px = parseFloat(btc.lastPx);
            const change = btc.changePct ?? 0;
            send(encoder, controller, {
              ts: formatTs(),
              type: "DATA",
              emoji: "📊",
              msg: `BTC/USDC ${formatPrice(px)} (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)`
            });
          }
        }
      }, 5000);

      // Check signals every 15s
      const signalInterval = setInterval(checkSignals, 15000);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "💓", msg: "Pipeline heartbeat — all feeds active" });
      }, 30000);

      // Cleanup
      (globalThis as unknown as Record<string, unknown>).__signalLogCleanup = () => {
        clearInterval(priceInterval);
        clearInterval(signalInterval);
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

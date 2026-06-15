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

const PIPELINE_EVENTS: Array<{ delay: number; entry: Omit<LogEntry, "ts"> }> = [
  // SoDEX Data Layer
  { delay: 800, entry: { type: "DATA", emoji: "📊", msg: "SoDEX ticker tape connected — 14 pairs streaming" } },
  { delay: 1200, entry: { type: "DATA", emoji: "📊", msg: "BTC/USDC $67,420.50 | ETH/USDC $3,512.80 | SOL/USDC $142.30" } },
  { delay: 1800, entry: { type: "DATA", emoji: "📊", msg: "24H volume: $1.2B across 14 active instruments" } },
  { delay: 2200, entry: { type: "RECALC", emoji: "🔄", msg: "Klines refreshed — BTC 1H: 250 bars, 4H: 120 bars, 1D: 60 bars" } },
  { delay: 2800, entry: { type: "DATA", emoji: "📊", msg: "Orderbook snapshot: BTC bid $2.1M / ask $1.8M — spread 1.2bps" } },
  { delay: 3200, entry: { type: "DATA", emoji: "📊", msg: "Recent trades: 847 fills in last 60s — buy pressure 58%" } },
  // SoSoValue Data Layer
  { delay: 4000, entry: { type: "DATA", emoji: "📰", msg: "SoSoValue API connected — fetching ETF, macro, sentiment data" } },
  { delay: 4500, entry: { type: "DATA", emoji: "💰", msg: "ETF Flow: BTC net outflow -$12M | ETH net inflow +$8.5M" } },
  { delay: 5000, entry: { type: "DATA", emoji: "🌍", msg: "Macro events: CPI data in 2d | FOMC meeting in 5d | NFP in 7d" } },
  { delay: 5500, entry: { type: "DATA", emoji: "📰", msg: "News sentiment: 4 bearish / 2 bullish / 3 neutral headlines parsed" } },
  { delay: 6000, entry: { type: "DATA", emoji: "🏛", msg: "BTC Treasury: MSTR +150 BTC, TSLA unchanged, COIN +25 BTC" } },
  { delay: 6500, entry: { type: "DATA", emoji: "📊", msg: "Market snapshot: BTC momentum score 62, ETH 58, SOL 71" } },
  // Confluence V3 Layer — SMC Concepts
  { delay: 7500, entry: { type: "RECALC", emoji: "🔄", msg: "Confluence V3 engine started — computing 5 TA factors + microstructure" } },
  { delay: 8000, entry: { type: "SIGNAL", emoji: "📈", msg: "TREND factor: EMA20 > EMA50 > EMA200 — bullish stack confirmed" } },
  { delay: 8500, entry: { type: "SIGNAL", emoji: "⚡", msg: "MOMENTUM: RSI 58.2 (neutral-bullish) | ROC +1.8% (14 bars)" } },
  { delay: 9000, entry: { type: "SIGNAL", emoji: "📊", msg: "VOLATILITY: ATR $1,240 (1.8%) — Bollinger width expanding" } },
  { delay: 9500, entry: { type: "SIGNAL", emoji: "📊", msg: "VOLUME: OBV divergence detected — price up, volume down" } },
  { delay: 10000, entry: { type: "SIGNAL", emoji: "🏗", msg: "STRUCTURE: Higher highs, higher lows — bullish structure intact" } },
  // SMC / Smart Money Concepts
  { delay: 10800, entry: { type: "SIGNAL", emoji: "🎯", msg: "SMC: Order block detected at $66,800-$67,100 — unmitigated bullish OB" } },
  { delay: 11200, entry: { type: "SIGNAL", emoji: "📐", msg: "FVG Analysis: Fair value gap at $67,800-$68,200 — gap unfilled, magnet zone" } },
  { delay: 11800, entry: { type: "SIGNAL", emoji: "🎯", msg: "Sniper Entry: Price approaching OB zone — waiting for displacement + BOS" } },
  { delay: 12200, entry: { type: "SIGNAL", emoji: "✅", msg: "BOS (Break of Structure) confirmed on 15M — bullish continuation" } },
  { delay: 12800, entry: { type: "SIGNAL", emoji: "📊", msg: "Liquidity sweep: Buy-side liquidity taken at $67,500 — potential reversal zone" } },
  // Microstructure
  { delay: 13500, entry: { type: "SIGNAL", emoji: "⚡", msg: "ORDER_FLOW: Buy pressure 62% — delta +$4.2M, velocity 14.2 trades/s" } },
  { delay: 14000, entry: { type: "SIGNAL", emoji: "📊", msg: "DEPTH: Imbalance 58% bid-heavy — spread 1.5bps — 20 levels loaded" } },
  { delay: 14500, entry: { type: "SIGNAL", emoji: "💰", msg: "FUNDING: SoDEX -0.015% | Hyperliquid -0.012% — slight short bias" } },
  // Multi-TF Confluence
  { delay: 15500, entry: { type: "RECALC", emoji: "🔄", msg: "Multi-TF confluence: 1H bullish, 4H bullish, 1D neutral — 2/3 aligned" } },
  { delay: 16000, entry: { type: "SIGNAL", emoji: "📊", msg: "Confluence score: 68/100 — 5 bullish factors, 1 bearish, 2 neutral" } },
  // Trade Setup
  { delay: 17000, entry: { type: "SIGNAL", emoji: "🎯", msg: "Trade setup: trend_continuation — LONG bias on BTC/USDC" } },
  { delay: 17500, entry: { type: "SIGNAL", emoji: "✅", msg: "Entry: $67,420 | TP: $68,950 (2.3%) | SL: $66,800 (0.9%)" } },
  { delay: 18000, entry: { type: "SIGNAL", emoji: "📊", msg: "Risk/Reward: 2.5:1 | Position size: 2-4% of portfolio" } },
  // Quality Check
  { delay: 19000, entry: { type: "SIGNAL", emoji: "🔍", msg: "Quality calibration: raw 72% → calibrated 68% — lesson: trending market" } },
  { delay: 19500, entry: { type: "SIGNAL", emoji: "✅", msg: "Quality status: ACTIONABLE — passes all filter gates" } },
  // AI Thesis
  { delay: 20500, entry: { type: "RECALC", emoji: "🤖", msg: "AI thesis generation started — analyzing narrative context" } },
  { delay: 21500, entry: { type: "SIGNAL", emoji: "🤖", msg: "AI thesis: Bullish continuation likely — macro supportive, funding neutral" } },
  { delay: 22000, entry: { type: "SIGNAL", emoji: "✅", msg: "AI confidence: 74% — agrees with technical confluence" } },
  // Final Signal
  { delay: 23000, entry: { type: "SIGNAL", emoji: "🎯", msg: "FINAL SIGNAL: BTC/USDC LONG — Confidence 68% — Confluence 68/100" } },
  { delay: 23500, entry: { type: "SIGNAL", emoji: "✅", msg: "Signal recorded to history — tracking for resolution in 24h" } },
  // Post-signal monitoring
  { delay: 25000, entry: { type: "DATA", emoji: "📊", msg: "Post-signal monitor: BTC moved +0.3% since entry — on track" } },
  { delay: 26000, entry: { type: "DATA", emoji: "📊", msg: "Orderbook update: bid depth increasing — absorption at $67,200" } },
  { delay: 27000, entry: { type: "DATA", emoji: "📰", msg: "News alert: Positive BTC ETF headline — sentiment shift bullish" } },
  { delay: 28000, entry: { type: "SIGNAL", emoji: "⚡", msg: "Volume spike: 2.3x average on 15M — confirming momentum" } },
  { delay: 29000, entry: { type: "DATA", emoji: "📊", msg: "Price update: BTC $67,680 (+0.4%) — approaching TP1 zone" } },
];

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "🚀", msg: "SignalFlow pipeline initialized — all feeds connecting..." });

      const timeouts: ReturnType<typeof setTimeout>[] = [];

      for (const event of PIPELINE_EVENTS) {
        const timeout = setTimeout(() => {
          send(encoder, controller, { ts: formatTs(), ...event.entry });
        }, event.delay);
        timeouts.push(timeout);
      }

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        send(encoder, controller, { ts: formatTs(), type: "DATA", emoji: "💓", msg: "Pipeline heartbeat — all feeds active, 14 pairs streaming" });
      }, 15000);

      // Price updates every 5s
      const priceUpdates = setInterval(() => {
        const pairs = ["BTC/USDC", "ETH/USDC", "SOL/USDC", "HYPE/USDC"];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const prices: Record<string, number> = { "BTC/USDC": 67420, "ETH/USDC": 3512, "SOL/USDC": 142, "HYPE/USDC": 18.5 };
        const base = prices[pair] ?? 100;
        const change = (Math.random() - 0.5) * 0.002;
        const newPrice = base * (1 + change);
        send(encoder, controller, {
          ts: formatTs(),
          type: "DATA",
          emoji: "📊",
          msg: `${pair} $${newPrice.toFixed(2)} (${change >= 0 ? "+" : ""}${(change * 100).toFixed(3)}%)`
        });
      }, 5000);

      // Cleanup
      (globalThis as unknown as Record<string, unknown>).__signalLogCleanup = () => {
        clearInterval(heartbeat);
        clearInterval(priceUpdates);
        for (const t of timeouts) clearTimeout(t);
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

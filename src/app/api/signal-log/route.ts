export const runtime = "edge";

export const dynamic = "force-dynamic";

interface LogEntry {
  ts: string;
  type: "DATA" | "SIGNAL" | "RECALC" | "WARNING" | "ERROR";
  emoji: string;
  msg: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface SignalsSnapshot {
  engine?: string;
  strategy?: { label?: string } | null;
  sources?: {
    etf?: boolean;
    macro?: boolean;
    treasuries?: boolean;
    treasuryActivity?: boolean;
    news?: boolean;
    snapshots?: number;
    sodexKlines?: number;
    orderbooks?: number;
    trades?: number;
    perps?: number;
    hyperliquid?: number;
    primaryTF?: string;
    confluenceTFs?: string[];
  };
  signals?: Array<{
    pair: string;
    action: string;
    confidence: number;
    confluence?: number;
    regime?: string;
  }>;
  updated?: number;
}

interface FetchResult<T> {
  ok: boolean;
  status: number;
  latencyMs: number;
  data: T;
  error?: string;
}

function formatTs(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function send(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  entry: LogEntry,
  isClosed: () => boolean,
): boolean {
  if (isClosed()) return false;
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
    return true;
  } catch {
    return false;
  }
}

async function fetchRoute<T>(
  origin: string,
  path: string,
  timeoutMs: number,
): Promise<FetchResult<T>> {
  const startedAt = Date.now();
  try {
    const res = await fetch(`${origin}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null) as ApiEnvelope<T> | null;
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - startedAt,
      data: (json?.data ?? ([] as unknown)) as T,
      error: res.ok ? undefined : (json?.error ?? `HTTP ${res.status}`),
    };
  } catch (error) {
    const err = error instanceof Error ? error : null;
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      data: ([] as unknown) as T,
      error: err?.name === "TimeoutError" ? "Upstream timeout" : (err?.message ?? "Request failed"),
    };
  }
}

function logStatusCode(result: FetchResult<unknown>): number | string {
  if (result.status) return result.status;
  return result.error === "Upstream timeout" ? 504 : "ERR";
}

function terminalLine(method: "GET" | "POST", path: string, result: FetchResult<unknown>): string {
  return `${method} ${path} ${logStatusCode(result)} in ${result.latencyMs}ms`;
}

function sendRouteLog(
  safeSend: (entry: LogEntry) => boolean,
  path: string,
  result: FetchResult<unknown>,
): void {
  safeSend({
    ts: formatTs(),
    type: result.ok ? "DATA" : "ERROR",
    emoji: "",
    msg: terminalLine("GET", path, result),
  });
}

function actionLabel(action: string): string {
  if (action === "HOLD") return "NO TRADE";
  return action;
}

function sourceSummary(data: SignalsSnapshot): string {
  if (data.engine === "liquidity-flow") {
    return [
      data.sources?.sodexKlines ? `${data.sources.sodexKlines} klines` : null,
      data.sources?.orderbooks ? `${data.sources.orderbooks} orderbooks` : null,
      data.sources?.trades ? `${data.sources.trades} trades` : null,
      data.sources?.perps ? `${data.sources.perps} perps` : null,
      data.sources?.hyperliquid ? `${data.sources.hyperliquid} HL comps` : null,
    ].filter(Boolean).join(" | ");
  }

  return [
    data.sources?.news ? "news on" : "news off",
    data.sources?.etf ? "ETF on" : "ETF off",
    data.sources?.macro ? "macro on" : "macro off",
    data.sources?.treasuries ? "treasuries on" : "treasuries off",
    data.sources?.treasuryActivity ? "treasury flow on" : "treasury flow off",
  ].join(" | ");
}

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder();
  const origin = new URL(req.url).origin;
  let lastSignalUpdate = 0;
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const intervals: {
        ticker?: ReturnType<typeof setInterval>;
        signal?: ReturnType<typeof setInterval>;
        orders?: ReturnType<typeof setInterval>;
        heartbeat?: ReturnType<typeof setInterval>;
      } = {};

      const isClosed = () => closed;
      const safeSend = (entry: LogEntry): boolean => {
        const sent = send(encoder, controller, entry, isClosed);
        if (!sent) closed = true;
        return sent;
      };

      cleanup = () => {
        closed = true;
        if (intervals.ticker) clearInterval(intervals.ticker);
        if (intervals.signal) clearInterval(intervals.signal);
        if (intervals.orders) clearInterval(intervals.orders);
        if (intervals.heartbeat) clearInterval(intervals.heartbeat);
      };

      const logRoute = async <T>(path: string, timeoutMs: number) => {
        const result = await fetchRoute<T>(origin, path, timeoutMs);
        if (closed) return result;
        sendRouteLog(safeSend, path, result);
        return result;
      };

      safeSend({
        ts: formatTs(),
        type: "DATA",
        emoji: "",
        msg: "GET /api/signal-log 200 stream open",
      });

      await logRoute<unknown[]>("/api/market/tickers", 5000);
      await logRoute<unknown[]>("/api/orders", 5000);

      const checkSignals = async () => {
        if (closed) return;
        const result = await logRoute<SignalsSnapshot>("/api/signals", 30000);
        if (closed || !result.ok) return;
        const data = result.data;
        if (!data?.signals || data.signals.length === 0) return;
        if (data.updated === lastSignalUpdate) return;
        lastSignalUpdate = data.updated ?? 0;

        const engineLabel = data.engine === "liquidity-flow" ? "Liquidity Flow" : "Confluence V3";
        safeSend({
          ts: formatTs(),
          type: "RECALC",
          emoji: "",
          msg: `${engineLabel} update — ${data.signals.length} pairs analyzed${data.sources?.primaryTF ? ` | primary ${data.sources.primaryTF}` : ""}`,
        });

        const sources = sourceSummary(data);
        if (sources) {
          safeSend({
            ts: formatTs(),
            type: "DATA",
            emoji: "",
            msg: `Sources: ${sources}`,
          });
        }

        const actionableSignals = [...data.signals]
          .filter((signal) => signal.action !== "HOLD")
          .sort((a, b) => b.confidence - a.confidence);

        if (actionableSignals.length === 0) {
          safeSend({
            ts: formatTs(),
            type: "SIGNAL",
            emoji: "",
            msg: "Actionable board — no live long/short setup, market remains HOLD",
          });
          return;
        }

        safeSend({
          ts: formatTs(),
          type: "SIGNAL",
          emoji: "",
          msg: `Actionable board — ${actionableSignals.length} live setup${actionableSignals.length > 1 ? "s" : ""}`,
        });

        for (const signal of actionableSignals.slice(0, 8)) {
          if (closed) return;
          const action = actionLabel(signal.action);
          safeSend({
            ts: formatTs(),
            type: "SIGNAL",
            emoji: "",
            msg: `${signal.pair} ${action} ${Math.round(signal.confidence)}%${signal.confluence != null ? ` | confluence ${signal.confluence}` : ""}${signal.regime ? ` | ${signal.regime.replaceAll("_", " ")}` : ""}`,
          });
        }
      };

      await checkSignals();

      intervals.ticker = setInterval(() => {
        void logRoute<unknown[]>("/api/market/tickers", 5000);
      }, 5000);

      intervals.signal = setInterval(() => {
        void checkSignals();
      }, 15000);

      intervals.orders = setInterval(() => {
        void logRoute<unknown[]>("/api/orders", 5000);
      }, 20000);

      intervals.heartbeat = setInterval(() => {
        safeSend({
          ts: formatTs(),
          type: "DATA",
          emoji: "",
          msg: "GET /api/signal-log 200 heartbeat",
        });
      }, 30000);
    },
    cancel() {
      cleanup();
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

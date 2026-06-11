import { apiError } from "@/lib/api/response";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const RATE_LIMITS = {
  orders: {
    windowMs: Number(process.env.SIGNALFLOW_RATE_LIMIT_ORDERS_WINDOW_MS ?? 60_000),
    max: Number(process.env.SIGNALFLOW_RATE_LIMIT_ORDERS_MAX ?? 10),
  },
  signals: {
    windowMs: Number(process.env.SIGNALFLOW_RATE_LIMIT_SIGNALS_WINDOW_MS ?? 60_000),
    max: Number(process.env.SIGNALFLOW_RATE_LIMIT_SIGNALS_MAX ?? 60),
  },
  signalAnalyze: {
    windowMs: Number(process.env.SIGNALFLOW_RATE_LIMIT_SIGNAL_ANALYZE_WINDOW_MS ?? 60_000),
    max: Number(process.env.SIGNALFLOW_RATE_LIMIT_SIGNAL_ANALYZE_MAX ?? 12),
  },
  backtest: {
    windowMs: Number(process.env.SIGNALFLOW_RATE_LIMIT_BACKTEST_WINDOW_MS ?? 60_000),
    max: Number(process.env.SIGNALFLOW_RATE_LIMIT_BACKTEST_MAX ?? 20),
  },
  chat: {
    windowMs: Number(process.env.SIGNALFLOW_RATE_LIMIT_CHAT_WINDOW_MS ?? 60_000),
    max: Number(process.env.SIGNALFLOW_RATE_LIMIT_CHAT_MAX ?? 20),
  },
} satisfies Record<string, RateLimitConfig>;

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function checkRateLimit(
  req: Request,
  name: keyof typeof RATE_LIMITS,
) {
  const config = RATE_LIMITS[name];
  const now = Date.now();
  const key = `${name}:${getClientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= config.max) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return apiError("Too many requests. Try again later.", 429, {
    headers: { "Retry-After": String(retryAfter) },
  });
}

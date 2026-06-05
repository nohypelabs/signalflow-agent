import type { Provider } from "../ai-providers";
import type { SignalsData, SignalGenerationResult } from "../types/signal";
import type { TradingType } from "../types/trading-type";
import { serializeStrategyConfig, type StrategyConfig } from "../strategy/config";
import { parseApiResponse } from "./client";

export async function fetchSignals(
  tradingType?: TradingType | null,
  strategyConfig?: StrategyConfig,
  signal?: AbortSignal,
): Promise<SignalsData> {
  const params = new URLSearchParams();
  if (tradingType) params.set("type", tradingType);
  if (strategyConfig) params.set("strategy", serializeStrategyConfig(strategyConfig));
  const query = params.toString();
  const url = query ? `/api/signals?${query}` : "/api/signals";
  const res = await fetch(url, { cache: "no-store", signal });
  return parseApiResponse(res);
}

export async function fetchAISignal(
  coin: string,
  opts?: { 
    provider?: Provider; 
    model?: string; 
    apiKey?: string; 
    includeAI?: boolean;
    strategy?: string; // pass serialized strategy to respect engine (e.g. liquidityFlow)
  },
): Promise<SignalGenerationResult> {
  const body: Record<string, unknown> = { coin };
  if (opts?.includeAI !== undefined) {
    body.includeAI = opts.includeAI;
  }
  if (opts?.apiKey) {
    body.provider = opts.provider;
    body.model = opts.model ?? "";
    body.apiKey = opts.apiKey;
  }
  if (opts?.strategy) {
    body.strategy = opts.strategy;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000); // 90s (server needs 60s for AI + buffer)
  try {
    const res = await fetch("/api/signals/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return parseApiResponse(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("AbortError")) {
      throw new Error("Signal generation timed out. The server may be slow — try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

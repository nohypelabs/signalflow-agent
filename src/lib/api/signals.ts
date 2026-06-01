import type { Provider } from "../ai-providers";
import type { SignalsData, SignalGenerationResult } from "../types/signal";
import type { TradingType } from "../types/trading-type";
import { parseApiResponse } from "./client";

export async function fetchSignals(tradingType?: TradingType | null): Promise<SignalsData> {
  const url = tradingType
    ? `/api/signals?type=${tradingType}`
    : "/api/signals";
  const res = await fetch(url, { cache: "no-store" });
  return parseApiResponse(res);
}

export async function fetchAISignal(
  coin: string,
  opts?: { provider?: Provider; model?: string; apiKey?: string; includeAI?: boolean },
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
  const res = await fetch("/api/signals/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseApiResponse(res);
}

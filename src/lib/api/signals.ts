import type { Provider } from "../ai-providers";
import type { SignalsData, SignalGenerationResult } from "../types/signal";
import type { TradingType } from "../types/trading-type";

export async function fetchSignals(tradingType?: TradingType | null): Promise<SignalsData> {
  const url = tradingType
    ? `/api/signals?type=${tradingType}`
    : "/api/signals";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

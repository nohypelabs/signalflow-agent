import type { SignalsData, SignalGenerationResult } from "../types/signal";

export async function fetchSignals(): Promise<SignalsData> {
  const res = await fetch("/api/signals", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAISignal(
  coin: string,
  opts?: { provider?: string; model?: string; apiKey?: string; includeAI?: boolean },
): Promise<SignalGenerationResult> {
  const body: Record<string, unknown> = { coin };
  if (opts?.includeAI !== undefined) {
    body.includeAI = opts.includeAI;
  }
  if (opts?.apiKey) {
    body.provider = opts.provider ?? "";
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

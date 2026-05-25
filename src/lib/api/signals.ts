import type { SignalsData } from "../types/signal";

export async function fetchSignals(): Promise<SignalsData> {
  const res = await fetch("/api/signals");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAISignal(
  coin: string,
  opts?: { provider?: string; model?: string; apiKey?: string },
): Promise<Record<string, unknown>> {
  const body: Record<string, string> = { coin };
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

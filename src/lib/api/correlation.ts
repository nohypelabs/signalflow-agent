import { parseApiResponse } from "./client";

export interface CorrelationData {
  matrix: number[][];
  symbols: string[];
  updated: number;
}

export async function fetchCorrelation(
  symbols?: string[],
  timeframe?: string,
  limit?: number,
): Promise<CorrelationData> {
  const qs = new URLSearchParams();
  if (symbols?.length) qs.set("symbols", symbols.join(","));
  if (timeframe) qs.set("timeframe", timeframe);
  if (limit) qs.set("limit", String(limit));

  const res = await fetch(`/api/correlation?${qs.toString()}`, { cache: "no-store" });
  return parseApiResponse(res);
}

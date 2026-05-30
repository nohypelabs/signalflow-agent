export interface ScreenerPair {
  symbol: string;
  displayName: string;
  baseCoin: string;
  quoteCoin: string;
  price: number;
  change24h: number;
  volume24h: number;
  quoteVolume24h: number;
  high24h: number;
  low24h: number;
  bid: number;
  ask: number;
  spread: number;
  marketcap: number;
  marketcapRank: number;
  category: string;
  status: string;
}

export interface ScreenerData {
  pairs: ScreenerPair[];
  total: number;
  updated: number;
}

export async function fetchScreener(params?: {
  category?: string;
  sortBy?: string;
  sortDir?: string;
  minVolume?: number;
  status?: string;
}): Promise<ScreenerData> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortDir) qs.set("sortDir", params.sortDir);
  if (params?.minVolume) qs.set("minVolume", String(params.minVolume));
  if (params?.status) qs.set("status", params.status);

  const res = await fetch(`/api/screener?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

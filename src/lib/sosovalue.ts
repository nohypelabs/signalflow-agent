const BASE = "https://openapi.sosovalue.com/openapi/v1";

function apiKey(): string {
  return process.env.SOSOVALUE_API_KEY || "";
}

async function sosoFetch<T>(path: string, params?: Record<string, string>, retries = 3, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v);
    });
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (attempt > 0) {
      // Shorter backoff + respect abort: 1s, 2s, 4s (previous 5/10/20 too long vs caller timeouts)
      const backoff = 1000 * Math.pow(2, attempt - 1);
      await new Promise((r, reject) => {
        const t = setTimeout(r, backoff);
        signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
      });
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    }

    const res = await fetch(url.toString(), {
      headers: { "x-soso-api-key": apiKey(), Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = new Error(`SoSoValue ${res.status}: ${text}`);
      continue;
    }

    const json = await res.json();

    // Rate limit: code 402901 — retry with backoff
    if (json.code === 402901 && attempt < retries) {
      lastError = new Error(json.message || "Rate limited");
      continue;
    }

    if (json.code !== 0) throw new Error(json.message || "SoSoValue error");
    return json.data as T;
  }

  throw lastError ?? new Error("SoSoValue fetch failed");
}

// ── Types ──────────────────────────────────────────────

export interface CurrencyInfo {
  currency_id: string;
  symbol: string;
  name: string;
}

export interface MarketSnapshot {
  price: number;
  change_pct_24h: number;
  turnover_24h: number;
  marketcap: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  down_from_ath: string;
  marketcap_rank: number;
}

export interface ETFSummaryItem {
  date: string;
  total_net_inflow: number;
  total_value_traded: number;
  total_net_assets: number;
  cum_net_inflow: number;
}

export interface ETFInfo {
  ticker: string;
  name: string;
  exchange: string;
}

export interface MacroEvent {
  date: string;
  events: string[];
}

export interface MacroEventHistory {
  date: string;
  actual: string;
  forecast: string;
  previous: string;
}

export interface BTCTreasuryCompany {
  ticker: string;
  name: string;
  list_location: string;
}

export interface BTCPurchaseHistory {
  date: string;
  ticker: string;
  btc_holding: number;
  btc_acq: number;
  acq_cost: number;
  avg_btc_cost: number;
}

export interface NewsItem {
  id: number;
  source_link: string;
  release_time: number;
  title: string;
  content: string;
  matched_currencies: Array<{ currency_id: string; symbol: string }> | null;
  tags: Array<{ name: string }> | null;
}

export interface KlineItem {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ── Currency ───────────────────────────────────────────

export function getCurrencies(signal?: AbortSignal) {
  return sosoFetch<CurrencyInfo[]>("/currencies", undefined, 3, signal);
}

export function getMarketSnapshot(currencyId: string, signal?: AbortSignal) {
  return sosoFetch<MarketSnapshot>(`/currencies/${currencyId}/market-snapshot`, undefined, 3, signal);
}

export function getKlines(currencyId: string, interval = "1d", limit = 100, signal?: AbortSignal) {
  return sosoFetch<KlineItem[]>(
    `/currencies/${currencyId}/klines?interval=${interval}&limit=${limit}`,
    undefined,
    3,
    signal,
  );
}

// ── ETF ────────────────────────────────────────────────

export function getETFSummary(symbol = "BTC", countryCode = "US", limit = 30, signal?: AbortSignal) {
  return sosoFetch<ETFSummaryItem[]>(
    `/etfs/summary-history?symbol=${symbol}&country_code=${countryCode}&limit=${limit}`,
    undefined,
    3,
    signal,
  );
}

export function getETFList(symbol: string, countryCode = "US") {
  return sosoFetch<ETFInfo[]>(`/etfs?symbol=${symbol}&country_code=${countryCode}`);
}

// ── Macro ──────────────────────────────────────────────

export function getMacroEvents(signal?: AbortSignal) {
  return sosoFetch<MacroEvent[]>("/macro/events", undefined, 3, signal);
}

export function getMacroEventHistory(eventName: string, limit = 30) {
  return sosoFetch<MacroEventHistory[]>(
    `/macro/events/${encodeURIComponent(eventName)}/history?limit=${limit}`,
  );
}

// ── BTC Treasuries ─────────────────────────────────────

export function getBTCTreasuries(signal?: AbortSignal) {
  return sosoFetch<BTCTreasuryCompany[]>("/btc-treasuries", undefined, 3, signal);
}

function toFiniteNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getBTCPurchaseHistory(ticker: string, limit = 50, signal?: AbortSignal): Promise<BTCPurchaseHistory[]> {
  const raw = await sosoFetch<Record<string, unknown>[]>(
    `/btc-treasuries/${ticker}/purchase-history?limit=${limit}`,
    undefined,
    3,
    signal,
  ).catch(() => [] as Record<string, unknown>[]);
  return (raw || []).map((p) => ({
    date: String(p?.date ?? ""),
    ticker: String(p?.ticker ?? ""),
    btc_holding: toFiniteNumber(p?.btc_holding),
    btc_acq: toFiniteNumber(p?.btc_acq),
    acq_cost: toFiniteNumber(p?.acq_cost),
    avg_btc_cost: toFiniteNumber(p?.avg_btc_cost),
  }));
}

// ── News ───────────────────────────────────────────────

export function getNewsHot(page = 1, pageSize = 20, signal?: AbortSignal) {
  return sosoFetch<{ list: NewsItem[]; page: number; page_size: number; total: number }>(
    `/news/hot?page=${page}&page_size=${pageSize}`,
    undefined,
    3,
    signal,
  );
}

// ── Indices ────────────────────────────────────────────

export function getIndexSnapshot(indexTicker: string, signal?: AbortSignal) {
  return sosoFetch<{
    price: number;
    change_pct_24h: number;
    roi_7d: number;
    roi_1m: number;
    roi_3m: number;
    roi_1y: number;
    ytd: number;
  }>(`/indices/${indexTicker}/market-snapshot`, undefined, 3, signal);
}

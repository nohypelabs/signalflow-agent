const BASE = "https://openapi.sosovalue.com/openapi/v1";

function apiKey(): string {
  return process.env.SOSOVALUE_API_KEY || "";
}

async function sosoFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    headers: { "x-soso-api-key": apiKey(), Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SoSoValue ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || "SoSoValue error");
  return json.data as T;
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

export interface ETFSnapshot {
  date: number;
  ticker: string;
  net_inflow: number;
  cum_inflow: number;
  net_assets: number;
  mkt_price: number;
  prem_dsc: number;
  value_traded: number;
  volume: number;
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

export function getCurrencies() {
  return sosoFetch<CurrencyInfo[]>("/currencies");
}

export function getMarketSnapshot(currencyId: string) {
  return sosoFetch<MarketSnapshot>(`/currencies/${currencyId}/market-snapshot`);
}

export function getKlines(currencyId: string, interval = "1d", limit = 100) {
  return sosoFetch<KlineItem[]>(
    `/currencies/${currencyId}/klines?interval=${interval}&limit=${limit}`,
  );
}

// ── ETF ────────────────────────────────────────────────

export function getETFSummary(symbol = "BTC", countryCode = "US", limit = 30) {
  return sosoFetch<ETFSummaryItem[]>(
    `/etfs/summary-history?symbol=${symbol}&country_code=${countryCode}&limit=${limit}`,
  );
}

export function getETFList(symbol: string, countryCode = "US") {
  return sosoFetch<ETFInfo[]>(`/etfs?symbol=${symbol}&country_code=${countryCode}`);
}

// ── Macro ──────────────────────────────────────────────

export function getMacroEvents() {
  return sosoFetch<MacroEvent[]>("/macro/events");
}

export function getMacroEventHistory(eventName: string, limit = 30) {
  return sosoFetch<MacroEventHistory[]>(
    `/macro/events/${encodeURIComponent(eventName)}/history?limit=${limit}`,
  );
}

// ── BTC Treasuries ─────────────────────────────────────

export function getBTCTreasuries() {
  return sosoFetch<BTCTreasuryCompany[]>("/btc-treasuries");
}

export function getBTCPurchaseHistory(ticker: string, limit = 50) {
  return sosoFetch<BTCPurchaseHistory[]>(
    `/btc-treasuries/${ticker}/purchase-history?limit=${limit}`,
  );
}

// ── News ───────────────────────────────────────────────

export function getNewsHot(page = 1, pageSize = 20) {
  return sosoFetch<{ list: NewsItem[]; page: number; page_size: number; total: number }>(
    `/news/hot?page=${page}&page_size=${pageSize}`,
  );
}

// ── Indices ────────────────────────────────────────────

export function getIndexSnapshot(indexTicker: string) {
  return sosoFetch<{
    price: number;
    change_pct_24h: number;
    roi_7d: number;
    roi_1m: number;
    roi_3m: number;
    roi_1y: number;
    ytd: number;
  }>(`/indices/${indexTicker}/market-snapshot`);
}

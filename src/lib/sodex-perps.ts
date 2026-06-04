const MAINNET_PERPS = "https://mainnet-gw.sodex.dev/api/v1/perps";
const TESTNET_PERPS = "https://testnet-gw.sodex.dev/api/v1/perps";

export interface SoDEXPerpsTicker {
  symbol: string;
  lastPx: string;
  openPx: string;
  highPx: string;
  lowPx: string;
  volume: string;
  quoteVolume: string;
  change: string;
  changePct: number;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
  openTime: number;
  closeTime: number;
  fundingRate: string;
  nextFundingTime: number;
  indexPrice: string;
  markPrice: string;
  openInterest: string;
}

export interface SoDEXPerpsOrderBook {
  blockTime: number;
  blockHeight: number;
  updateID: number;
  bids: [string, string][];
  asks: [string, string][];
}

export interface SoDEXPerpsPosition {
  symbol?: string;
  side?: string;
  positionSide?: string;
  quantity?: string;
  size?: string;
  positionAmt?: string;
  entryPrice?: string;
  markPrice?: string;
  liquidationPrice?: string;
  unrealizedPnl?: string;
  unrealizedPnL?: string;
  leverage?: string | number;
  marginMode?: string;
  [key: string]: unknown;
}

export interface SoDEXPerpsPositions {
  blockTime: number;
  blockHeight: number;
  positions: SoDEXPerpsPosition[];
}

function perpsBaseUrl(): string {
  return process.env.SODEX_NETWORK === "testnet" ? TESTNET_PERPS : MAINNET_PERPS;
}

async function perpsFetch<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  const url = new URL(`${perpsBaseUrl()}${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as {
    code?: number;
    error?: string;
    message?: string;
    data?: T;
  } | null;

  if (!response.ok || !body || body.code !== 0 || body.data === undefined) {
    throw new Error(
      body?.error || body?.message || `SoDEX Perps ${response.status}`,
    );
  }

  return body.data;
}

export function toPerpsSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error("SoDEX perps symbol is required");

  if (normalized.includes("-")) {
    const [base] = normalized.split("-");
    return `${base}-USD`;
  }

  const [rawBase, quote] = normalized.split(/[_/]/);
  const base = quote === "VUSDC" && rawBase.startsWith("V")
    ? rawBase.slice(1)
    : rawBase;
  if (!base) throw new Error("SoDEX perps symbol is invalid");

  return `${base}-USD`;
}

export function perpsBaseSymbol(symbol: string): string {
  return toPerpsSymbol(symbol).split("-")[0];
}

export function getPerpsTickers(symbol?: string) {
  return perpsFetch<SoDEXPerpsTicker[]>(
    "/markets/tickers",
    symbol ? { symbol: toPerpsSymbol(symbol) } : undefined,
  );
}

export function getPerpsOrderbook(symbol: string, limit?: number) {
  const perpsSymbol = toPerpsSymbol(symbol);
  return perpsFetch<SoDEXPerpsOrderBook>(
    `/markets/${encodeURIComponent(perpsSymbol)}/orderbook`,
    limit ? { limit: String(limit) } : undefined,
  );
}

export function getPerpsPositions(userAddress: string, accountID?: number) {
  return perpsFetch<SoDEXPerpsPositions>(
    `/accounts/${encodeURIComponent(userAddress)}/positions`,
    accountID !== undefined ? { accountID: String(accountID) } : undefined,
  );
}

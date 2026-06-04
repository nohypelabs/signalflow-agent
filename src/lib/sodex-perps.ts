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

// ── Authenticated perps trading ──────────────────────────

export interface PerpsOrderParams {
  accountID: number;
  symbolID: number;
  clOrdID?: string;
  side: 1 | 2;           // 1 = buy, 2 = sell
  type: 1 | 2 | 3 | 4;  // 1 = limit, 2 = market, 3 = stop_market, 4 = take_profit_market
  quantity: string;
  price?: string;
  stopPrice?: string;
  reduceOnly?: boolean;
  positionSide: 1 | 2 | 3; // 1 = long, 2 = short, 3 = both (hedge mode)
  timeInForce?: 1 | 2 | 3 | 4; // 1 = GTC, 2 = IOC, 3 = FOK, 4 = post_only
}

interface PerpsOrderResponse {
  orderID?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Place a perps order on SoDEX.
 *
 * Auth headers required by SoDEX perps API:
 * - X-API-Key: API key name string
 * - X-API-Sign: 0x01 prefix + 65-byte EIP-712 signature
 * - X-API-Nonce: monotonic Unix ms timestamp
 *
 * The signing domain is { name: "futures", version: "1", chainId: 286623 }.
 * The signed struct is ExchangeAction { payloadHash, nonce }
 * where payloadHash = keccak256(compactJSON({type, params})).
 */
export async function placePerpOrder(
  params: PerpsOrderParams,
  auth: { apiKeyName: string; apiKeyPrivate: string },
): Promise<PerpsOrderResponse> {
  const url = `${perpsBaseUrl()}/trade/orders`;

  const orderBody = {
    accountID: params.accountID,
    symbolID: params.symbolID,
    orders: [
      {
        clOrdID: params.clOrdID ?? `sf-${Date.now()}`,
        modifier: 1,
        side: params.side,
        type: params.type,
        timeInForce: params.timeInForce ?? (params.type === 2 ? 3 : 1),
        ...(params.price ? { price: params.price } : {}),
        quantity: params.quantity,
        ...(params.stopPrice ? { stopPrice: params.stopPrice } : {}),
        reduceOnly: params.reduceOnly ?? false,
        positionSide: params.positionSide,
      },
    ],
  };

  // Sign the payload with API key private key
  const { privateKeyToAccount } = await import("viem/accounts");
  const { keccak256, toBytes } = await import("viem");

  const account = privateKeyToAccount(auth.apiKeyPrivate as `0x${string}`);
  const payloadJson = JSON.stringify({ type: "newOrder", params: orderBody });
  const payloadHash = keccak256(toBytes(payloadJson));
  const nonce = Date.now();

  const domain = { name: "futures", version: "1", chainId: 286623 as const, verifyingContract: "0x0000000000000000000000000000000000000000" as const };
  const types = {
    ExchangeAction: [
      { name: "payloadHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "ExchangeAction",
    message: { payloadHash, nonce: BigInt(nonce) },
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": auth.apiKeyName,
      "X-API-Sign": `0x01${signature.slice(2)}`,
      "X-API-Nonce": String(nonce),
    },
    body: JSON.stringify(orderBody),
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as {
    code?: number;
    error?: string;
    message?: string;
    data?: PerpsOrderResponse;
  } | null;

  if (!response.ok || !body || body.code !== 0) {
    throw new Error(
      body?.error || body?.message || `SoDEX perps order failed ${response.status}`,
    );
  }

  return (body.data ?? body) as PerpsOrderResponse;
}

/**
 * Cancel a perps order on SoDEX.
 */
export async function cancelPerpOrder(
  params: { accountID: number; symbolID: number; orderID: string },
  auth: { apiKeyName: string; apiKeyPrivate: string },
): Promise<unknown> {
  const url = `${perpsBaseUrl()}/trade/orders`;

  const cancelBody = {
    accountID: params.accountID,
    symbolID: params.symbolID,
    orderID: params.orderID,
  };

  const { privateKeyToAccount } = await import("viem/accounts");
  const { keccak256, toBytes } = await import("viem");

  const account = privateKeyToAccount(auth.apiKeyPrivate as `0x${string}`);
  const payloadJson = JSON.stringify({ type: "cancelOrder", params: cancelBody });
  const payloadHash = keccak256(toBytes(payloadJson));
  const nonce = Date.now();

  const domain = { name: "futures", version: "1", chainId: 286623 as const, verifyingContract: "0x0000000000000000000000000000000000000000" as const };
  const types = {
    ExchangeAction: [
      { name: "payloadHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "ExchangeAction",
    message: { payloadHash, nonce: BigInt(nonce) },
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": auth.apiKeyName,
      "X-API-Sign": `0x01${signature.slice(2)}`,
      "X-API-Nonce": String(nonce),
    },
    body: JSON.stringify({ type: "cancelOrder", params: cancelBody }),
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as {
    code?: number;
    error?: string;
    message?: string;
  } | null;

  if (!response.ok || !body || body.code !== 0) {
    throw new Error(
      body?.error || body?.message || `SoDEX perps cancel failed ${response.status}`,
    );
  }

  return body;
}

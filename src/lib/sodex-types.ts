// Separate from sodex.ts so client components can import types
// without pulling in process.env references from the fetch client.

export interface SoDEXTicker {
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
}

export interface SoDEXKline {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  q: string;
}

export interface SoDEXSymbol {
  id: number;
  name: string;
  displayName: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
}

export interface OrderBook {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

// ── Trading types ──

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET"; // LIMIT added later

export interface SoDEXNewOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string; // DecimalString
  price?: string; // DecimalString, required for LIMIT
}

export interface SoDEXOrder {
  id: number;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price: string;
  executedQty: string;
  cummQuoteQty: string;
  status: string; // NEW | FILLED | PARTIALLY_FILLED | CANCELLED | REJECTED
  createdAt: number;
  updatedAt: number;
}

export interface SoDEXBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface SoDEXAccountState {
  balances: SoDEXBalance[];
}

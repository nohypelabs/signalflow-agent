export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET";

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

export interface SoDEXNewOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
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
  status: string;
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

export interface SoDEXTrade {
  t: number;   // trade id
  T: number;   // timestamp
  s: string;   // symbol
  S: string;   // side: BUY | SELL
  p: string;   // price
  q: string;   // quantity
}

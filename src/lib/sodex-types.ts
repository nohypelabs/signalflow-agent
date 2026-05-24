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

// Maps mock data pairs (BTC/USDT) to SoDEX ticker symbols (vBTC_vUSDC)
const PAIR_TO_SODEX: Record<string, string> = {
  BTC: "vBTC_vUSDC",
  ETH: "vETH_vUSDC",
  SOL: "vSOL_vUSDC",
  AVAX: "vAVAX_vUSDC",
  LINK: "vLINK_vUSDC",
  DOGE: "vDOGE_vUSDC",
  ADA: "vADA_vUSDC",
  XRP: "vXRP_vUSDC",
  BNB: "vBNB_vUSDC",
};

export function pairToSodexSymbol(pair: string): string {
  const base = pair.split("/")[0];
  return PAIR_TO_SODEX[base] ?? "";
}

export function sodexSymbolToBase(symbol: string): string {
  // vBTC_vUSDC → BTC
  const m = symbol.match(/^v(\w+)_vUSDC$/);
  return m ? m[1] : symbol;
}

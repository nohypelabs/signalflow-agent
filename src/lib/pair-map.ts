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
  XAUT: "vXAUT_vUSDC",
};

export const SUPPORTED_SIGNAL_PAIRS = Object.keys(PAIR_TO_SODEX).map((base) => `${base}/USDC`);

export function pairToSodexSymbol(pair: string): string {
  if (pair.startsWith("v") && pair.includes("_vUSDC")) return pair;
  const base = pair.split("/")[0].replace(/^v/, "").toUpperCase();
  return PAIR_TO_SODEX[base] ?? `v${base}_vUSDC`;
}

export function sodexSymbolToBase(symbol: string): string {
  // vBTC_vUSDC → BTC
  const m = symbol.match(/^v(\w+)_vUSDC$/);
  return m ? m[1] : symbol;
}

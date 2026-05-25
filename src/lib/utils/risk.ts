export function riskRewardRatio(entry: number, tp: number, sl: number): number {
  if (entry === 0 || sl === entry) return 0;
  const reward = Math.abs(tp - entry);
  const risk = Math.abs(entry - sl);
  if (risk === 0) return 0;
  return reward / risk;
}

export function positionSizePercent(
  portfolioValue: number,
  riskPercent: number,
  entry: number,
  stopLoss: number,
): number {
  if (entry === stopLoss || portfolioValue === 0) return 0;
  const riskAmount = portfolioValue * (riskPercent / 100);
  const lossPerUnit = Math.abs(entry - stopLoss);
  return Math.floor(riskAmount / lossPerUnit);
}

export function pnlPercent(entry: number, exit: number): number {
  if (entry === 0) return 0;
  return ((exit - entry) / entry) * 100;
}

export function maxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDD = 0;
  for (const price of prices) {
    if (price > peak) peak = price;
    const dd = ((peak - price) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

import type { PaperTrade } from "@/lib/hooks/usePaperTrading";

export type { PaperTrade };

/** Simple returns from closed trades */
export function dailyReturns(trades: PaperTrade[]): number[] {
  const closed = trades
    .filter((t) => t.status !== "OPEN" && t.pnl !== null && t.closedAt)
    .sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0));

  if (closed.length === 0) return [];

  return closed.map((t) => t.pnl ?? 0);
}

/** Equity curve from closed trades */
export function equityCurve(
  trades: PaperTrade[],
  initialBalance: number,
): { date: number; value: number; pnl: number }[] {
  const closed = trades
    .filter((t) => t.status !== "OPEN" && t.closedAt)
    .sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0));

  const curve: { date: number; value: number; pnl: number }[] = [
    { date: 0, value: initialBalance, pnl: 0 },
  ];

  let balance = initialBalance;
  for (const t of closed) {
    balance += t.pnl ?? 0;
    curve.push({
      date: t.closedAt ?? 0,
      value: balance,
      pnl: t.pnl ?? 0,
    });
  }

  return curve;
}

/** Annualized Sharpe Ratio (assumes ~365 trading days for crypto) */
export function sharpeRatio(trades: PaperTrade[], riskFreeRate = 0): number {
  const returns = dailyReturns(trades);
  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Annualize: sqrt(365) for crypto (trades every day)
  return ((mean - riskFreeRate) / stdDev) * Math.sqrt(365);
}

/** Sortino Ratio — penalizes only downside volatility */
export function sortinoRatio(trades: PaperTrade[], riskFreeRate = 0): number {
  const returns = dailyReturns(trades);
  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideReturns = returns.filter((r) => r < 0);

  if (downsideReturns.length === 0) return mean > 0 ? Infinity : 0;

  const downsideVariance =
    downsideReturns.reduce((sum, r) => sum + r ** 2, 0) / downsideReturns.length;
  const downsideDev = Math.sqrt(downsideVariance);

  if (downsideDev === 0) return 0;

  return ((mean - riskFreeRate) / downsideDev) * Math.sqrt(365);
}

/** Max Drawdown from equity curve */
export function maxDrawdown(
  trades: PaperTrade[],
  initialBalance: number,
): { value: number; percent: number; peak: number; trough: number } {
  const curve = equityCurve(trades, initialBalance);
  if (curve.length < 2) return { value: 0, percent: 0, peak: initialBalance, trough: initialBalance };

  let peak = curve[0].value;
  let maxDd = 0;
  let maxDdPct = 0;
  let peakVal = peak;
  let troughVal = peak;

  for (const point of curve) {
    if (point.value > peak) peak = point.value;
    const dd = peak - point.value;
    const ddPct = peak > 0 ? dd / peak : 0;

    if (ddPct > maxDdPct) {
      maxDdPct = ddPct;
      maxDd = dd;
      peakVal = peak;
      troughVal = point.value;
    }
  }

  return { value: maxDd, percent: maxDdPct, peak: peakVal, trough: troughVal };
}

/** Calmar Ratio — annualized return / max drawdown */
export function calmarRatio(trades: PaperTrade[], initialBalance: number): number {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.pnl !== null);
  if (closed.length === 0) return 0;

  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const totalReturn = initialBalance > 0 ? totalPnl / initialBalance : 0;

  // Estimate annualized return based on trading period
  const firstTrade = Math.min(...closed.map((t) => t.openedAt));
  const lastTrade = Math.max(...closed.map((t) => t.closedAt ?? t.openedAt));
  const days = Math.max(1, (lastTrade - firstTrade) / (1000 * 60 * 60 * 24));
  const annualizedReturn = totalReturn * (365 / days);

  const dd = maxDrawdown(trades, initialBalance);
  if (dd.percent === 0) return annualizedReturn > 0 ? Infinity : 0;

  return annualizedReturn / dd.percent;
}

/** Win rate by trading type */
export function winRateByType(
  trades: PaperTrade[],
): Record<string, { wins: number; losses: number; rate: number; pnl: number }> {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.pnl !== null);
  const byType: Record<string, { wins: number; losses: number; rate: number; pnl: number }> = {};

  for (const t of closed) {
    const type = t.tradingType ?? "unknown";
    if (!byType[type]) byType[type] = { wins: 0, losses: 0, rate: 0, pnl: 0 };

    if ((t.pnl ?? 0) >= 0) {
      byType[type].wins++;
    } else {
      byType[type].losses++;
    }
    byType[type].pnl += t.pnl ?? 0;
  }

  for (const type of Object.keys(byType)) {
    const { wins, losses } = byType[type];
    const total = wins + losses;
    byType[type].rate = total > 0 ? wins / total : 0;
  }

  return byType;
}

/** Win rate by pair */
export function winRateByPair(
  trades: PaperTrade[],
): Record<string, { wins: number; losses: number; rate: number; pnl: number }> {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.pnl !== null);
  const byPair: Record<string, { wins: number; losses: number; rate: number; pnl: number }> = {};

  for (const t of closed) {
    if (!byPair[t.pair]) byPair[t.pair] = { wins: 0, losses: 0, rate: 0, pnl: 0 };

    if ((t.pnl ?? 0) >= 0) {
      byPair[t.pair].wins++;
    } else {
      byPair[t.pair].losses++;
    }
    byPair[t.pair].pnl += t.pnl ?? 0;
  }

  for (const pair of Object.keys(byPair)) {
    const { wins, losses } = byPair[pair];
    const total = wins + losses;
    byPair[pair].rate = total > 0 ? wins / total : 0;
  }

  return byPair;
}

/** Consecutive wins/losses */
export function consecutiveWinsLosses(trades: PaperTrade[]): {
  maxWins: number;
  maxLosses: number;
  currentStreak: number;
  streakType: "win" | "loss" | "none";
} {
  const closed = trades
    .filter((t) => t.status !== "OPEN" && t.pnl !== null)
    .sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0));

  if (closed.length === 0) {
    return { maxWins: 0, maxLosses: 0, currentStreak: 0, streakType: "none" };
  }

  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const t of closed) {
    if ((t.pnl ?? 0) >= 0) {
      currentWins++;
      currentLosses = 0;
      maxWins = Math.max(maxWins, currentWins);
    } else {
      currentLosses++;
      currentWins = 0;
      maxLosses = Math.max(maxLosses, currentLosses);
    }
  }

  const last = closed[closed.length - 1];
  const streakType =
    currentWins > 0 ? "win" : currentLosses > 0 ? "loss" : "none";
  const currentStreak =
    streakType === "win" ? currentWins : streakType === "loss" ? currentLosses : 0;

  return { maxWins, maxLosses, currentStreak, streakType };
}

/** Expectancy — avg win × win rate - avg loss × loss rate */
export function expectancy(trades: PaperTrade[]): number {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.pnl !== null);
  if (closed.length === 0) return 0;

  const wins = closed.filter((t) => (t.pnl ?? 0) >= 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);

  const winRate = wins.length / closed.length;
  const lossRate = losses.length / closed.length;

  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losses.length)
      : 0;

  return avgWin * winRate - avgLoss * lossRate;
}

/** Kelly Criterion — optimal bet fraction */
export function kelly(trades: PaperTrade[]): number {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.pnl !== null);
  if (closed.length === 0) return 0;

  const wins = closed.filter((t) => (t.pnl ?? 0) >= 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);

  if (wins.length === 0 || losses.length === 0) return 0;

  const winRate = wins.length / closed.length;
  const avgWin = wins.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / wins.length;
  const avgLoss = Math.abs(
    losses.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losses.length,
  );

  if (avgLoss === 0) return 0;

  const winLossRatio = avgWin / avgLoss;
  // Kelly: (p * b - q) / b where p = win rate, q = loss rate, b = win/loss ratio
  return (winRate * winLossRatio - (1 - winRate)) / winLossRatio;
}

/** Profit factor — gross profit / gross loss */
export function profitFactor(trades: PaperTrade[]): number {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.pnl !== null);

  const grossProfit = closed
    .filter((t) => (t.pnl ?? 0) >= 0)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(
    closed
      .filter((t) => (t.pnl ?? 0) < 0)
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0),
  );

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

/** Average trade duration in hours */
export function avgHoldTimeHours(trades: PaperTrade[]): number {
  const closed = trades.filter(
    (t) => t.status !== "OPEN" && t.closedAt && t.openedAt,
  );
  if (closed.length === 0) return 0;

  const totalMs = closed.reduce(
    (sum, t) => sum + ((t.closedAt ?? 0) - t.openedAt),
    0,
  );
  return totalMs / closed.length / (1000 * 60 * 60);
}

/** Drawdown series for charting */
export function drawdownSeries(
  trades: PaperTrade[],
  initialBalance: number,
): { date: number; drawdown: number; drawdownPct: number }[] {
  const curve = equityCurve(trades, initialBalance);
  if (curve.length < 2) return [];

  const series: { date: number; drawdown: number; drawdownPct: number }[] = [];
  let peak = curve[0].value;

  for (const point of curve) {
    if (point.value > peak) peak = point.value;
    const dd = peak - point.value;
    const ddPct = peak > 0 ? dd / peak : 0;
    series.push({ date: point.date, drawdown: -dd, drawdownPct: -ddPct });
  }

  return series;
}

/** Summary stats for display */
export interface AnalyticsSummary {
  totalTrades: number;
  winRate: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  calmar: number;
  expectancy: number;
  kellyFraction: number;
  profitFactorValue: number;
  avgHoldHours: number;
  consecutive: ReturnType<typeof consecutiveWinsLosses>;
  byType: ReturnType<typeof winRateByType>;
  byPair: ReturnType<typeof winRateByPair>;
}

export function computeAnalytics(
  trades: PaperTrade[],
  initialBalance: number,
): AnalyticsSummary {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.pnl !== null);
  const wins = closed.filter((t) => (t.pnl ?? 0) >= 0);

  return {
    totalTrades: closed.length,
    winRate: closed.length > 0 ? wins.length / closed.length : 0,
    sharpe: sharpeRatio(trades),
    sortino: sortinoRatio(trades),
    maxDrawdown: maxDrawdown(trades, initialBalance).value,
    maxDrawdownPct: maxDrawdown(trades, initialBalance).percent,
    calmar: calmarRatio(trades, initialBalance),
    expectancy: expectancy(trades),
    kellyFraction: kelly(trades),
    profitFactorValue: profitFactor(trades),
    avgHoldHours: avgHoldTimeHours(trades),
    consecutive: consecutiveWinsLosses(trades),
    byType: winRateByType(trades),
    byPair: winRateByPair(trades),
  };
}

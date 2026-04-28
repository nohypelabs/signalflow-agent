export type Signal = {
  id: string;
  pair: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  price: number;
  change24h: number;
  reasoning: string;
  dimensions: {
    etfFlow: number;
    sentiment: number;
    macro: number;
    momentum: number;
    treasury: number;
  };
  execution: {
    orderType: string;
    entry: number;
    takeProfit: number;
    stopLoss: number;
    positionSize: string;
    riskReward: string;
  };
  sources: string[];
  timeAgo: string;
};

export type PortfolioPoint = {
  day: number;
  value: number;
};

export const signals: Signal[] = [
  {
    id: "sig-001",
    pair: "BTC/USDT",
    action: "BUY",
    confidence: 92,
    price: 68420,
    change24h: 3.2,
    reasoning:
      "BTC ETF inflows surged +$520M in 24h, strongest since January. Macro indicators show Fed holding rates steady with dovish tone. News sentiment is 88% bullish across major outlets. Whale accumulation confirmed via BTC treasury data. All 4 signal dimensions align — high confidence BUY.",
    dimensions: { etfFlow: 95, sentiment: 88, macro: 85, momentum: 80, treasury: 90 },
    execution: {
      orderType: "Limit Buy on SoDEX",
      entry: 68420,
      takeProfit: 72000,
      stopLoss: 65500,
      positionSize: "5% of portfolio",
      riskReward: "1 : 1.21",
    },
    sources: ["ETF Module", "News Feeds", "Macro Events", "Currency & Pairs", "BTC Treasuries"],
    timeAgo: "2 min ago",
  },
  {
    id: "sig-002",
    pair: "ETH/USDT",
    action: "BUY",
    confidence: 87,
    price: 3842,
    change24h: 4.8,
    reasoning:
      "ETH showing strong momentum above key moving averages. Positive ETF sentiment spillover from BTC. Macro environment supportive with risk-on tone. Developer activity metrics trending upward across SoSoValue index data.",
    dimensions: { etfFlow: 82, sentiment: 90, macro: 85, momentum: 88, treasury: 78 },
    execution: {
      orderType: "Limit Buy on SoDEX",
      entry: 3842,
      takeProfit: 4200,
      stopLoss: 3600,
      positionSize: "4% of portfolio",
      riskReward: "1 : 1.48",
    },
    sources: ["ETF Module", "News Feeds", "Currency & Pairs", "SoSoValue Index"],
    timeAgo: "15 min ago",
  },
  {
    id: "sig-003",
    pair: "SOL/USDT",
    action: "SELL",
    confidence: 76,
    price: 178.5,
    change24h: -2.1,
    reasoning:
      "Bearish divergence detected on SOL. Price making higher highs while momentum indicators decline. News sentiment shifting neutral-bearish with concerns about network congestion. Macro still supportive but SOL-specific headwinds outweigh.",
    dimensions: { etfFlow: 60, sentiment: 65, macro: 80, momentum: 55, treasury: 70 },
    execution: {
      orderType: "Limit Sell on SoDEX",
      entry: 178.5,
      takeProfit: 160.0,
      stopLoss: 188.0,
      positionSize: "3% of portfolio",
      riskReward: "1 : 1.95",
    },
    sources: ["News Feeds", "Currency & Pairs", "SoSoValue Index", "Analysis Charts"],
    timeAgo: "32 min ago",
  },
  {
    id: "sig-004",
    pair: "AVAX/USDT",
    action: "HOLD",
    confidence: 58,
    price: 42.8,
    change24h: 0.4,
    reasoning:
      "AVAX in consolidation zone. Mixed signals across dimensions — ETF data neutral, sentiment slightly positive, macro supportive but momentum flat. Waiting for clearer directional signal before entry.",
    dimensions: { etfFlow: 55, sentiment: 62, macro: 75, momentum: 45, treasury: 50 },
    execution: {
      orderType: "No action",
      entry: 42.8,
      takeProfit: 0,
      stopLoss: 0,
      positionSize: "—",
      riskReward: "—",
    },
    sources: ["Currency & Pairs", "News Feeds", "Macro Events"],
    timeAgo: "1h ago",
  },
  {
    id: "sig-005",
    pair: "LINK/USDT",
    action: "BUY",
    confidence: 81,
    price: 18.92,
    change24h: 5.6,
    reasoning:
      "LINK breaking out of multi-week range with strong volume. Fundraising data shows increased institutional interest in oracle sector. Cross-reference with SoSoValue index confirms sector rotation into infrastructure tokens.",
    dimensions: { etfFlow: 70, sentiment: 84, macro: 80, momentum: 92, treasury: 65 },
    execution: {
      orderType: "Limit Buy on SoDEX",
      entry: 18.92,
      takeProfit: 22.0,
      stopLoss: 17.5,
      positionSize: "3% of portfolio",
      riskReward: "1 : 2.17",
    },
    sources: ["Currency & Pairs", "Fundraising", "SoSoValue Index", "News Feeds"],
    timeAgo: "45 min ago",
  },
];

export const portfolioData: PortfolioPoint[] = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: Math.round(
    1000 +
      i * 65 +
      Math.sin(i * 0.5) * 200 +
      Math.random() * 100 +
      (i > 15 ? (i - 15) * 40 : 0)
  ),
}));

export const stats = {
  totalPnl: 2847,
  pnlPercent: 12.4,
  winRate: 78.5,
  totalTrades: 65,
  winTrades: 51,
  activeSignals: 7,
  buySignals: 3,
  holdSignals: 2,
  sellSignals: 2,
  avgConfidence: 84.2,
};

export const apiModules = [
  { name: "Currency & Pairs", calls: 847, status: "active" as const, color: "#00d4ff" },
  { name: "ETF Data", calls: 423, status: "active" as const, color: "#00ff88" },
  { name: "News Feeds", calls: 1205, status: "active" as const, color: "#7b2fff" },
  { name: "Macro Events", calls: 312, status: "active" as const, color: "#00ffcc" },
  { name: "SoSoValue Index", calls: 198, status: "active" as const, color: "#5a1fff" },
  { name: "BTC Treasuries", calls: 156, status: "active" as const, color: "#ff4488" },
  { name: "Crypto Stocks", calls: 89, status: "active" as const, color: "#ff8800" },
  { name: "Fundraising", calls: 67, status: "active" as const, color: "#ff6644" },
  { name: "Analysis Charts", calls: 234, status: "active" as const, color: "#44aaff" },
];

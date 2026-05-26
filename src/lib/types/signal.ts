export interface DimensionScore {
  score: number;
  detail?: string;
}

export type SignalAction = "BUY" | "SELL" | "HOLD";

export type Signal = {
  id: string;
  pair: string;
  action: SignalAction;
  confidence: number;
  price: number;
  change24h: number;
  reasoning: string;
  dimensions: SignalDimensions;
  dimensionDetails?: SignalDimensionDetails;
  execution: SignalExecution;
  sources: string[];
  timeAgo: string;
};

export interface SignalDimensions {
  etfFlow: number;
  sentiment: number;
  macro: number;
  momentum: number;
  treasury: number;
}

export interface SignalDimensionDetails {
  etfFlow: DimensionScore;
  sentiment: DimensionScore;
  macro: DimensionScore;
  momentum: DimensionScore;
  treasury: DimensionScore;
}

export interface SignalExecution {
  orderType: string;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  positionSize: string;
  riskReward: string;
}

export interface DimensionData {
  score: number;
  detail: string;
}

export interface LiveSignalDimensions {
  etfFlow: DimensionData;
  sentiment: DimensionData;
  macro: DimensionData;
  momentum: DimensionData;
  treasury: DimensionData;
}

export interface SignalsData {
  updated: number;
  signals?: Signal[];
  sources: Record<string, boolean | number>;
  dimensions: Record<string, LiveSignalDimensions>;
  overall?: Record<string, number>;
  weights?: Record<string, Record<string, number>>;
  capped?: Record<string, string[]>;
}

export interface RecordedSignal {
  id: string;
  pair: string;
  coin: string;
  action: SignalAction;
  confidence: number;
  price: number;
  timestamp: number;
  dimensions: SignalDimensions;
  resolved?: {
    correct: boolean;
    finalPrice: number;
    resolvedAt: number;
  };
}

export type PortfolioPoint = {
  day: number;
  value: number;
};

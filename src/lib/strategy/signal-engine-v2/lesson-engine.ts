// Baseline lesson layer for signal calibration.
// Future paper/backtest jobs can replace these priors with measured outcomes.
import type {
  ConfluenceFactor,
  MarketRegime,
  SignalActionV2,
  SignalDirection,
  SignalQuality,
  SignalSetup,
  SignalSetupType,
  StrategyLesson,
} from "./types";
import type { TradingType } from "../../types/trading-type";

const BASELINE_LESSONS: StrategyLesson[] = [
  {
    setupType: "trend_continuation",
    regime: "TRENDING_UP",
    source: "baseline_rule",
    sampleSize: 0,
    winRate: null,
    profitFactor: null,
    confidenceAdjustment: 4,
    minConfidence: 64,
    status: "trusted",
    note: "Long trend continuation is allowed when trend, momentum, and volume agree.",
  },
  {
    setupType: "trend_continuation",
    regime: "TRENDING_DOWN",
    source: "baseline_rule",
    sampleSize: 0,
    winRate: null,
    profitFactor: null,
    confidenceAdjustment: 4,
    minConfidence: 64,
    status: "trusted",
    note: "Short trend continuation is allowed when trend, momentum, and volume agree.",
  },
  {
    setupType: "breakout",
    regime: "BREAKOUT",
    source: "baseline_rule",
    sampleSize: 0,
    winRate: null,
    profitFactor: null,
    confidenceAdjustment: 3,
    minConfidence: 68,
    status: "trusted",
    note: "Breakouts need above-neutral momentum and volume confirmation before execution.",
  },
  {
    setupType: "mean_reversion",
    regime: "VOLATILE",
    source: "baseline_rule",
    sampleSize: 0,
    winRate: null,
    profitFactor: null,
    confidenceAdjustment: -8,
    minConfidence: 72,
    status: "watch",
    note: "Volatile mean reversion is fragile; demand higher confidence until measured results improve.",
  },
  {
    setupType: "range_trade",
    regime: "RANGING",
    source: "baseline_rule",
    sampleSize: 0,
    winRate: null,
    profitFactor: null,
    confidenceAdjustment: -4,
    minConfidence: 66,
    status: "watch",
    note: "Range trades are allowed only near structure extremes with limited confidence uplift.",
  },
  {
    setupType: "no_edge",
    regime: "ANY",
    source: "baseline_rule",
    sampleSize: 0,
    winRate: null,
    profitFactor: null,
    confidenceAdjustment: -35,
    minConfidence: 99,
    status: "blocked",
    note: "No-edge signals must stay as HOLD until the setup can be explained and tested.",
  },
];

const SETUP_LABELS: Record<SignalSetupType, string> = {
  trend_continuation: "Trend continuation",
  breakout: "Breakout confirmation",
  mean_reversion: "Mean reversion",
  range_trade: "Range trade",
  no_edge: "No clear edge",
};

function actionDirection(action: SignalActionV2): SignalDirection {
  if (action.includes("LONG")) return "long";
  if (action.includes("SHORT")) return "short";
  return "neutral";
}

function factorScore(factors: ConfluenceFactor[], name: ConfluenceFactor["name"]): number {
  return factors.find((factor) => factor.name === name)?.score ?? 50;
}

function directionFromScore(score: number): SignalDirection {
  if (score >= 60) return "long";
  if (score <= 40) return "short";
  return "neutral";
}

function contradicts(direction: SignalDirection, score: number): boolean {
  if (direction === "long") return score <= 40;
  if (direction === "short") return score >= 60;
  return false;
}

function supports(direction: SignalDirection, score: number): boolean {
  if (direction === "long") return score >= 60;
  if (direction === "short") return score <= 40;
  return false;
}

export function classifyTradeSetup(input: {
  action: SignalActionV2;
  regime: MarketRegime;
  factors: ConfluenceFactor[];
}): SignalSetup {
  const { action, regime, factors } = input;
  const direction = actionDirection(action);
  const trend = factorScore(factors, "TREND");
  const momentum = factorScore(factors, "MOMENTUM");
  const volatility = factorScore(factors, "VOLATILITY");
  const volume = factorScore(factors, "VOLUME");
  const structure = factorScore(factors, "STRUCTURE");
  const factorScores = [trend, momentum, volatility, volume, structure];
  const supportCount = factorScores.filter((score) => supports(direction, score)).length;
  const conflictCount = factorScores.filter((score) => contradicts(direction, score)).length;
  const trendDirection = directionFromScore(trend);
  const structureDirection = directionFromScore(structure);

  let type: SignalSetupType = "no_edge";
  let thesis = "No actionable thesis: the factor stack does not explain a clean entry.";
  let invalidation = "Wait for at least three aligned factors or a clearer regime transition.";
  let confidenceBias = -12;

  if (direction === "neutral" || conflictCount >= 2 || supportCount < 2) {
    type = "no_edge";
  } else if (
    regime === "BREAKOUT" &&
    supports(direction, momentum) &&
    volume >= 55 &&
    conflictCount === 0
  ) {
    type = "breakout";
    thesis = "Momentum and volume support a breakout attempt in the signal direction.";
    invalidation = "Invalidate if price returns inside the prior structure or volume fades.";
    confidenceBias = 6;
  } else if (
    ((direction === "long" && regime === "TRENDING_UP") ||
      (direction === "short" && regime === "TRENDING_DOWN")) &&
    trendDirection === direction &&
    supportCount >= 3
  ) {
    type = "trend_continuation";
    thesis = "Trend, momentum, and confirmation factors support joining the active trend.";
    invalidation = "Invalidate on trend-factor reversal or a stop through the ATR plan.";
    confidenceBias = 7;
  } else if (
    (regime === "RANGING" || regime === "VOLATILE") &&
    structureDirection === direction &&
    supports(direction, momentum)
  ) {
    type = regime === "RANGING" ? "range_trade" : "mean_reversion";
    thesis = "Structure and momentum show a bounce/rejection attempt from an extreme zone.";
    invalidation = "Invalidate if the structure level breaks instead of rejecting.";
    confidenceBias = regime === "RANGING" ? 1 : -2;
  }

  const evidence = factors
    .filter((factor) => supports(direction, factor.score) || contradicts(direction, factor.score))
    .map((factor) => `${factor.name} ${factor.score}`);

  return {
    type,
    direction,
    label: SETUP_LABELS[type],
    thesis,
    invalidation,
    evidence,
    confidenceBias,
  };
}

export function getStrategyLesson(
  setupType: SignalSetupType,
  regime: MarketRegime,
  tradingType?: TradingType,
): StrategyLesson {
  return (
    BASELINE_LESSONS.find(
      (lesson) =>
        lesson.setupType === setupType &&
        lesson.regime === regime &&
        (!lesson.tradingType || lesson.tradingType === tradingType),
    ) ??
    BASELINE_LESSONS.find((lesson) => lesson.setupType === setupType && lesson.regime === "ANY") ??
    {
      setupType,
      regime: "ANY",
      tradingType: "ANY",
      source: "baseline_rule",
      sampleSize: 0,
      winRate: null,
      profitFactor: null,
      confidenceAdjustment: -6,
      minConfidence: 70,
      status: "watch",
      note: "No measured lesson for this setup yet; apply conservative confidence.",
    }
  );
}

export function calibrateSignalQuality(input: {
  action: SignalActionV2;
  rawConfidence: number;
  setup: SignalSetup;
  regime: MarketRegime;
  tradingType?: TradingType;
}): SignalQuality {
  const lesson = getStrategyLesson(input.setup.type, input.regime, input.tradingType);
  const confidenceAdjustment = input.setup.confidenceBias + lesson.confidenceAdjustment;
  const calibratedConfidence = Math.max(
    0,
    Math.min(98, Math.round(input.rawConfidence + confidenceAdjustment)),
  );
  const blockedReasons: string[] = [];

  if (input.action === "HOLD") {
    blockedReasons.push("Base classifier returned HOLD.");
  }
  if (lesson.status === "blocked") {
    blockedReasons.push(lesson.note);
  }
  if (calibratedConfidence < lesson.minConfidence && input.action !== "HOLD") {
    blockedReasons.push(`Calibrated confidence ${calibratedConfidence} below ${lesson.minConfidence}.`);
  }

  return {
    rawConfidence: input.rawConfidence,
    calibratedConfidence,
    confidenceAdjustment,
    minConfidence: lesson.minConfidence,
    status: blockedReasons.length > 0 ? "blocked" : lesson.status === "watch" ? "watch" : "actionable",
    blockedReasons,
    lesson,
  };
}

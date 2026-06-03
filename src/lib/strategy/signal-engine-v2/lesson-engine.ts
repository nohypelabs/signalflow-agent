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
import { BASELINE_LESSONS } from "./strategy-lessons";

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

function isWeakAction(action: SignalActionV2): boolean {
  return action === "WEAK_LONG" || action === "WEAK_SHORT";
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

  if (direction === "neutral" || conflictCount >= 2 || (supportCount < 2 && !isWeakAction(action))) {
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
  } else if (isWeakAction(action) && supportCount >= 1 && conflictCount <= 1) {
    type = regime === "BREAKOUT"
      ? "breakout"
      : regime === "RANGING"
        ? "range_trade"
        : "trend_continuation";
    thesis = "Early directional edge is present, but confirmation is still thin; track as a watch-grade setup.";
    invalidation = "Invalidate if the first aligned factor rolls back through neutral or a second factor contradicts the move.";
    confidenceBias = -4;
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
  const confidenceShortfall = lesson.minConfidence - calibratedConfidence;

  if (input.action === "HOLD") {
    blockedReasons.push("Base classifier returned HOLD.");
  }
  if (lesson.status === "blocked") {
    blockedReasons.push(lesson.note);
  }
  const status: SignalQuality["status"] = blockedReasons.length > 0
    ? "blocked"
    : lesson.status === "watch" || confidenceShortfall > 0
      ? "watch"
      : "actionable";

  return {
    rawConfidence: input.rawConfidence,
    calibratedConfidence,
    confidenceAdjustment,
    minConfidence: lesson.minConfidence,
    status,
    blockedReasons,
    lesson,
  };
}

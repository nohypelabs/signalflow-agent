// Extracted from signal-engine-v2.ts. Keep public behavior stable.
export { adx, obv, roc, findSupportResistance } from "./signal-engine-v2/indicator-engine";
export type { MarketRegime, SignalActionV2, ConfluenceFactor, ConfluenceResult, SignalSetup, SignalSetupType, SignalQuality, StrategyLesson, SignalV2 } from "./signal-engine-v2/types";
export { generateSignalV2, generateSignalsV2 } from "./signal-engine-v2/signal-builder";
export { classifyTradeSetup, calibrateSignalQuality, getStrategyLesson } from "./signal-engine-v2/lesson-engine";

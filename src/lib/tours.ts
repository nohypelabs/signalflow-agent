export interface TourStep {
  target: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
  note?: string;
}

export interface PageTourConfig {
  steps: TourStep[];
  storageKey: string;
  eventName: string;
  buttonLabel: string;
}

export const DASHBOARD_TOUR: TourStep[] = [
  { target: "market-selector", title: "Pick your market", body: "Start here. Select the pair you want to track — SoDEX tape, AI confluence and risk state all scope to this symbol.", placement: "bottom" },
  { target: "decision-score", title: "The decision score", body: "Live signal for the selected pair. Confidence, action (LONG/SHORT/HOLD) and a volatility-adjusted plan — scored by the 5-layer engine.", placement: "bottom" },
  { target: "layer-breakdown", title: "Why this signal", body: "Every signal is traceable. Trend, momentum, volatility, volume and structure factors — plus regime and the exact confluence math.", placement: "top" },
  { target: "signal-log", title: "Live signal log", body: "A rolling feed of generated signals across the market. Click any row to focus its evidence and chart.", placement: "top" },
  { target: "wallet-button", title: "Web3 Wallet Connect", body: "Connect your Ethereum/Arbitrum wallet to unlock custom AI model credentials and live transaction execution.", placement: "bottom" },
  { target: "ai-assistant", title: "AI Trading Assistant", body: "Ask Dora, your autonomous Web3 trading companion, to analyze charts, explain indicators, or execute test orders.", placement: "left" },
  { target: "signals-tab", title: "The Signals workspace", body: "Switch to Signals for the full grid: summary cards, filters, AI reasoning drawer and your trading-type policy.", placement: "right", note: "Use the sidebar » Signals" },
];

export const SIGNALS_TOUR: TourStep[] = [
  { target: "signals-summary", title: "Signal summary", body: "At-a-glance stats: total active signals, direction split (LONG/SHORT/HOLD) and average confidence across the board.", placement: "bottom" },
  { target: "signals-strategy", title: "Active strategy policy", body: "Your current strategy policy — confidence floor, max position size, and which engine is generating signals.", placement: "bottom" },
  { target: "signals-evidence", title: "Signal evidence & chart", body: "The focused signal's full thesis, execution plan, reasoning breakdown, and an interactive price chart with multi-timeframe alignment.", placement: "top" },
  { target: "signals-filters", title: "Filter & sort", body: "Narrow down signals by pair, direction, or confidence threshold. Sort by confidence, 24h change, or pair name.", placement: "top" },
  { target: "signals-grid", title: "Signal cards grid", body: "Every live signal rendered as a card — confluence score, factor breakdown, and one-click focus to drill into the evidence.", placement: "top" },
];

export const HISTORY_TOUR: TourStep[] = [
  { target: "history-hero", title: "Signal history overview", body: "Win rate, average PnL, profit factor, Sharpe ratio and best/worst trades — the full track record at a glance.", placement: "bottom" },
  { target: "history-filters", title: "Filter signals", body: "Filter by direction (LONG/SHORT/HOLD) and outcome (win/loss/pending) to analyse specific segments.", placement: "bottom" },
  { target: "history-list", title: "Signal log", body: "Every generated signal listed with its action, pair, confidence, PnL, outcome and timestamp. Scroll through your complete history.", placement: "top" },
];

export const PERFORMANCE_TOUR: TourStep[] = [
  { target: "perf-hero", title: "Performance dashboard", body: "30-day market basket return, win rate, signals per day, max drawdown and volatility — all in one hero section.", placement: "bottom" },
  { target: "perf-backtest", title: "Run a backtest", body: "Backtest any strategy against historical data. Configure the engine, symbol, timeframe and capital right from here.", placement: "bottom" },
  { target: "perf-equity", title: "Equity curve", body: "Simulated P&L chart assuming a 5% position per signal. Track your equity growth, drawdowns and recovery periods.", placement: "top" },
  { target: "perf-returns", title: "30-day returns", body: "30-day return bars per coin plus a detailed table with price, 24h/7d/30d change, volatility and high/low range.", placement: "top" },
  { target: "perf-details", title: "Signal details", body: "Collapsible sections for confidence calibration, per-coin accuracy, recent signal history and live signal dimensions.", placement: "top" },
];

export const SETTINGS_TOUR: TourStep[] = [
  { target: "settings-agent", title: "AI agent selection", body: "Choose which intelligence engine powers SignalFlow. Each agent has a different specialty, speed and cost profile.", placement: "bottom" },
  { target: "settings-profile", title: "Agent profile", body: "Selected agent's focus area, execution latency, model variants and optional custom API key override.", placement: "top" },
  { target: "settings-connections", title: "API connections", body: "Live status of all upstream services — SoSoValue, SoDEX, AI providers and more. Green means healthy.", placement: "top" },
  { target: "settings-general", title: "General settings", body: "Current configuration summary: active AI model, signal refresh interval, network, wallet status and app version.", placement: "top" },
];

export const PAGE_TOURS: Record<string, PageTourConfig> = {
  "/dashboard": { steps: DASHBOARD_TOUR, storageKey: "signalflow-tour-dashboard", eventName: "start-signalflow-tour", buttonLabel: "Dashboard Tour" },
  "/signals": { steps: SIGNALS_TOUR, storageKey: "signalflow-tour-signals", eventName: "start-signals-tour", buttonLabel: "Signals Tour" },
  "/signal-history": { steps: HISTORY_TOUR, storageKey: "signalflow-tour-history", eventName: "start-history-tour", buttonLabel: "History Tour" },
  "/performance": { steps: PERFORMANCE_TOUR, storageKey: "signalflow-tour-performance", eventName: "start-perf-tour", buttonLabel: "Performance Tour" },
  "/settings": { steps: SETTINGS_TOUR, storageKey: "signalflow-tour-settings", eventName: "start-settings-tour", buttonLabel: "Settings Tour" },
};

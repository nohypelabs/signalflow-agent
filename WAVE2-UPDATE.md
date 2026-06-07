Updates in this Wave
Wave 2 Update :

In the past, wave 1 was a prototype — hardcoded signals, no real data, no execution. Wave 2 is where it becomes real: a full signal-to-execution trading platform with live wallet connectivity, live orders, AI-enhanced reasoning, and a command-center dashboard built for serious traders.

Live : https://signalflowagent.vercel.app
GitHub : https://github.com/nohypelabs/signalflow-agent
Docs : https://signalflowagent.vercel.app/docs
Product Walkthrough : https://youtu.be/LcN7pJp1Ftc?si=JJtjsX8CdzPYN7nI
---
New Icon for Logo
New Icon, New Spirit for building.
Wallet & Trading
MetaMask + WalletConnect v2 on ValueChain mainnet (chain ID 286623, SOSO). Smart connector detects window.ethereum on desktop and falls back to WalletConnect QR/deep links on mobile. EIP-712 typed-data signing for both SoDEX spot orders and SoDEX perps (futures) actions — users sign directly through their wallet, no custody. Trade modal includes live ticker price, wallet balance, 25/50/75/100% quick-fill buttons, cost preview, and Sign & Submit flow. Supports both live and paper trading modes. Order dashboard tracks open/filled/canceled status with cancel support. Requests proxied via /api/orders and /api/balance. SoDEX perps positions and native funding rates available via /api/perps/positions and /api/perps/funding.

AI Signal Enhancement
Multi-provider AI selection: DeepSeek, OpenAI, Anthropic (Claude), Google (Gemini), OpenRouter, and Xiaomi (MiMo). User-supplied API keys stored locally in the browser — never sent to SignalFlow servers. Per-dimension reasoning explains each signal: entry, stop-loss, take-profit, confidence, and position sizing. Decision Score syncs live with the signal engine on /signals.

SoSoValue & Market Data
ETF flow, news sentiment, macro indicators, BTC treasury, and index snapshots fully integrated. Correlation matrix for cross-asset analysis. Market screener for filtering opportunities. Marketaux news integration for real-time market intelligence. Quota-aware degraded states keep panels functional at API limits — degrades gracefully, never silently. The Command Center pipeline surfaces live signal events, market movers, and SoDEX status as part of the Catalyst Monitor section.

Command Center Dashboard
Redesigned /dashboard with a 6-step pipeline: SoDEX Data → SoSoValue Data → Confluence V3 (TA + Microstructure: Orderbook / Flow / Funding) → AI Thesis → Trade Setup → Decision Score. Traffic-light LONG/SHORT/NO TRADE state pulled directly from the live Confluence V3 signal engine. Evidence strip includes Market Pressure, Signal Reliability, Macro Tape, and Execution Readiness panels.

Signal Engine V3 (Confluence Unified)
The signal engine evolved from V2 to V3. Confluence V3 fuses order-flow microstructure (orderbook depth, funding rates, trade flow) directly into the main confluence engine — no longer a separate strategy choice. 5-layer architecture: Market Regime Detection → 5-Factor Confluence (Trend/Momentum/Volatility/Volume/Structure) → 7-Tier Classification (STRONG_LONG through STRONG_SHORT) → Volatility-Adjusted TP/SL (ATR multipliers × trading type × market regime) → Filtering (min confluence gates per trading type). Modular engine split into sub-engines: indicator-engine, regime-engine, score-engine, execution-plan-builder, lesson-engine.

Trading Type System
Four trading modes: Scalping (1m–15m, 20x max leverage, 55% min confidence), Intraday (1h–4h, 10x, 60%), Swing (1D–7D, 5x, 65%), Position (1W+, 3x, 70%). Each type has distinct factor weights, ATR-based TP/SL multipliers, and confidence thresholds. Multi-timeframe confluence across 1H (250 bars), 4H (120 bars), 1D (60 bars). Confluence scoring: 95 = all 3 TFs agree, 80 = 2/2 agree, 70 = 2/3 agree, 30–50 = mixed.

Mobile & PWA
PWA manifest with custom icons and standalone display mode. Service worker is intentionally disabled — CacheBuster and ServiceWorkerCleanup components clear stale data for real-time trading accuracy. Responsive mobile layout: compact header, drawer sidebar, bottom navigation, scroll lock, safe-bottom padding for notched devices.

Paid API & Subscription System
Versioned REST API at /api/v1/ with wallet-based authentication (nonce + verify flow), API key management, and tiered rate limiting. Three subscription tiers: FREE (core signals + market data), PRO (adds orderbook, correlation, screener, analyze), WHALE (full access including backtest). LemonSqueezy integration for payment processing. Usage tracking per endpoint per day with tier-aware limits.

Database & Persistence
PostgreSQL via Prisma 7. All signal history, trade journal, backtest runs, paper trading accounts/positions, strategy configs, and wallet profiles persisted to database — no longer localStorage-only. Schema includes: WalletProfile, StrategyConfig, SignalHistory, PaperAccount, PaperPosition, TradeJournal, BacktestRun, Subscription, ApiKey, UsageLog.

UX & Validation
Paper futures flow for signal validation before live execution. Backtest page: win rate, profit factor, max drawdown, equity curve, per-regime accuracy. Chart drawing tools with persistent storage. Signal Analysis Drawer for deep-dive per-coin analysis. 3D Welcome scene (Three.js) for onboarding experience.

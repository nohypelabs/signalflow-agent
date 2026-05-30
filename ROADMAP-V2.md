# SignalFlow Agent — Wave 2 Roadmap
## Deadline: June 3, 2026
## Status: ✅ WAVE 2 COMPLETE

### Wave 1 (Baseline) — ✅ COMPLETE
- Next.js dashboard shell with dark-themed trading interface
- SoSoValue API integration (ETF, sentiment, macro, treasury, indices)
- SoDEX live market data (tickers, klines, orderbooks)
- Heuristic 5-dimension signal scoring engine
- AI signal generation via Deepseek with structured prompts
- Full sidebar navigation with 8 pages

### Wave 2 — ✅ ALL PHASES COMPLETE (commit 210deaf)

#### Phase 1: Bug fixes & dedup — ✅ DONE
- SOL weights fix, scoring functions dedup

#### Phase 2: Deepen API usage — ✅ DONE
- Treasury activity, index snapshots, macro history

#### Phase 3: New components — ✅ DONE
- ETFFlowChart, MacroCalendar, NewsSentiment, SignalHistory
- Error boundary, orderbook depth, macro event history chart

#### Phase 4: Trading chart & page redesign — ✅ DONE
- Trading chart on trading page + 1m/3m/5m timeframes
- Redesign trading page (order form, chart, orderbook)
- Execute button on /signals page

#### Phase 5: Paper trading engine — ✅ DONE
- Paper futures with leverage + liquidation
- Per-type performance stats

#### Phase 6: Signal engine V2 — ✅ DONE
- 5-factor confluence, market regime detection, 7-tier classification
- LONG/SHORT terminology (futures-focused platform)

#### Phase 7: Trading type system — ✅ DONE
- TradingType = scalping | intraday | swing | position
- Per-type factor weights (engine adapts dynamically)
- Per-type TP/SL multipliers (blended with regime)
- Per-type confidence thresholds (60%–75%)
- Per-type leverage caps (3x–20x)
- Onboarding modal + TypeSwitcher UI
- Strategy Config UI shows per-type weights

#### Phase 8: Multi-timeframe confluence — ✅ DONE
- Signal generation on 1H, 4H, and 1D timeframes
- Alignment scoring (95 = all agree, 30 = conflicting)
- Color-coded MTF badges on signal cards

#### Phase 9: Backtest engine — ✅ DONE
- Walk-forward historical replay
- Per-regime accuracy breakdown
- Win rate, profit factor, max drawdown metrics
- Equity curve visualization
- Per-type backtesting

#### Phase 10: Performance dashboard polish — ✅ DONE
- Per-type performance breakdown
- Paper trading stats by type
- Multi-TF confluence stats
- Regime-based accuracy

#### Phase 11: /portfolio page — ✅ DONE
- Paper futures PnL tracking page
- Open positions with real-time P&L

#### Phase 12: Final Wave 2 submission prep — ✅ DONE
- Updated docs, README, demo flow
- Cache stale data fix (service worker, no-cache headers, CacheBuster)
- Dashboard redesign (dark fintech color system)
- KPI cards with real data (no hardcoded values)

#### Phase 13: Command Center upgrade — ✅ DONE
- `/dashboard` now uses the SignalFlow command-center layout: pipeline rail, market canvas, Current Decision Score, Catalyst Monitor, and evidence strip
- Current Decision Score is aligned to the same live system signal shown on `/signals` (action + confidence come from `liveSignals`)
- Catalyst Monitor replaces the fragile news-only panel and remains populated during SoSoValue quota limits using live signal events, market movers, liquidity leaders, SoDEX status, and news-layer degraded state
- Bottom evidence strip improved with Market Pressure, Signal Reliability, Macro Tape, and Execution Readiness

### Key Features Delivered

**Signal Engine V2:** 5-layer architecture (Regime → Confluence → Classification → TP/SL → Filtering)
**Trading Types:** 4 types with per-type weights, TP/SL, confidence, leverage
**Multi-TF Confluence:** 1H/4H/1D alignment scoring
**Paper Futures:** 1-100x leverage, auto-liquidation, per-type stats
**Wallet & SoDEX Execution:** MetaMask + WalletConnect v2, ValueChain mainnet, EIP-712 signing, live balances, order placement/cancel/status
**AI Signal Enhancement:** Deepseek/OpenAI/OpenRouter selection, browser-local keys, per-dimension reasoning and execution plans
**SoSoValue Modules:** ETF flow, news sentiment, macro indicators, BTC treasury, index snapshots with quota-aware degraded states
**Backtest Engine:** Walk-forward with per-regime accuracy, equity curves
**Dashboard:** Command-center UI, live decision score, Catalyst Monitor, real-time evidence strip, no mock data
**Mobile & PWA:** Installable app metadata, icons, service worker support, responsive navigation, mobile-safe spacing

# SignalFlow Agent — Wave 2 Roadmap (Updated)
## Deadline: June 3, 2026

### Completed (commit 62765c0)
- ✅ Phase 1: Bug fixes & dedup (SOL weights, scoring functions)
- ✅ Phase 2: Deepen API usage (treasury activity, index snapshots, macro history)
- ✅ Phase 3: New components (ETFFlowChart, MacroCalendar, NewsSentiment, SignalHistory)
- ✅ Error boundary, orderbook depth, macro event history chart
- ✅ Trading chart on trading page + 1m/3m/5m timeframes
- ✅ Redesign trading page (order form, chart, orderbook)
- ✅ Execute button on /signals page
- ✅ Paper trading engine (futures with leverage + liquidation)
- ✅ Signal engine v2 (5-factor confluence, market regime, 7-tier classification)
- ✅ LONG/SHORT terminology (futures-focused platform)

### Remaining — Wave 2 Final Push

#### Phase 1: Trading Type Foundation
- Add `TradingType` = scalping | intraday | swing | position
- Add to Signal, PaperTrade, SignalV2 types
- TradingTypeConfig registry (timeframe, hold duration, max leverage, description)
- **UX: Onboarding type selector** (see UX Flow below)
- UI: type selector on OrderForm, type badge on SignalCard
- Filter signals by selected type
- Build verify

#### Phase 2: Per-Type Weight Adjustment
- Weight profiles per trading type:
  - Scalping: momentum 40%, volatility 25%, volume 20%, trend 10%, structure 5%
  - Intraday: momentum 30%, trend 25%, volatility 20%, volume 15%, structure 10%
  - Swing: trend 35%, structure 25%, momentum 20%, volume 10%, volatility 10%
  - Position: trend 45%, structure 30%, momentum 10%, volume 10%, volatility 5%
- Pass tradingType to generateSignalV2()
- Signal engine adapts weights dynamically
- **UX: Signal cards show type-specific confidence & TP/SL**
- Strategy Config UI shows per-type weights
- Build verify

#### Phase 3: Per-Type TP/SL Tuning
- TP/SL multipliers per type:
  - Scalping: TP 1.0-1.5x ATR, SL 0.5-0.8x ATR (tight)
  - Intraday: TP 2.0-2.5x ATR, SL 1.0-1.2x ATR (moderate)
  - Swing: TP 3.0-4.0x ATR, SL 1.2-1.5x ATR (wide)
  - Position: TP 4.0-6.0x ATR, SL 1.5-2.0x ATR (widest)
- Confidence thresholds per type: scalping 60%, intraday 65%, swing 70%, position 75%
- R:R targets per type
- Build verify

#### Phase 4: Multi-Timeframe Confluence (NEW — from research)
- Generate signals on multiple timeframes (1H, 4H, 1D)
- Combine into "Multi-TF Confluence Score"
- Higher score = stronger conviction
- Show multi-TF alignment on signal cards
- Build verify

#### Phase 5: Signal Backtest Engine
- Historical kline replay with walk-forward validation
- Per-type performance metrics
- Out-of-sample testing
- Overfitting detection
- BacktestPanel on /performance page
- Build verify

#### Phase 6: Performance Dashboard Polish
- Per-type performance breakdown
- Paper trading stats by type
- Multi-TF confluence stats
- Regime-based accuracy
- Build verify

#### Phase 7: Final Wave 2 Submission Prep
- Update docs, README
- Demo flow documentation
- Final build verify

### Key Insights from Research
- Factor relevance shifts by timeframe (scalping = momentum/volume, position = trend/macro)
- Confidence threshold should scale with timeframe (lower for scalping, higher for position)
- R:R ratio naturally differs by type
- Overfitting risk: use walk-forward optimization, not simple replay
- Multi-TF confluence is the highest-value enhancement
- Regime-based type recommendation adds sophistication

### UX Flow: Trader Type Onboarding
(See detailed UX spec below)

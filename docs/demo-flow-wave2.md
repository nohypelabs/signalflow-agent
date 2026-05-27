# SignalFlow Agent — Demo Flow (Wave 2)

## Quick Demo Script (5 minutes)

### 1. Landing & Onboarding (30s)
- Open the app → Dashboard loads with live market data
- Navigate to `/signals` → Onboarding modal appears
- "What's Your Trading Style?" — choose **Swing Trader**
- Signals filter to ≥70% confidence, type badge appears on each card

### 2. Signal Analysis (60s)
- Top signal: BTC/USDC — STRONG LONG, 87% confidence
- MTF badge shows: "MTF 95" — all 3 timeframes agree
- Per-TF breakdown: 1H: LONG (87%) | 4H: LONG (82%) | 1D: LONG (75%)
- Type-specific targets: TP $108,500 (3.5%) | SL $98,800 (1.2%) | R:R 2.92:1
- Click "View Analysis" → see full factor breakdown

### 3. Trading Type Switching (30s)
- Click TypeSwitcher in header → switch to **Scalper**
- Signals re-filter: lower confidence threshold (60%), tighter TP/SL
- Notice leverage cap changes: max 20x for scalping
- Switch back to **Swing** → signals restore

### 4. Trade Execution (60s)
- Click "Execute LONG" on a signal → navigates to /trading
- OrderForm pre-fills with Swing type: max 5x leverage
- Set margin $500, leverage 3x
- Summary: Notional $1,500 | Liq price calculated
- Click "📝 Paper LONG 3x · $500" → trade opens

### 5. Paper Trading Stats (30s)
- Paper stats card shows: balance, margin used, P&L
- Open position appears with real-time P&L
- Per-type breakdown: "Swing: 1 trade, — WR"
- Type badge visible on position row

### 6. Strategy Config (30s)
- Navigate to /strategy-config
- Scroll to "Trading Type Weight Profiles"
- 4 cards showing per-type factor weight distributions
- Scalping: Momentum 40%, Position: Trend 45%

### 7. Backtest (60s)
- Navigate to /performance → scroll to Backtest panel
- Select: BTC/USDC, Swing, 12H resolution
- Click "Run Backtest" → results appear
- Win rate, profit factor, per-regime accuracy
- Equity curve chart

### 8. Multi-TF Confluence (30s)
- Back to /signals → notice MTF badges on signal cards
- Green (80+): strong alignment across timeframes
- Amber (60-79): partial alignment
- Red (<60): conflicting signals

---

## Key Talking Points

1. **Trading Type Differentiation** — Not just filtering; the engine actually adapts factor weights and TP/SL multipliers per type. A scalper sees momentum-focused signals with tight targets; a position trader sees trend-focused signals with wide targets.

2. **Multi-Timeframe Confluence** — Signals validated across 3 timeframes. A "LONG" signal on 1H that's also LONG on 4H and 1D has much higher conviction than one that conflicts with higher timeframes.

3. **Regime-Aware TP/SL** — The same trading type gets different TP/SL in different market regimes. Trending markets get wider TP (let winners run), ranging markets get tighter TP (take profits faster).

4. **Walk-Forward Backtesting** — Not simple replay; uses sliding window approach that respects causality. Each signal is generated using only data available at that point in time.

5. **No Mock Data** — All signals generated from real SoDEX klines and SoSoValue market data. Paper trades use real price feeds for TP/SL/Liquidation checks.

---

## Technical Highlights

- **Signal Engine V2:** 5-layer architecture (Normalization → Regime → Confluence → Classification → Filtering)
- **5 Confluence Factors:** Trend (EMA/ADX), Momentum (RSI/MACD/ROC), Volatility (BB/ATR), Volume (OBV), Structure (S/R + Fibonacci)
- **4 Trading Types:** Each with unique weight profiles, TP/SL ranges, confidence thresholds, leverage caps
- **3 Timeframes:** 1H (250 bars), 4H (120 bars), 1D (60 bars) for confluence scoring
- **Backtest Engine:** Walk-forward with per-regime accuracy, equity curves, streak tracking
- **Paper Futures:** Leverage 1-100x, auto-liquidation, per-type performance stats

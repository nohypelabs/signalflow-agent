# SignalFlow Agent

**AI-powered signal-to-execution trading dashboard** — built for the SoSoValue Buildathon 2026 by NoHype Labs.

## Live Demo

**[signalflowagent.vercel.app](https://signalflowagent.vercel.app)**

SignalFlow Agent transforms multi-dimensional market data into explainable, executable trade signals. Wave 2 moves the product beyond a read-only dashboard into a signal-to-execution trading platform with wallet connectivity, live order management, paper futures validation, a Bloomberg-style command center, and production-grade mobile/PWA support.

---

## Why SignalFlow?

> Most AI trading agents give you a score. SignalFlow gives you a **plan**.

- **Not just signals — styles.** Choose your trading style (Scalper, Intraday, Swing, Position) and the engine adapts weights, TP/SL, and confidence thresholds to match.
- **Not just one timeframe — confluence.** Signals analyzed across 1H, 4H, and 1D timeframes with alignment scoring for higher conviction.
- **Not just a dashboard — execution.** Paper futures trading, ValueChain wallet connectivity, SoDEX order signing, and live order management support the full signal-to-execution loop.
- **Not just guesses — validation.** Built-in backtest engine that replays historical signals and measures accuracy by regime and trading type.

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │     SignalFlow Agent         │
                    └──────────────┬──────────────┘
                                   │
    ┌──────────────────────────────┼──────────────────────────────┐
    │                              │                              │
    ▼                              ▼                              ▼
┌───────────┐            ┌─────────────────┐           ┌──────────────────┐
│ SoSoValue │            │     SoDEX        │           │   AI Provider     │
│   API     │            │      API         │           │ (Deepseek/OpenAI │
├───────────┤            ├─────────────────┤           │  /OpenRouter)     │
│ ETF Flow  │            │ Tickers/Klines   │           └────────┬─────────┘
│ Sentiment │            │ Orderbook        │                    │
│ Macro     │            │ Paper Trading    │                    │
│ Treasury  │            │ Account Balance  │                    │
│ Indices   │            └────────┬────────┘                    │
└─────┬─────┘                     │                              │
      │                           │                              │
      ▼                           ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Signal Engine V2 (5-Layer)                         │
│  L1: Market Regime Detection (5 regimes)                           │
│  L2: 5-Factor Confluence (Trend/Momentum/Volatility/Volume/Struct) │
│  L3: 7-Tier Classification (STRONG_LONG → HOLD → STRONG_SHORT)     │
│  L4: Volatility-Adjusted TP/SL (ATR multipliers × type × regime)  │
│  L5: Filtering (min confluence gates per trading type)             │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌────────────┐ ┌──────────┐ ┌──────────────┐
            │ Multi-TF   │ │ Paper    │ │ Backtest     │
            │ Confluence │ │ Futures  │ │ Engine       │
            │ (1H/4H/1D) │ │ Trading  │ │ (walk-fwd)   │
            └────────────┘ └──────────┘ └──────────────┘
```

**Stack**: Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript 5, pnpm

---

## Trading Type System

SignalFlow adapts to your trading style. Each type uses different factor weights, TP/SL multipliers, and confidence thresholds:

| Type | Timeframe | Hold | Max Lev | Min Conf | Key Factors |
|------|-----------|------|---------|----------|-------------|
| ⚡ Scalper | 1m–15m | < 1 hour | 20x | 60% | Momentum 40%, Volatility 25% |
| 📊 Intraday | 1h–4h | 1–6 hours | 10x | 65% | Momentum 30%, Trend 25% |
| 📈 Swing | 1D–7D | 2–14 days | 5x | 70% | Trend 35%, Structure 25% |
| 🏦 Position | 1W+ | 2–8 weeks | 3x | 75% | Trend 45%, Structure 30% |

**How it works:**
1. Onboarding modal asks "What's your trading style?" on first visit to /signals
2. Signals filtered by type-specific confidence threshold
3. Factor weights adapt: scalping prioritizes momentum, position prioritizes trend
4. TP/SL multipliers blend type range with market regime (tighter in ranging, wider in trending)
5. OrderForm caps leverage per type and pre-fills from signal

---

## Multi-Timeframe Confluence

Each signal is analyzed across three timeframes independently:

- **1H** — Primary signal (250 bars of data)
- **4H** — Medium-term trend (120 bars)
- **1D** — Macro direction (60 bars)

**Confluence scoring:**
- 95: All 3 timeframes agree on direction (highest conviction)
- 80: 2/2 timeframes agree
- 70: 2/3 timeframes agree
- 30-50: Mixed signals (lower conviction)

Displayed as color-coded badges on signal cards: green (80+), amber (60+), red (<60).

---

## Signal Backtest Engine

Walk-forward backtesting that replays historical klines through the V2 engine:

- **Method:** Sliding window — generate signal using N bars, evaluate outcome M bars ahead
- **Metrics:** Win rate, profit factor, avg win/loss, total PnL, max drawdown
- **Breakdown:** Per-regime accuracy, long vs short win rates, win/loss streaks
- **Per-type:** Test any trading type's weight profile against historical data
- **Equity curve:** Visual P&L progression with 5% position sizing

Access via `/performance` page → Backtest panel.

---

## Supported Networks

| Network | Chain ID | Native Token | Trading Pair | Status |
|---------|----------|-------------|-------------|--------|
| ValueChain Mainnet | 286623 | SOSO | vBTC_vUSDC | Live |

---

## Features

### Signal Engine V2
- **5-factor confluence:** Trend (EMA/ADX), Momentum (RSI/MACD/ROC), Volatility (BB/ATR), Volume (OBV), Structure (S/R + Fibonacci)
- **Market regime detection:** TRENDING_UP, TRENDING_DOWN, RANGING, VOLATILE, BREAKOUT
- **7-tier classification:** STRONG_LONG → LONG → WEAK_LONG → HOLD → WEAK_SHORT → SHORT → STRONG_SHORT
- **Trading type adaptation:** Per-type weights, TP/SL multipliers, confidence thresholds

### Paper Futures Trading
- Virtual USDC balance with leverage 1x–100x
- Auto-calculation: notional, liquidation price, position size
- TP/SL/Liquidation auto-close on price ticks
- Per-type performance stats (win rate, PnL, avg leverage by type)

### Wallet & Live Trading
- MetaMask + WalletConnect v2 support on ValueChain mainnet (chain ID 286623, SOSO currency)
- Smart connector detects `window.ethereum` on desktop and falls back to WalletConnect QR/deep links on mobile
- EIP-712 typed-data signing for SoDEX spot market orders using the ValueChain domain and SoDEX backend struct
- Trade execution modal with ticker price, wallet balance, 25/50/75/100% quick fill, estimated cost, and Sign & Submit flow
- Order management via `/api/orders` and balance lookup via `/api/balance`
- Wallet dropdown with full address copy, network badge, live balances, wrong-network handling, and disconnect with permission revocation

### Market Intelligence
- SoSoValue API: ETF flows, news sentiment, macro events, BTC treasuries, index snapshots
- SoDEX API: live tickers, multi-timeframe klines, orderbooks
- 5 trading pairs: BTC, ETH, SOL, AVAX, LINK

### AI Signal Enhancement
- Multi-provider AI selection: Deepseek, OpenAI, and OpenRouter
- User-provided provider keys are stored locally in the browser and are not sent to SignalFlow servers
- Per-dimension signal reasoning with why explanations, risk factors, and execution plans
- AI config persists across sessions and resets model/key lock when switching providers

### Dashboard & UX
- Onboarding modal for trading style selection
- TypeSwitcher dropdown for quick style switching
- Regime-based type recommendation
- Per-type weight profiles on Strategy Config page
- Command-center dashboard with pipeline rail, market canvas, Current Decision Score, Catalyst Monitor, and evidence strip
- Current Decision Score follows the live system signal action/confidence shown on `/signals`
- Catalyst Monitor replaces fragile news-only feed with signal events, market movers, volume leaders, SoDEX status, and degraded news-layer status
- Dark theme with professional trading UI

### Mobile & PWA
- Manifest, custom icons, Apple Web App metadata, standalone display mode, and service worker support
- Responsive navigation with compact header, drawer/sidebar behavior, bottom tabs, scroll lock, and safe-bottom padding
- Loading skeletons, empty states, and user-friendly errors across trading, signal, and data views

---

## Wave Progress Update

### Wave 1 (Baseline)
- Next.js dashboard shell with dark-themed trading interface
- SoSoValue API integration (ETF, sentiment, macro, treasury, indices)
- SoDEX live market data (tickers, klines, orderbooks)
- Heuristic 5-dimension signal scoring engine
- AI signal generation via Deepseek with structured prompts
- Full sidebar navigation with 8 pages

### Wave 2 (Current)
**Core Platform:**
- Wallet connection — MetaMask (desktop) + WalletConnect v2 (mobile)
- EIP-712 trade execution on SoDEX via typed data signing
- Multi-AI provider — Deepseek, OpenAI, OpenRouter with user API keys
- PWA support — installable, offline-capable, custom app icons
- Mobile responsive — bottom tab nav, slide-in drawer, compact header
- Order management dashboard — place market orders, view open/filled/canceled status, cancel pending orders
- Wallet panel — address copy, ValueChain network badge, live balances, disconnect, wrong-network handling

**Signal Engine V2:**
- Multi-factor confluence system (5 factors, 7 layers)
- Market regime detection (5 regimes)
- 7-tier signal classification (STRONG_LONG → STRONG_SHORT)
- Volatility-adjusted TP/SL with ATR multipliers

**Trading Type System:**
- 4 trading types: Scalping, Intraday, Swing, Position
- Per-type factor weights (engine adapts dynamically)
- Per-type TP/SL multipliers (blended with regime)
- Per-type confidence thresholds (60%–75%)
- Per-type leverage caps (3x–20x)
- Onboarding modal + TypeSwitcher UI

**Multi-Timeframe Confluence:**
- Signal generation on 1H, 4H, and 1D timeframes
- Alignment scoring (95 = all agree, 30 = conflicting)
- Color-coded MTF badges on signal cards

**Paper Futures Trading:**
- Virtual USDC balance with leverage 1x–100x
- Auto TP/SL/Liquidation
- Per-type performance breakdown
- Position tracking with real-time P&L

**Backtest Engine:**
- Walk-forward historical replay
- Per-regime accuracy breakdown
- Win rate, profit factor, max drawdown metrics
- Equity curve visualization
- Per-type backtesting

**Command Center Dashboard:**
- SignalFlow pipeline rail from market data to decision score
- Current Decision Score wired to the same live system signal used by `/signals`
- Catalyst Monitor stays useful during SoSoValue quota limits by synthesizing signal, market, risk, and data-layer events
- Evidence strip: Market Pressure, Signal Reliability, Macro Tape, Execution Readiness

**Enhanced Pages:**
- /signals — Onboarding modal, type filtering, MTF badges, regime recommendation
- /trading — Type-aware OrderForm, leverage caps, type pre-fill
- /performance — Backtest panel, per-type stats
- /strategy-config — Per-type weight profiles visualization
- /docs — Updated documentation

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (`node --version`)
- **pnpm** (`npm install -g pnpm`)
- A wallet with SOSO on ValueChain mainnet for trading

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/nohypelabs/signalflow-agent.git
cd signalflow-agent/dashboard

# 2. Install dependencies
pnpm install

# 3. Create environment file
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local` with your API keys:

```env
# SoDEX — Sosovalue DEX
SODEX_NETWORK=mainnet
SODEX_API_KEY_NAME=SignalFlowAgent

# Deepseek (fallback AI)
DEEPSEEK_API_KEY=sk-you...-key

# SoSoValue
SOSOVALUE_API_KEY=SOSO-your-sosovalue-key

# WalletConnect v2 (for mobile) — get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

### Run

```bash
pnpm dev          # Development — http://localhost:3000
pnpm build        # Production build
pnpm start        # Production server — http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout + PWA metadata + CacheBuster
│   ├── providers.tsx            # Wagmi + TanStack Query providers
│   ├── globals.css              # CSS variables (dark fintech color system)
│   └── (dashboard)/
│       ├── layout.tsx           # AppShell with sidebar + header
│       ├── page.tsx             # Redirects to /dashboard
│       ├── dashboard/           # KPI cards, chart, signal feed
│       ├── signals/             # Signal list + onboarding + type filtering
│       ├── trading/             # Trade form + chart + orders
│       ├── portfolio/           # Paper futures PnL + positions
│       ├── trade-history/       # Past trades
│       ├── signal-history/      # Signal history tracking
│       ├── performance/         # Performance + backtest panel
│       ├── strategy-config/     # Per-type weight profiles
│       ├── data-sources/        # API module status
│       ├── settings/            # Settings
│       └── docs/                # In-app documentation
├── app/api/
│   ├── signals/                 # GET — V2 engine + multi-TF confluence
│   ├── signals/analyze          # POST — AI signal generation
│   ├── backtest/                # GET — Historical backtest
│   ├── market/[type]            # GET — SoDEX tickers, klines
│   ├── orders/                  # GET + POST — SoDEX orders
│   ├── orders/[id]              # DELETE — cancel order
│   ├── balance/                 # GET — Wallet balance
│   ├── orderbook/               # GET — Orderbook depth
│   ├── etf-flow/                # GET — ETF flow data
│   ├── macro/                   # GET — Macro events
│   ├── news/                    # GET — News sentiment
│   ├── performance/             # GET — Portfolio performance
│   ├── sources/                 # GET — Data source availability
│   └── status/                  # GET — SoDEX health
├── components/
│   ├── layout/                  # AppShell, Sidebar, Header, WalletDropdown, MobileBottomNav
│   ├── ui/                      # Button, Card, Badge, Skeleton, EmptyState, etc.
│   ├── signals/                 # SignalCard, SignalFilters, SignalAnalysisDrawer, etc.
│   ├── charts/                  # ChartDrawingOverlay, ChartDrawingToolbar
│   ├── shared/                  # SectionCard
│   ├── SignalsPage.tsx          # Signals with onboarding + type filtering
│   ├── TraderTypeModal.tsx      # Trading style onboarding modal
│   ├── TypeSwitcher.tsx         # Type dropdown switcher
│   ├── OrderForm.tsx            # Type-aware order form
│   ├── BacktestPanel.tsx        # Historical backtest UI
│   ├── PaperTradingStats.tsx    # Per-type paper trading stats
│   ├── PortfolioPage.tsx        # Paper futures PnL page
│   ├── StrategyConfig.tsx       # Per-type weight profiles
│   ├── PerformancePage.tsx      # Performance + backtest
│   ├── ETFFlowChart.tsx         # ETF flow visualization
│   ├── MacroCalendar.tsx        # Macro events calendar
│   ├── NewsSentimentDashboard.tsx # News sentiment analysis
│   └── ...
├── lib/
│   ├── strategy/
│   │   ├── signal-engine-v2.ts  # 5-layer signal engine with type adaptation
│   │   ├── signal-engine.ts     # Legacy 5-dimension scoring
│   │   ├── indicators.ts        # Technical indicators (SMA, EMA, RSI, MACD, BB, ATR, ADX, OBV, ROC, Fibonacci)
│   │   └── backtest.ts          # Walk-forward backtest engine
│   ├── types/
│   │   ├── signal.ts            # Signal, SignalV2 types
│   │   ├── trading-type.ts      # TradingType config registry
│   │   ├── trade.ts             # SoDEX trade types
│   │   └── datasource.ts        # AIProvider, AIConfig types
│   ├── chart-drawings/          # Chart drawing tools (types, math, storage)
│   ├── api/                     # Client-side fetch helpers + no-cache headers
│   ├── hooks/                   # 16 hooks (useSignals, usePaperTrading, useMarket, etc.)
│   ├── sosovalue.ts             # SoSoValue API client
│   ├── sodex.ts                 # SoDEX API client
│   ├── deepseek.ts              # LLM chat client
│   ├── ai-providers.ts          # AI provider registry
│   ├── dashboard-context.tsx    # Global dashboard state
│   ├── eip712.ts                # EIP-712 typed data signing
│   ├── wallet-config.ts         # Wagmi wallet configuration
│   └── pair-map.ts              # Pair-to-SoDEX symbol mapping
└── ...
```

---

## Team

**NoHype Labs**

| | |
|---|---|
| **Abdul Gofur** | Full-stack Blockchain Developer |
| | abdulgofur100persen@gmail.com |
| | [github.com/nohypelabs](https://github.com/nohypelabs) |

> *"Building tools that make on-chain trading smarter, not harder."*

---

## Deployment

Deployed on **Vercel** with automatic CI/CD from `main` branch. Every push triggers a production build.

---

Built by **NoHype Labs** for the SoSoValue Buildathon 2026 — Wave 2.

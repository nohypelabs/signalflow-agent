# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SignalFlow Agent Dashboard — AI-powered crypto signal-to-execution trading dashboard by NoHype Labs, built for the SoSoValue Buildathon 2026. Features a multi-factor confluence signal engine V2 with trading type differentiation, multi-timeframe analysis, paper futures trading, and historical backtesting.

**This is Next.js 16 with breaking changes.** Read `node_modules/next/dist/docs/` before writing any code — APIs, conventions, and file structure differ from training data.

## Commands

```bash
pnpm dev          # Dev server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Run production build
pnpm lint         # ESLint (next/core-web-vitals + typescript)
```

No test framework is configured.

## Environment Variables

Required in `.env.local` for live data (the app degrades gracefully without them):

```
SOSOVALUE_API_KEY=         # SoSoValue openapi key
DEEPSEEK_API_KEY=          # Deepseek chat API key (fallback AI)
SODEX_NETWORK=             # "mainnet" (default) or "testnet"
SODEX_API_KEY_NAME=        # SoDEX API key for authenticated trading
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # WalletConnect v2 (mobile wallets)
```

## Architecture

**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript 5, TanStack Query, wagmi v3, viem, lightweight-charts, pnpm

**Routing:** Next.js App Router with file-based routes under `src/app/(dashboard)/` route group. The `(dashboard)` group provides sidebar + header layout via `layout.tsx`.

**State:** `dashboard-context.tsx` is a global React Context that aggregates market data, signals, wallet, AI config, and trading state. Components consume via `useDashboard()`.

**Providers:** `providers.tsx` wraps the app with WagmiProvider (wallet) + QueryClientProvider (TanStack Query).

### Data Flow

```
External APIs → Server API Routes → Client Hooks (TanStack Query) → Components
                                                                         ↕
                                                            dashboard-context.tsx
                                                          (global state aggregator)
```

Three external integrations, all proxied through Next.js API routes (server-side, where env vars live):

1. **SoSoValue API** (`src/lib/sosovalue.ts`) — ETF flows, news sentiment, macro events, BTC treasuries, market snapshots, klines
2. **SoDEX API** (`src/lib/sodex.ts`) — Live tickers, multi-TF klines, orderbooks, paper trading orders/balances
3. **AI Providers** (`src/lib/deepseek.ts` + `src/lib/ai-providers.ts`) — DeepSeek (default), OpenAI, OpenRouter for signal enrichment

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/signals` | GET — V2 engine + multi-TF confluence signal generation |
| `/api/signals/analyze` | POST — AI-enriched single-coin analysis |
| `/api/backtest` | GET — Historical walk-forward backtest |
| `/api/market/[type]` | GET — SoDEX: `tickers`, `klines`, `symbols` |
| `/api/orders` | GET/POST — SoDEX open orders + place order |
| `/api/orders/[id]` | DELETE — cancel order |
| `/api/balance` | GET — SoDEX account balances |
| `/api/orderbook` | GET — Orderbook depth |
| `/api/etf-flow` | GET — ETF flow data |
| `/api/macro` | GET — Macro events |
| `/api/news` | GET — News sentiment |
| `/api/performance` | GET — Performance metrics |
| `/api/sources` | GET — Data source availability |
| `/api/status` | GET — System health |

All API routes use `force-dynamic` + no-cache headers via `src/lib/api/no-cache.ts`.

### Client Hooks (16 total)

| Hook | API Route | Returns |
|------|-----------|---------|
| `useMarket(symbol)` | `/api/market/tickers` + `/api/market/klines` | `{tickers, klines, loading, error}` |
| `useSignals()` | `/api/signals` | `{data: SignalsData}` (auto-refreshes) |
| `useAISignal()` | `/api/signals/analyze` | `{aiSignal, analyzing, error, generate(coin)}` |
| `usePaperTrading()` | — (client-side engine) | Paper futures with leverage, liquidation, P&L |
| `useSignalHistory()` | — (localStorage) | Recorded signal history |
| `useETFFlow()` | `/api/etf-flow` | ETF flow chart data |
| `useChartDrawings()` | — (localStorage) | Chart drawing tools |
| `useDashboardMetrics()` | multiple | KPI card data |
| `useDataSources()` | `/api/sources` | Data source status |
| `usePerformance()` | `/api/performance` | Performance metrics |
| `useStatus()` | `/api/status` | System health |
| `useTradeExecution()` | `/api/orders` | Trade execution |
| `useWallet()` | — (wagmi) | Wallet connection |
| `useAIConfig()` | — (localStorage) | AI provider configuration |
| `useFavoriteTickers()` | — (localStorage) | User watchlist |
| `useSignalGeneration()` | — (state) | Signal generation phases |

### Signal Engine V2

5-layer architecture in `src/lib/strategy/signal-engine-v2.ts`:

1. **Market Regime Detection** — TRENDING_UP, TRENDING_DOWN, RANGING, VOLATILE, BREAKOUT
2. **5-Factor Confluence** — Trend (EMA/ADX), Momentum (RSI/MACD/ROC), Volatility (BB/ATR), Volume (OBV), Structure (S/R + Fibonacci)
3. **7-Tier Classification** — STRONG_LONG → LONG → WEAK_LONG → HOLD → WEAK_SHORT → SHORT → STRONG_SHORT
4. **Volatility-Adjusted TP/SL** — ATR multipliers × trading type × market regime
5. **Filtering** — Min confluence gates per trading type

### Trading Type System

Defined in `src/lib/types/trading-type.ts`. 4 types with per-type configs:

| Type | Timeframe | Max Lev | Min Conf | Key Weights |
|------|-----------|---------|----------|-------------|
| ⚡ Scalper | 1m–15m | 20x | 60% | Momentum 40%, Volatility 25% |
| 📊 Intraday | 1h–4h | 10x | 65% | Momentum 30%, Trend 25% |
| 📈 Swing | 1D–7D | 5x | 70% | Trend 35%, Structure 25% |
| 🏦 Position | 1W+ | 3x | 75% | Trend 45%, Structure 30% |

- Onboarding modal (`TraderTypeModal.tsx`) on first visit to /signals
- TypeSwitcher dropdown for quick switching
- Engine adapts weights, TP/SL, and confidence thresholds per type

### Multi-Timeframe Confluence

Signals analyzed across 3 timeframes: 1H (250 bars), 4H (120 bars), 1D (60 bars).
Confluence scoring: 95 = all 3 agree, 80 = 2/2 agree, 70 = 2/3 agree, 30-50 = mixed.

### Paper Futures Trading

Client-side engine in `src/lib/hooks/usePaperTrading.ts`:
- Virtual USDC balance with leverage 1x–100x
- Auto TP/SL/Liquidation on price ticks
- Per-type performance breakdown
- Position tracking with real-time P&L

### Backtest Engine

Walk-forward backtesting in `src/lib/strategy/backtest.ts`:
- Sliding window — generate signal using N bars, evaluate outcome M bars ahead
- Per-regime accuracy, win rate, profit factor, max drawdown
- Per-type backtesting with equity curve visualization

### Core Data Models

- `Signal` / `SignalV2` in `src/lib/types/signal.ts` — central data shape used across all components
- `TradingType` config in `src/lib/types/trading-type.ts` — per-type weights, TP/SL, thresholds
- `SoDEXTicker`, `SoDEXOrder` in `src/lib/types/trade.ts` — SoDEX trade types
- `AIProvider`, `AIConfig` in `src/lib/types/datasource.ts` — AI provider types
- `pair-map.ts` translates display pairs (BTC/USDT) to SoDEX symbols (vBTC_vUSDC)
- `sodex-types.ts` is separate from `sodex.ts` so client components can import types without pulling in `process.env` references

### Key Conventions

- **Routing:** Next.js App Router with file-based routes under `(dashboard)/` route group
- **State:** `dashboard-context.tsx` aggregates all major hooks into a single context
- **Dark fintech theme** via CSS variables in `globals.css`:
  - `--bg-base: #05070D`, `--bg-card: #0B1020`, `--accent-primary: #00E5A8`
  - `--border-default: #1E293B`, `--text-primary: #F8FAFC`
  - BUY: `#00ff88`, SELL: `#ff4444`, HOLD: `#ff8800`
- **Path alias:** `@/*` → `./src/*`
- **No mock data** in production — all signals from live APIs
- **No-cache headers** on all API routes via `src/lib/api/no-cache.ts`
- **Service worker disabled** — CacheBuster + ServiceWorkerCleanup handle stale data
- **Chart drawings** persisted to localStorage via `src/lib/chart-drawings/storage.ts`

## Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | — | Redirects to `/dashboard` |
| `/dashboard` | `page.tsx` | KPI cards, chart, signal feed |
| `/signals` | `SignalsPage.tsx` | Signal list + onboarding modal + type filtering |
| `/trading` | `TradingPageContent.tsx` | Trade form + chart + orders |
| `/portfolio` | `PortfolioPage.tsx` | Paper futures PnL + positions |
| `/trade-history` | `TradeHistory.tsx` | Past trades |
| `/signal-history` | `SignalHistoryPage.tsx` | Signal history tracking |
| `/performance` | `PerformancePage.tsx` | Performance + backtest panel |
| `/strategy-config` | `StrategyConfig.tsx` | Per-type weight profiles |
| `/data-sources` | `DataSources.tsx` | API module status |
| `/settings` | `SettingsPage.tsx` | Settings |
| `/docs` | `DocsPage.tsx` | In-app documentation |

## Deployment

Vercel (project: `dashboard`, org: `team_tUzAbpJU8X4n5mrQJV03eZm9`). Auto CI/CD from `main` branch.

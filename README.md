# SignalFlow Agent

**AI-powered signal-to-execution trading dashboard** — built for the SoSoValue Buildathon 2026 by NoHype Labs.

## Live Demo

**[signalflowagent.vercel.app](https://signalflowagent.vercel.app)**

SignalFlow Agent transforms multi-dimensional market data into explainable, executable trade signals. Real-time data from SoSoValue API and SoDEX, AI-powered BUY/HOLD/SELL signals with per-dimension reasoning, and spot trade execution on ValueChain via EIP-712 wallet signing — all in one dashboard.

---

## Why SignalFlow?

> Most AI trading agents give you a score. SignalFlow gives you a **plan**.

- **Not just data — decisions.** Every signal includes entry price, stop-loss, and take-profit targets.
- **Not just a dashboard — execution.** Trade directly on SoDEX with EIP-712 signing, no third-party middleman.
- **Not just one AI — your choice.** Use Deepseek, OpenAI, or OpenRouter with your own API key. Your keys, your control.
- **Not just desktop — everywhere.** PWA installable on iOS/Android, responsive layout, WalletConnect for mobile trading.

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
│ Macro     │            │ Spot Trading     │                    │
│ Treasury  │            │ Account Balance  │                    │
│ Indices   │            └────────┬────────┘                    │
└─────┬─────┘                     │                              │
      │                           │                              │
      ▼                           ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Signal Engine                                 │
│  5-dimension heuristic scoring (0-100) → AI synthesis → BUY/HOLD/SELL│
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   EIP-712 Trade Execution│
                    │   MetaMask · WalletConnect│
                    │   ValueChain Mainnet      │
                    └─────────────────────────┘
```

**Stack**: Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, wagmi v3, viem

---

## Supported Networks

| Network | Chain ID | Native Token | Trading Pair | Status |
|---------|----------|-------------|-------------|--------|
| ValueChain Mainnet | 286623 | SOSO | vBTC_vUSDC | Live |

---

## Core Logic

A **multi-dimensional signal engine** that aggregates five data dimensions into a unified confidence score:

| Dimension | Source | What It Measures |
|-----------|--------|------------------|
| ETF Flow | SoSoValue | Institutional capital rotation (BTC/ETH ETFs) |
| Sentiment | SoSoValue | News & social media sentiment scoring |
| Macro | SoSoValue | Interest rates, inflation, global liquidity |
| Momentum | SoDEX | Price action, kline patterns, volume |
| Treasury | SoSoValue | BTC corporate treasury activity |

Each dimension generates a 0–100 score. The AI agent synthesizes these into a single signal with **per-dimension reasoning**, key risk factors, and a concrete execution plan — entry price, stop-loss, take-profit.

### Data Sources & APIs

| API | Purpose | Auth |
|-----|---------|------|
| SoSoValue | ETF flows, news, macro, treasuries, indices | API key |
| SoDEX | Live tickers, klines, orderbooks, spot trading | API key + EIP-712 wallet signing |
| Deepseek / OpenAI / OpenRouter | AI signal generation & reasoning | User-provided API key |

---

## Features

### AI Signal Generation
- Multi-provider support — Deepseek, OpenAI, or OpenRouter with user's own API key, stored locally in browser
- Explainable reasoning — every signal includes per-dimension "why" explanations, key risk factors, and execution plan
- Confidence scoring — 0–100% with visual indicators, color-coded BUY/HOLD/SELL badges

### Wallet & Trading
- MetaMask (desktop) + WalletConnect v2 (mobile) — smart connector auto-detects window.ethereum
- EIP-712 typed data signing for SoDEX spot orders — domain name="spot", chainId=286623
- Live wallet balance display with 25/50/75/100% quick-fill trade execution buttons
- Order management — place market orders, view open/filled/canceled status, cancel pending orders
- Wrong network detection — switch chain or disconnect to different wallet

### Mobile & PWA
- Installable PWA with offline service worker, custom app icons, standalone display mode
- Responsive layout — slide-in sidebar drawer, bottom tab navigation (Home/Signals/Trade/Settings)
- Apple Web App meta tags with black-translucent status bar

### Market Intelligence
- Real-time SoDEX tickers, klines, and orderbooks for vBTC_vUSDC pair
- SoSoValue integration across 5 modules — ETF Flow, News Sentiment, Macro, Treasury, Indices
- 60-second auto-refresh on signal data

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
- Wallet connection — MetaMask (desktop) + WalletConnect v2 (mobile)
- EIP-712 trade execution on SoDEX via typed data signing
- Multi-AI provider — Deepseek, OpenAI, OpenRouter with user API keys
- Explainable signals — per-dimension "why", key factors, execution plans
- Live balance display with 25/50/75/100% quick-fill
- PWA support — installable, offline-capable, custom app icons
- Mobile responsive — bottom tab nav, slide-in drawer, compact header
- Order management — place, view, cancel SoDEX orders
- Wrong network handling — switch chain or disconnect option
- Wallet panel — address copy, balance view, clear disconnect button

---

## Roadmap

### Wave 3 — Production Features & Public Launch
- [ ] Backtesting engine — validate signal accuracy against historical SoSoValue data
- [ ] Multi-asset support — expand beyond vBTC_vUSDC to additional trading pairs
- [ ] Portfolio management — multi-asset position tracking, automated rebalancing, risk-adjusted sizing
- [ ] Strategy marketplace — create, share, and subscribe to custom signal strategies
- [ ] Notification system — Telegram and email alerts for high-confidence signals and trade executions
- [ ] Performance optimization — Redis caching, rate limiting, WebSocket streaming
- [ ] Public launch — documentation, onboarding wizard, community channels

### Wave 4 — Ecosystem & Scale
- [ ] Multi-chain expansion — cross-chain signal aggregation, unified portfolio view
- [ ] Advanced order types — trailing stop-loss, OCO bracket orders, TWAP execution
- [ ] Copy-trading and signal leaderboards with verified on-chain track records
- [ ] Institutional dashboard — multi-wallet management, team roles, approval workflows
- [ ] Public REST API, WebSocket feeds, and trading bot SDK (TypeScript/Python)

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
cd signalflow-agent

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
DEEPSEEK_API_KEY=sk-your-deepseek-key

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
│   ├── layout.tsx           # Root layout + PWA metadata
│   ├── page.tsx             # Main SPA orchestrator (client-side routing)
│   ├── providers.tsx        # WagmiProvider + QueryClientProvider
│   ├── globals.css          # Tailwind v4 + custom animations
│   └── api/
│       ├── market/[type]    # GET — SoDEX tickers, klines, symbols
│       ├── signals/         # GET — heuristic 5-dimension scoring
│       ├── signals/analyze  # POST — AI signal generation
│       ├── balance/         # GET — SoDEX wallet balance
│       ├── orders/          # GET (list) + POST (place)
│       ├── orders/[id]      # DELETE — cancel order
│       ├── sources/         # GET — SoSoValue module status
│       ├── performance/     # GET — portfolio performance data
│       └── status/          # GET — SoDEX connection health
├── components/
│   ├── TopBar.tsx           # Header with status indicator + hamburger
│   ├── Sidebar.tsx          # Desktop vertical nav + mobile slide-in drawer
│   ├── MobileBottomNav.tsx  # Fixed bottom tab bar (Home/Signals/Trade/Settings)
│   ├── WalletButton.tsx     # Connect/disconnect + balance dropdown panel
│   ├── TradeForm.tsx        # Trade execution modal with EIP-712 signing
│   ├── SignalsPage.tsx      # AI signal analysis with per-dimension reasoning
│   ├── SignalList.tsx       # Signal table with confidence scores
│   ├── TradeHistory.tsx     # Orders, positions, and executable signals table
│   ├── OpenOrders.tsx       # Active SoDEX orders with cancel action
│   ├── SettingsPage.tsx     # AI provider + model + API key configuration
│   ├── KPICards.tsx         # Dashboard stat cards (P&L, win rate, etc.)
│   ├── PortfolioChart.tsx   # Price chart from kline data
│   ├── AIReasoning.tsx      # AI-generated signal rationale panel
│   ├── DataSources.tsx      # SoSoValue API module status grid
│   ├── PerformancePage.tsx  # Performance metrics dashboard
│   ├── StrategyConfig.tsx   # Signal strategy configuration
│   └── PWARegister.tsx      # Service worker registration (client-only)
└── lib/
    ├── wallet-config.ts     # ValueChain chain def + wagmi config
    ├── use-wallet.ts        # Wallet connect/disconnect/status hook
    ├── use-market.ts        # SoDEX tickers + klines hook
    ├── use-signals.ts       # Signal scoring hook (60s auto-refresh)
    ├── use-ai-signal.ts     # AI signal generation hook
    ├── use-ai-config.ts     # localStorage AI provider persistence
    ├── use-orders.ts        # SoDEX order fetch/place/cancel hook
    ├── use-performance.ts   # Portfolio performance hook
    ├── use-sources.ts       # SoSoValue module status hook
    ├── use-status.ts        # SoDEX health check hook
    ├── ai-providers.ts      # Deepseek/OpenAI/OpenRouter registry
    ├── sosovalue.ts         # SoSoValue API client (server-side)
    ├── sodex.ts             # SoDEX API client (server-side)
    ├── deepseek.ts          # AI chat completions client
    ├── eip712.ts            # EIP-712 typed data domain + types
    ├── sodex-types.ts       # SoDEX TypeScript type definitions
    ├── pair-map.ts          # Display pair ↔ SoDEX symbol mapping
    └── mock-data.ts         # Static fallback data for all components
```

---

## Known Issues (Wave 2)

- WalletConnect v2 may timeout on slow mobile connections — retry logic planned for Wave 3
- Deepseek API rate limiting during peak hours — switching to OpenRouter is recommended as fallback
- Hydration mismatch warning in WalletButton when server-rendered state differs from client — cosmetic, no functional impact

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

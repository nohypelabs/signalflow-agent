# SignalFlow Agent

**AI-powered signal-to-execution trading dashboard** — built for the SoSoValue Buildathon 2026 by NoHype Labs.

SignalFlow Agent transforms multi-dimensional market data into explainable, executable trade signals. It ingests real-time data from SoSoValue API and SoDEX, generates AI-powered BUY/HOLD/SELL signals with per-dimension reasoning, and executes spot trades directly on ValueChain via EIP-712 wallet signing.

**Live Demo**: [signalflowagent.vercel.app](https://signalflowagent.vercel.app)
**GitHub**: [github.com/nohypelabs/signalflow-agent](https://github.com/nohypelabs/signalflow-agent)

---

## Project Overview

### Target Users

Crypto traders and investors who want **data-driven, AI-powered trading signals** with **one-click execution** — without switching between multiple platforms. Built for both desktop (MetaMask extension) and mobile (WalletConnect / PWA).

### Core Logic

A **multi-dimensional signal engine** that aggregates five data dimensions into a unified confidence score:

| Dimension | Source | What It Measures |
|-----------|--------|------------------|
| ETF Flow | SoSoValue | Institutional capital rotation (BTC/ETH ETFs) |
| Sentiment | SoSoValue | News & social media sentiment scoring |
| Macro | SoSoValue | Interest rates, inflation, global liquidity |
| Momentum | SoDEX | Price action, kline patterns, volume |
| Treasury | SoSoValue | BTC corporate treasury activity |

Each dimension generates a 0–100 score. The AI agent synthesizes these into a single signal (BUY/HOLD/SELL) with **per-dimension reasoning**, key risk factors, and a concrete execution plan.

### Data Sources & APIs

| API | Purpose | Auth |
|-----|---------|------|
| **SoSoValue** | ETF flows, news, macro, treasuries, indices | API key |
| **SoDEX** | Live tickers, klines, orderbooks, spot trading | API key + EIP-712 wallet signing |
| **Deepseek / OpenAI / OpenRouter** | AI signal generation & reasoning | User-provided API key |

---

## Wave Progress Update

### Wave 1 (Baseline)
- Next.js dashboard shell with dark-themed trading interface
- SoSoValue API integration (ETF, sentiment, macro, treasury, indices)
- SoDEX live market data (tickers, klines, orderbooks)
- Heuristic 5-dimension signal scoring engine
- AI signal generation via Deepseek with structured prompts
- Mock data fallback for all components
- Full sidebar navigation with 8 pages

### Wave 2 (Current)
- **Wallet connection** — MetaMask (desktop) + WalletConnect v2 (mobile)
- **EIP-712 trade execution** — spot orders on SoDEX via typed data signing
- **Multi-AI provider** — Deepseek, OpenAI, OpenRouter with user API keys
- **Explainable signals** — per-dimension "why", key factors, execution plans
- **Live balance display** — wallet balance with 25/50/75/100% quick-fill
- **PWA support** — installable, offline-capable, custom app icons
- **Mobile responsive** — bottom tab nav, slide-in drawer, compact TopBar
- **Order management** — place, view, cancel SoDEX orders
- **Wrong network handling** — switch chain or disconnect option
- **Wallet panel** — address copy, balance view, clear disconnect button

## Architecture

```
External APIs → Next.js API Routes → Client Hooks → Components

SoSoValue API ─── ETF flows, news/sentiment, macro, treasuries, indices
SoDEX API ──────── Live tickers, klines, orderbooks, spot trading
Deepseek/OpenAI ── AI signal generation with structured reasoning
```

**Stack**: Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, wagmi v3, viem

## Features

### Multi-Source Market Intelligence
- **SoSoValue Integration** — ETF flow analysis, news sentiment scoring, macroeconomic indicators, BTC treasury tracking, index snapshots (Mag 7, Layer 1)
- **SoDEX Live Data** — Real-time tickers, klines, orderbooks for vBTC_vUSDC pairs
- **Heuristic Scoring** — 5-dimension signal engine computing ETF, sentiment, macro, momentum, and treasury scores

### AI Signal Generation
- **Multi-Provider** — Deepseek, OpenAI, or OpenRouter with user's own API key
- **Explainable Reasoning** — Every signal includes per-dimension "why" explanations, key factors, and execution plans
- **Confidence Scoring** — 0–100% with visual indicators

### Wallet & Trading
- **EIP-712 Signing** — Typed data signing for SoDEX spot orders
- **Multi-Wallet** — MetaMask (desktop) + WalletConnect v2 (mobile)
- **ValueChain Mainnet** — Chain ID 286623, native currency SOSO
- **Live Balance** — Real SoDEX balance display with quick-fill percentage buttons
- **Order Management** — Place, view, and cancel orders directly from the dashboard

### Mobile & PWA
- **Progressive Web App** — Installable with offline service worker, custom icons, standalone display
- **Responsive Layout** — Slide-in sidebar drawer, bottom tab navigation on mobile
- **Dark Theme** — Optimized for trading desk use

## Getting Started

### Prerequisites

- **Node.js** 18+ (check: `node --version`)
- **pnpm** (install: `npm install -g pnpm`)
- A wallet with SOSO on ValueChain mainnet for trading

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/nohypelabs/signalflow-agent.git
cd signalflow-agent

# 2. Install dependencies
pnpm install

# 3. Create environment file
cp .env.example .env.local   # or create .env.local manually
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
# Development
pnpm dev          # http://localhost:3000

# Production build
pnpm build
pnpm start        # http://localhost:3000
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout + PWA metadata
│   ├── page.tsx             # Main SPA orchestrator
│   ├── providers.tsx        # Wagmi + React Query providers
│   ├── globals.css          # Tailwind + animations
│   └── api/                 # Next.js API routes
│       ├── market/[type]    # SoDEX tickers/klines proxy
│       ├── signals/         # Heuristic scoring engine
│       ├── signals/analyze  # AI signal generation
│       ├── balance/         # SoDEX wallet balance
│       ├── orders/          # SoDEX order management
│       ├── sources/         # SoSoValue data modules
│       └── performance/     # Portfolio performance
├── components/              # UI components (all "use client")
│   ├── TopBar.tsx           # Header + wallet + hamburger
│   ├── Sidebar.tsx          # Desktop nav + mobile drawer
│   ├── MobileBottomNav.tsx  # Bottom tab bar (mobile)
│   ├── WalletButton.tsx     # Connect/disconnect + balance panel
│   ├── TradeForm.tsx        # Execution modal with EIP-712 signing
│   ├── SignalsPage.tsx      # Detailed signal analysis view
│   ├── TradeHistory.tsx     # Orders + positions table
│   ├── OpenOrders.tsx       # SoDEX open orders
│   ├── SettingsPage.tsx     # AI provider configuration
│   ├── KPICards.tsx         # Stat cards
│   ├── PortfolioChart.tsx   # Price chart
│   ├── AIReasoning.tsx      # AI signal rationale
│   └── DataSources.tsx      # API module status
└── lib/
    ├── wallet-config.ts     # ValueChain + wagmi config
    ├── use-wallet.ts        # Wallet connection hook
    ├── use-market.ts        # SoDEX market data hook
    ├── use-signals.ts       # Signal scoring hook
    ├── use-ai-signal.ts     # AI generation hook
    ├── use-orders.ts        # SoDEX orders hook
    ├── use-ai-config.ts     # AI provider persistence
    ├── ai-providers.ts      # Provider registry
    ├── sosovalue.ts         # SoSoValue API client
    ├── sodex.ts             # SoDEX API client
    ├── eip712.ts            # EIP-712 typed data
    ├── sodex-types.ts       # SoDEX type definitions
    └── mock-data.ts         # Fallback mock data
```

## Team

**NoHype Labs**

| Role | Name | Contact |
|------|------|---------|
| Developer | Abdul Gofur | abdulgofur100persen@gmail.com |

## Deployment

Deployed on **Vercel** with automatic CI/CD from `main` branch. Every push triggers a production build.

---

Built by **NoHype Labs** for the SoSoValue Buildathon 2026 — Wave 2.

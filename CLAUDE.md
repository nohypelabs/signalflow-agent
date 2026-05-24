# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SignalFlow Agent Dashboard — AI-powered crypto signal-to-execution dashboard by NoHype Labs, built for the SoSoValue Buildathon 2026. A single-page Next.js app that combines real-time market data, multi-dimensional signal scoring, and AI-generated trade signals.

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
SOSOVALUE_API_KEY=     # SoSoValue openapi key
DEEPSEEK_API_KEY=      # Deepseek chat API key
SODEX_NETWORK=         # "mainnet" (default) or "testnet"
```

## Architecture

**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript 5, pnpm

The app is a client-rendered SPA — all components use `"use client"` and routing is handled by `useState` in `page.tsx`, not Next.js file-based routing.

### Data Flow

```
External APIs → Server API Routes → Client Hooks → Components
```

Three external integrations, all proxied through Next.js API routes (server-side, where env vars live):

1. **SoSoValue API** (`src/lib/sosovalue.ts`) — ETF flows, news, macro events, BTC treasuries, market snapshots, klines
2. **SoDEX API** (`src/lib/sodex.ts`) — Live tickers, klines, orderbooks for virtual asset pairs (vBTC_vUSDC format)
3. **Deepseek AI** (`src/lib/deepseek.ts`) — Chat completions for AI signal generation

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/market/[type]` | Proxies SoDEX: `tickers`, `klines`, `symbols` |
| `/api/signals` | GET: Fetches SoSoValue data, computes heuristic dimension scores (ETF, sentiment, macro, momentum, treasury) |
| `/api/signals/analyze` | POST `{coin}`: Gathers live data from all sources, sends structured prompt to Deepseek, returns AI-generated signal |

### Client Hooks

| Hook | API Route | Returns |
|------|-----------|---------|
| `useMarket(symbol)` | `/api/market/tickers` + `/api/market/klines` | `{tickers, klines, loading, error}` |
| `useSignals()` | `/api/signals` | `{data: SignalsData}` (auto-refreshes every 60s) |
| `useAISignal()` | `/api/signals/analyze` | `{aiSignal, analyzing, error, generate(coin)}` |

### Core Data Model

`Signal` type in `src/lib/mock-data.ts` — the central data shape used across all components. Has `dimensions` (numeric scores 0-100) and optional `dimensionDetails` (score + detail string). The `action` field is `"BUY" | "SELL" | "HOLD"`.

`pair-map.ts` translates between display pairs (BTC/USDT) and SoDEX symbols (vBTC_vUSDC).

`sodex-types.ts` is separate from `sodex.ts` so client components can import types without pulling in `process.env` references.

### Key Conventions

- Page routing: `useState("Dashboard")` in `page.tsx` switches between Dashboard/Signals/Trade History/Strategy Config/Data Sources/Performance/Settings views
- Dark theme colors: bg `#0a0a14`, card `#12122a`, borders `#1a1a2e`, accent `#7b2fff`, positive `#00ff88`, negative `#ff4444`
- Path alias: `@/*` → `./src/*`
- Components receive data via props from `page.tsx` — no global state, no context providers
- Mock data in `mock-data.ts` provides fallback content; real data comes through the hooks

## Deployment

Vercel (project: `dashboard`, org: `team_tUzAbpJU8X4n5mrQJV03eZm9`).

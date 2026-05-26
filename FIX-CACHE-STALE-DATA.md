# Fix: Cache Stale Data Issue

## Problem
When accessing signalflowagent.vercel.app from a browser with cached data, the site shows stale/mock data on first load. User needs to refresh 2x before real data appears. Incognito works fine.

## Root Cause
1. **Service worker (`public/sw.js`)** — cache-first strategy intercepts ALL GET requests and serves stale cached responses
2. **No cache headers** — zero API routes had `Cache-Control` or `force-dynamic`, so Next.js/Vercel could statically cache them
3. **All fetch calls default** — zero client-side `fetch()` calls used `cache: "no-store"`, so browser/HTTP cache could serve stale responses
4. **Mock data fallbacks** — 4 components rendered mock data when live data wasn't available yet, making it look like the app was "working" with stale content

## Changes Made

### 1. Service Worker Disabled
- `public/sw.js` — Replaced cache-first with self-unregistering script
- `src/components/ServiceWorkerCleanup.tsx` — New component that unregisters all SWs and clears all caches on app startup
- `src/components/PWARegister.tsx` — No longer imported (can be deleted)
- `src/app/layout.tsx` — Replaced `<PWARegister />` with `<ServiceWorkerCleanup />`

### 2. Cache Headers on All API Routes
- `src/lib/api/no-cache.ts` — New shared helper with `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- All 9 API routes updated:
  - `export const dynamic = "force-dynamic"` added to each
  - `NextResponse.json()` replaced with `jsonNoCache()` from the helper
  - Routes: balance, market/[type], orders, orders/[id], performance, signals, signals/analyze, sources, status

### 3. Client Fetch Cache Busting
- `src/lib/api/datasources.ts` — `cache: "no-store"` added to all 5 fetch calls
- `src/lib/api/signals.ts` — `cache: "no-store"` added to GET fetch
- `src/lib/api/trades.ts` — `cache: "no-store"` added to GET fetch
- `src/components/TradeForm.tsx` — `cache: "no-store"` on balance fetch
- `src/components/layout/WalletDropdown.tsx` — `cache: "no-store"` on both balance fetches

### 4. Mock Data Removed from Production UI
- `src/components/SignalList.tsx` — Removed mock fallback, shows "Loading signals..." when empty
- `src/components/SignalsPage.tsx` — Added `liveSignals` prop, removed mock import
- `src/components/TradeHistory.tsx` — Added `liveSignals` prop, removed mock import
- `src/app/(dashboard)/trading/page.tsx` — Uses `d.liveSignals` instead of mock `signals`
- `src/app/(dashboard)/signals/page.tsx` — Passes `d.liveSignals` to SignalsPage
- `src/app/(dashboard)/trade-history/page.tsx` — Passes `d.liveSignals` to TradeHistory
- `src/components/MarketTickerTape.tsx` — Returns null when no data instead of mock tickers

### 5. Cache Buster Version Marker
- `src/components/CacheBuster.tsx` — New component that:
  - Reads `NEXT_PUBLIC_APP_VERSION` from env
  - Compares with stored version in localStorage
  - If different, clears stale data (preserves AI config, favorites, strategy config)
  - Updates stored version
- `next.config.ts` — Reads version from package.json and exposes as `NEXT_PUBLIC_APP_VERSION`
- `src/app/layout.tsx` — Added `<CacheBuster />`

## Files Changed
- `public/sw.js` — Replaced with self-unregistering
- `next.config.ts` — Added app version env
- `src/app/layout.tsx` — ServiceWorkerCleanup + CacheBuster
- `src/lib/api/no-cache.ts` — New shared cache header helper
- `src/lib/api/datasources.ts` — cache: no-store
- `src/lib/api/signals.ts` — cache: no-store
- `src/lib/api/trades.ts` — cache: no-store
- `src/app/api/balance/route.ts` — force-dynamic + no-cache
- `src/app/api/market/[type]/route.ts` — force-dynamic + no-cache
- `src/app/api/orders/route.ts` — force-dynamic + no-cache
- `src/app/api/orders/[id]/route.ts` — force-dynamic + no-cache
- `src/app/api/performance/route.ts` — force-dynamic + no-cache
- `src/app/api/signals/route.ts` — force-dynamic + no-cache
- `src/app/api/signals/analyze/route.ts` — force-dynamic + no-cache
- `src/app/api/sources/route.ts` — force-dynamic + no-cache
- `src/app/api/status/route.ts` — force-dynamic + no-cache
- `src/components/ServiceWorkerCleanup.tsx` — New
- `src/components/CacheBuster.tsx` — New
- `src/components/SignalList.tsx` — Removed mock fallback
- `src/components/SignalsPage.tsx` — Uses liveSignals prop
- `src/components/TradeHistory.tsx` — Uses liveSignals prop
- `src/components/MarketTickerTape.tsx` — No mock fallback
- `src/components/TradeForm.tsx` — cache: no-store
- `src/components/layout/WalletDropdown.tsx` — cache: no-store
- `src/app/(dashboard)/trading/page.tsx` — Uses liveSignals
- `src/app/(dashboard)/signals/page.tsx` — Passes liveSignals
- `src/app/(dashboard)/trade-history/page.tsx` — Passes liveSignals

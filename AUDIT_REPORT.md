# SignalFlow Agent Dashboard Audit Report

Date: 2026-06-01
Scope: `/DataPopOS/projects/signalflow-agent/dashboard`
Audit type: Full stack engineering audit covering backend route handlers, frontend architecture, data model, API design, security, business logic, UI/UX, performance, and production readiness.

## Executive Summary

SignalFlow is a Next.js 16 app where the "backend" is primarily App Router API routes that proxy SoDEX, SoSoValue, and AI provider calls. There is no first-party database or ORM schema in this repository; durable product state is mostly external APIs plus browser `localStorage`.

The codebase builds successfully and lint has no errors, but it is not production ready for real trading workflows. The main blockers are weak API validation, inconsistent response envelopes, server-side order execution through an app-level SoDEX API key, API keys passed through query/body and stored in `localStorage`, oversized frontend/business-logic modules, and lack of production observability/rate limiting.

Validation performed:

- `pnpm lint`: passed with 9 warnings.
- `pnpm build`: passed.
- Docdex repo inspection, search, symbol extraction, and impact graph checks were used. Impact graph for `src/lib/dashboard-context.tsx` shows broad outbound coupling into hooks/types/API clients; impact graph for route handlers returned no edges, so route assessment used direct file inspection.

## Final Scoring

| Area | Score |
| --- | ---: |
| Backend Architecture | 5/10 |
| API Design | 4/10 |
| Database Design | 2/10 |
| Security | 3/10 |
| Business Logic | 5/10 |
| Frontend Architecture | 5/10 |
| UI Consistency | 6/10 |
| UX | 6/10 |
| Performance | 5/10 |
| Production Readiness | 4/10 |
| Total | 45/100 |

Interpretation: Prototype. The product has strong demo coverage and a successful production build, but needs hardening before handling real users, real orders, or production incident response.

## Phase 1 - Codebase Structure Audit

### Findings

#### Issue 1: Oversized command-center component

Severity: High
Location: `src/components/dashboard/command-center/SignalFlowCommandCenter.tsx`
Problem: The file is 1,909 lines and contains icons, helper utilities, decision scoring UI, data presentation, nested panels, and multiple component families in one module.
Impact: Small UI changes have high regression risk. Reuse is difficult, review surface is large, and performance tuning becomes harder because unrelated UI sections share one render tree.
Recommendation: Split into `DecisionPanel`, `PipelinePanel`, `MarketOverview`, `EvidencePanels`, `ExecutionReadiness`, `NewsPanel`, and shared helpers under `src/components/dashboard/command-center/`.
Code Example:

```tsx
// src/components/dashboard/command-center/index.tsx
export default function SignalFlowCommandCenter() {
  return (
    <>
      <PipelinePanel />
      <DecisionPanel />
      <EvidenceGrid />
    </>
  );
}
```

Estimated Effort: Large
Priority: P1

#### Issue 2: Business logic service exceeds maintainability threshold

Severity: High
Location: `src/lib/strategy/signal-engine-v2.ts`
Problem: The file is 1,267 lines and acts as a god module for the V2 signal engine.
Impact: Trading logic changes are difficult to isolate and test. Hidden coupling increases the risk of incorrect LONG/SHORT/HOLD decisions.
Recommendation: Extract indicator preparation, scoring, regime detection, execution plan generation, and final signal assembly into separate pure modules with fixture tests.
Estimated Effort: Large
Priority: P1

#### Issue 3: Global dashboard context aggregates too much app state

Severity: Medium
Location: `src/lib/dashboard-context.tsx:132`
Problem: `DashboardProvider` spans lines 132-359 and aggregates market data, signals, AI config, wallet state, orders, signal history, and trade modal state. Docdex impact graph shows outbound dependencies into 13 direct modules.
Impact: Any consumer of `useDashboard()` re-renders against a large state surface, and ownership boundaries are unclear.
Recommendation: Split into narrower providers or hooks: market, signals, execution, wallet, history, and UI shell state. Use TanStack Query consistently for remote data.
Estimated Effort: Large
Priority: P1

#### Issue 4: Oversized page components and docs embedded as JSX

Severity: Medium
Location: `src/components/DocsPage.tsx`, `src/components/TradingChart.tsx`, `src/components/PortfolioPage.tsx`, `src/components/PerformancePage.tsx`
Problem: Multiple components exceed 500 lines. `DocsPage.tsx` is 1,550 lines of documentation content embedded in a client component.
Impact: Build and review noise increases. Documentation changes can affect app bundle size and runtime hydration.
Recommendation: Move long static docs to Markdown/MDX or structured content data. Split large pages into presentational sections.
Estimated Effort: Medium
Priority: P2

#### Issue 5: Dead or unused code warnings remain

Severity: Low
Location: lint output for `src/app/api/correlation/route.ts:57`, `src/components/CorrelationMatrix.tsx:6`, `src/components/DynamicTitle.tsx:5`, `src/components/TradingChart.tsx:189`, `src/components/TradingChart.tsx:218`, `src/components/dashboard/command-center/SignalFlowCommandCenter.tsx:1392`
Problem: Lint reports unused variables/imports and unused eslint directive.
Impact: Low immediate runtime risk, but it weakens lint signal quality.
Recommendation: Remove unused symbols or wire them into active behavior.
Estimated Effort: Small
Priority: P3

### Component Audit

Reusable candidates:

- `DecisionPanel`, `IconControlButton`, traffic-light status display from `SignalFlowCommandCenter.tsx`.
- `Panel`/section chrome patterns from dashboard command center.
- Price/percent formatting helpers currently embedded in large components.

Refactor candidates:

- `SignalFlowCommandCenter.tsx`
- `TradingChart.tsx`
- `PortfolioPage.tsx`
- `PerformancePage.tsx`
- `DocsPage.tsx`
- `dashboard-context.tsx`

Remove candidates:

- Unused `IndexCard` in `SignalFlowCommandCenter.tsx`.
- Unused `Badge` import in `CorrelationMatrix.tsx`.
- Unused `cacheKey` in `correlation/route.ts`.

## Phase 2 - API Architecture Audit

### Endpoint Inventory

GET endpoints:

- `/api/backtest`
- `/api/balance`
- `/api/correlation`
- `/api/etf-flow`
- `/api/funding`
- `/api/macro`
- `/api/market/[type]`
- `/api/news`
- `/api/orderbook`
- `/api/orders`
- `/api/performance`
- `/api/screener`
- `/api/signals`
- `/api/status`
- `/api/trades/recent`

POST endpoints:

- `/api/orders`
- `/api/signals/analyze`

DELETE endpoints:

- `/api/orders/[id]`

PUT/PATCH endpoints: none found.

### Findings

#### Issue 6: No schema validation library is installed or used

Severity: High
Location: `package.json`, `src/app/api/**/route.ts`
Problem: There is no `zod`, `valibot`, `joi`, or equivalent validator dependency. Route handlers use manual truthiness checks and untyped `Number(...)` parsing.
Impact: Invalid payloads can reach trading, market-data, and AI orchestration code. Numeric edge cases like `NaN`, `Infinity`, negative quantities, unsupported intervals, and arbitrary provider URLs are not systematically blocked.
Recommendation: Add a validation layer with route-local schemas or shared API contracts.
Code Example:

```ts
const OrderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().positive().optional(),
});
```

Estimated Effort: Medium
Priority: P0

#### Issue 7: API responses do not follow the requested success/error envelope

Severity: Medium
Location: `src/lib/api/no-cache.ts:9`, `src/app/api/orders/route.ts:22`, `src/app/api/orders/route.ts:40`, `src/app/api/status/route.ts:107`
Problem: `jsonNoCache()` returns arbitrary data as-is. Some endpoints return arrays, some return `{ error }`, some return `{ success: true }`, and many success responses omit `{ success: true, data, message }`.
Impact: Client error handling is inconsistent and future consumers must special-case endpoints.
Recommendation: Introduce `apiSuccess(data, message?)` and `apiError(error, status)` helpers and migrate endpoints incrementally.
Code Example:

```ts
return apiSuccess(orders);
return apiError("Invalid order id", 400);
```

Estimated Effort: Medium
Priority: P1

#### Issue 8: Order endpoint has insufficient trading validation

Severity: Critical
Location: `src/app/api/orders/route.ts:16`
Problem: The POST route only checks `symbol`, `side`, `type`, and `quantity` presence before calling `placeOrder(body)`.
Impact: Malformed order size, unsupported side/type, missing limit price, extreme leverage-like fields, or unknown extra fields can pass through to the SoDEX order API.
Recommendation: Define a strict order schema and reject unknown keys. Add server-side bounds for quantity, price, and supported symbols.
Estimated Effort: Medium
Priority: P0

#### Issue 9: Query params are parsed without safe bounds in several routes

Severity: Medium
Location: `src/app/api/market/[type]/route.ts:28`, `src/app/api/correlation/route.ts:51`, `src/app/api/screener/route.ts:135`, `src/app/api/trades/recent/route.ts:12`
Problem: `Number(...)` and split parameters are used without consistent finite checks, length limits, or allowlists.
Impact: Expensive upstream calls or incorrect downstream values can be triggered by user-controlled query strings.
Recommendation: Add bounded schemas for every route query and clamp arrays like `symbols` to a small maximum.
Estimated Effort: Medium
Priority: P1

## Phase 3 - Database Audit

### Database Health Report

No first-party database schema, ORM, migrations, indexes, or foreign keys were found in this repository. There is no Prisma, Drizzle, SQL migration folder, or database client dependency in `package.json`.

Observed persistence:

- Signal history: `localStorage` via `src/lib/hooks/useSignalHistory.ts:20`.
- Paper trading state: `localStorage` via `src/lib/hooks/usePaperTrading.ts:96`.
- AI config/API key: `localStorage` via `src/lib/hooks/useAIConfig.ts`.
- Server cache: in-memory route-level variables such as `src/app/api/signals/route.ts:36`, `src/app/api/screener/route.ts:46`, and `src/app/api/correlation/route.ts:43`.

#### Issue 10: Product has no durable server-side data model

Severity: High
Location: repository-wide
Problem: Trading history, signal history, paper trading, preferences, and audit trails are not persisted server-side.
Impact: Data is browser-local, non-portable, easy to lose, and unsuitable for compliance, analytics, or multi-device users.
Recommendation: Add a database for user profile, generated signals, paper trades, executed order intents, order results, provider settings metadata, and audit events.
Estimated Effort: Large
Priority: P1

#### Issue 11: In-memory caches are instance-local and not production scalable

Severity: Medium
Location: `src/app/api/signals/route.ts:36`, `src/app/api/screener/route.ts:46`, `src/app/api/correlation/route.ts:43`
Problem: Route-level cache variables reset on deployment/cold starts and do not share state across serverless instances.
Impact: Users can see inconsistent data and upstream rate protection is unreliable under scale.
Recommendation: Use a shared cache such as Redis/Vercel KV with explicit cache keys and TTLs.
Estimated Effort: Medium
Priority: P2

Database design score is low because there is no database layer to audit, not because a bad schema exists.

## Phase 4 - Security Audit

### Security Risk Assessment

#### Issue 12: API key is accepted through a GET query string

Severity: Critical
Location: `src/app/api/status/route.ts:20`
Problem: `/api/status` reads `apiKey` from query params.
Impact: API keys can leak through browser history, logs, analytics, reverse proxies, and referrers.
Recommendation: Do not accept secrets in query params. Use POST body for transient provider checks, or keep AI key use fully client-side for user-owned keys.
Estimated Effort: Small
Priority: P0

#### Issue 13: User-controlled AI provider base URL enables SSRF-style outbound requests

Severity: High
Location: `src/app/api/signals/analyze/route.ts:183`, `src/lib/deepseek.ts:36`
Problem: The API accepts `body.provider` and uses it as `baseUrl` for a server-side fetch to `${baseUrl}/chat/completions`.
Impact: A malicious user can potentially make the server issue requests to arbitrary hosts, including internal metadata or private network targets depending on hosting environment.
Recommendation: Accept provider IDs only. Map IDs to allowlisted base URLs from `src/lib/ai-providers.ts`; reject arbitrary URLs.
Estimated Effort: Medium
Priority: P0

#### Issue 14: User AI keys are stored in localStorage

Severity: High
Location: `src/lib/hooks/useAIConfig.ts`, `src/components/SettingsPage.tsx:147`
Problem: API keys are persisted in browser `localStorage`.
Impact: Any future XSS or malicious browser extension can read the key. This is especially risky because the key is later sent to app API routes.
Recommendation: Prefer session-only memory, encrypted server-side storage tied to authentication, or provider-side OAuth/token exchange. At minimum, warn users and offer a "session only" mode.
Estimated Effort: Medium
Priority: P1

#### Issue 15: Server-side trading endpoints rely on an app-level SoDEX API key with no user authorization

Severity: Critical
Location: `src/app/api/orders/route.ts:8`, `src/lib/sodex.ts:32`, `src/app/api/orders/[id]/route.ts:11`
Problem: Any caller who can reach these routes can place, list, or cancel orders using the configured server key. There is no authentication, wallet signature, session, ownership, role, or CSRF protection.
Impact: Public deployment can expose real trading operations to unauthorized users.
Recommendation: Disable live order routes until protected. Require wallet signature authentication, per-user scoped credentials, ownership checks, and strict CSRF/rate limiting. Never expose app-wide trading credentials to public routes.
Estimated Effort: Large
Priority: P0

#### Issue 16: No rate limiting or abuse protection

Severity: High
Location: `src/app/api/**/route.ts`
Problem: AI generation, market aggregation, backtesting, and trading endpoints have no per-IP, per-wallet, or per-user rate limits.
Impact: Upstream API quotas and AI spend can be exhausted. Trading endpoints are vulnerable to repeated submissions.
Recommendation: Add middleware or route-level rate limiting backed by Redis/Vercel KV. Add idempotency keys for order placement.
Estimated Effort: Medium
Priority: P0

#### Issue 17: Error messages may leak upstream details

Severity: Medium
Location: `src/lib/deepseek.ts:89`, `src/lib/sodex.ts:25`, route catch blocks returning `err.message`
Problem: Upstream response text is thrown and often returned to clients.
Impact: Internal provider details, request identifiers, or sensitive upstream text can leak.
Recommendation: Log full errors server-side with redaction; return normalized public error codes/messages.
Estimated Effort: Medium
Priority: P1

Authentication status:

- JWT expiration: not implemented.
- Refresh token flow: not implemented.
- Session management: wallet connection exists, but no server session.
- Password handling: not applicable.
- Authorization/ownership checks: not implemented for server APIs.

## Phase 5 - Business Logic Audit

### Major Flows

Signal generation:

User selects pair
↓
Dashboard context calls `generate`
↓
POST `/api/signals/analyze`
↓
Gather SoDEX/SoSoValue data
↓
Generate base signal
↓
Optionally call AI provider
↓
Return signal and thesis
↓
Client may record/execute

Live signal feed:

Dashboard loads
↓
`useSignals()` polls every 60s
↓
GET `/api/signals`
↓
Fetch external data and klines
↓
Generate V2 signals and multi-timeframe confluence
↓
Cache result for 5 minutes

Order execution:

User clicks execute
↓
Trade form submits order
↓
POST `/api/orders`
↓
Route sends payload to SoDEX with server API key
↓
Refresh orders

Paper trading:

User opens paper trade
↓
Trade stored in `localStorage`
↓
Ticker updates recalculate TP/SL/liquidation
↓
Stats displayed from local state

### Findings

#### Issue 18: Live order execution flow lacks idempotency and double-submit protection

Severity: Critical
Location: `src/app/api/orders/route.ts:21`
Problem: The server places the order immediately and does not require a client-generated idempotency key or server-side dedupe.
Impact: Double clicks, retries, or network replay can create duplicate orders.
Recommendation: Require `clientOrderId` and store it server-side with status transitions before calling SoDEX.
Estimated Effort: Large
Priority: P0

#### Issue 19: Signal history and performance metrics are local-only and can be manipulated

Severity: Medium
Location: `src/lib/hooks/useSignalHistory.ts:20`, `src/components/SignalHistoryPage.tsx`
Problem: Signal outcomes and historical performance are browser-local.
Impact: Reported win rate, calibration, and equity curve are not authoritative.
Recommendation: Persist generated signals and resolution events server-side with immutable timestamps and source snapshots.
Estimated Effort: Large
Priority: P1

#### Issue 20: AI response validation checks presence but not shape or bounds

Severity: Medium
Location: `src/app/api/signals/analyze/route.ts:197`
Problem: Parsed AI JSON only checks a few fields exist. It does not validate score ranges, action enum, nested execution schema, or string lengths.
Impact: Bad model output can corrupt UI assumptions or produce unsafe trade plan text.
Recommendation: Validate model output with a strict schema and clamp/ignore out-of-range values.
Estimated Effort: Medium
Priority: P1

#### Issue 21: Trading calculations include simplified liquidation and PnL formulas

Severity: Medium
Location: `src/lib/hooks/usePaperTrading.ts:119`
Problem: Liquidation and PnL logic are explicitly simplified.
Impact: Users may infer production risk behavior from paper trading metrics that do not match exchange mechanics.
Recommendation: Label paper trading clearly as simulation, or use SoDEX/exchange-specific formulas with fees, funding, slippage, maintenance margin, and partial fills.
Estimated Effort: Medium
Priority: P2

## Phase 6 - Frontend Architecture Audit

### Frontend Health Report

Architecture Score: 5/10

Strengths:

- Clear App Router route organization.
- Shared UI folder exists.
- TanStack Query provider is already installed globally.
- Build and TypeScript pass.

Weaknesses:

- Remote data is mostly managed by custom `useEffect` + `useState` hooks instead of TanStack Query.
- `DashboardProvider` centralizes too much unrelated state.
- Multiple large components mix data derivation, layout, formatting, and interactions.
- LocalStorage is used as a persistence layer for critical user-facing state.

#### Issue 22: TanStack Query is installed but underused

Severity: Medium
Location: `src/app/providers.tsx:7`, `src/lib/hooks/useMarket.ts:22`, `src/lib/hooks/useSignals.ts:16`
Problem: The app creates a `QueryClient`, but key hooks use manual effects, intervals, loading, and error state.
Impact: Duplicate fetching logic, less consistent caching/retry behavior, and harder request dedupe.
Recommendation: Migrate remote hooks to `useQuery` with typed query keys and stale times.
Estimated Effort: Medium
Priority: P2

#### Issue 23: Dashboard layout mounts the full global provider for all dashboard routes

Severity: Medium
Location: `src/app/(dashboard)/layout.tsx:51`
Problem: All dashboard routes receive the full `DashboardProvider`, including routes that may not need orders, signal generation, wallet, history, and market data.
Impact: Unnecessary fetching and re-rendering across settings/docs/history pages.
Recommendation: Move heavy providers down to pages that need them or split provider composition by route group.
Estimated Effort: Medium
Priority: P2

## Phase 7 - UI Consistency Audit

### Design Consistency Report

The app has a recognizable terminal/command-center visual language and shared primitives like `Card`, `Badge`, and `SpeedometerGauge`. The biggest consistency risk is that many visual patterns are implemented locally in large feature components rather than as centralized primitives.

#### Issue 24: Design tokens and component variants are inconsistently centralized

Severity: Medium
Location: `src/components/ui/Card.tsx`, `src/components/dashboard/command-center/SignalFlowCommandCenter.tsx`, `src/app/globals.css`
Problem: Shared primitives exist, but command-center panels and control styles are redefined locally across the large dashboard file.
Impact: Future UI changes will drift across screens.
Recommendation: Promote recurring panel headers, metric cells, icon controls, status lamps, and section grids into `src/components/ui` or `src/components/dashboard/shared`.
Estimated Effort: Medium
Priority: P2

#### Issue 25: Raw `<img>` is used where Next image optimization is expected

Severity: Low
Location: `src/components/MarketTickerTape.tsx:41`, `src/components/layout/WelcomeExperience.tsx:55`
Problem: Lint warns that raw image tags may hurt LCP and bandwidth.
Impact: Lower Lighthouse performance score on image-heavy views.
Recommendation: Use `next/image` for static bitmap assets where compatible.
Estimated Effort: Small
Priority: P3

## Phase 8 - UX Audit

### UX Findings

#### Issue 26: New-user comprehension depends on dense dashboard context

Severity: Medium
Location: `/dashboard`, `src/components/dashboard/command-center/SignalFlowCommandCenter.tsx`
Problem: The dashboard presents many institutional trading concepts at once: data pipeline, final score, signal evidence, market breadth, treasury, macro, chart, and execution readiness.
Impact: A new user may not understand the primary action within 5 seconds without prior context.
Recommendation: Keep the first viewport centered on the final decision, selected pair, confidence, and one primary "Generate Signal" action. Move secondary evidence behind tabs or progressive disclosure.
Estimated Effort: Medium
Priority: P2

#### Issue 27: Empty/loading/error states are inconsistent

Severity: Medium
Location: `src/lib/hooks/useMarket.ts:31`, `src/lib/hooks/useSignals.ts:25`, route consumers across dashboard pages
Problem: Hooks expose different error/loading shapes, and route responses return different data envelopes.
Impact: Screens can degrade inconsistently when SoDEX/SoSoValue/AI providers fail.
Recommendation: Standardize data state components and API error shape, then make every panel render explicit loading, empty, degraded, and failed states.
Estimated Effort: Medium
Priority: P2

#### Issue 28: Real trading and paper/simulated trading boundaries need stronger UX separation

Severity: High
Location: `src/lib/hooks/usePaperTrading.ts`, `src/app/api/orders/route.ts`, trading UI
Problem: The product includes both simulated paper trading and real server-side order routes.
Impact: Users may misunderstand when an action can place a live order.
Recommendation: Add explicit environment badges, confirmation copy, testnet/mainnet warnings, and disable live order routes unless authenticated and intentionally enabled.
Estimated Effort: Medium
Priority: P1

## Phase 9 - Performance Audit

### Performance Report

#### Issue 29: Large client components inflate JS and hydration work

Severity: Medium
Location: `SignalFlowCommandCenter.tsx`, `DocsPage.tsx`, `TradingChart.tsx`
Problem: Several large files are client components and include heavy UI logic.
Impact: Slower hydration, harder code splitting, and increased memory use.
Recommendation: Split by route/section and convert static content to server components or MDX where possible.
Estimated Effort: Large
Priority: P2

#### Issue 30: `/api/signals` performs many upstream calls in one request

Severity: Medium
Location: `src/app/api/signals/route.ts:64`
Problem: The route fetches currencies, ETF summary, macro events, treasuries, news, purchase history, index snapshots, market snapshots, and multiple kline batches.
Impact: High latency and upstream failure probability. The 5-minute in-memory cache helps but does not scale across instances.
Recommendation: Split data collection into cached modules and compute signals from normalized cached snapshots.
Estimated Effort: Large
Priority: P2

#### Issue 31: Client polling and dashboard provider can create unnecessary backend load

Severity: Medium
Location: `src/lib/hooks/useSignals.ts:32`, `src/app/(dashboard)/layout.tsx:51`
Problem: Signal polling runs every 60 seconds and the provider is mounted across the dashboard route group.
Impact: Users on non-signal pages can still participate in data-refresh load depending on mounted consumers/provider behavior.
Recommendation: Use route-scoped data hooks, visibility-aware polling, and TanStack Query stale/refetch controls.
Estimated Effort: Medium
Priority: P2

Lighthouse/Core Web Vitals:

- Not run in this audit because no browser-based Lighthouse script is configured.
- Build succeeded, but no performance budget or bundle analyzer is configured.

## Phase 10 - Production Readiness Audit

### Production Readiness Score

Fail.

Known positives:

- Vercel deployment is documented in `CLAUDE.md`.
- `pnpm build` succeeds.
- Cache stale-data cleanup exists through disabled service worker and client cleanup.

Blocking gaps:

- No auth/session layer.
- No route-level authorization for trading endpoints.
- No rate limiting.
- No request/response schema standard.
- No durable database/audit trail.
- No Sentry/BetterStack/Logtail or equivalent monitoring integration found.
- No backup/restore process because no database exists.
- No CI workflow files found in the inspected tree.
- No rollback runbook found.
- Secrets management is implied through environment variables but not documented as a production control.

#### Issue 32: No production observability

Severity: High
Location: repository-wide
Problem: No Sentry, structured logging, alerting, or error tracking integration is present.
Impact: Production failures in trading, AI, or upstream data will be hard to detect and diagnose.
Recommendation: Add Sentry or equivalent, structured server logs with request IDs, and alerts for route error rates and upstream latency.
Estimated Effort: Medium
Priority: P1

#### Issue 33: No CI quality gate found

Severity: Medium
Location: repository root
Problem: No `.github/workflows` or equivalent CI config was found in the tree.
Impact: Build/lint can regress before deployment.
Recommendation: Add CI for install, lint, typecheck/build, and eventually route/unit tests.
Estimated Effort: Small
Priority: P1

#### Issue 34: No automated test suite configured

Severity: High
Location: `package.json`
Problem: There is no `test` script and no visible test framework dependency.
Impact: Signal-engine, trading, and API behavior cannot be regression-tested automatically.
Recommendation: Add unit tests for strategy modules and API validation. Add integration tests for API routes with mocked upstream providers.
Estimated Effort: Large
Priority: P1

## Recommended Remediation Roadmap

### P0 - Before Any Real Trading Exposure

1. Disable or protect `/api/orders` and `/api/orders/[id]`.
2. Remove `apiKey` from `/api/status` query params.
3. Replace arbitrary AI provider URL input with allowlisted provider IDs.
4. Add strict validation for order placement and signal generation payloads.
5. Add rate limiting and idempotency keys for write endpoints.

### P1 - Production Hardening

1. Introduce standard API response helpers.
2. Add auth/session or wallet-signature verification for server-side actions.
3. Add observability and structured error handling.
4. Add tests for signal engine, order validation, AI output parsing, and route behavior.
5. Persist audit-critical data server-side.

### P2 - Scalability and Maintainability

1. Split oversized dashboard and strategy modules.
2. Move remote fetching hooks to TanStack Query.
3. Replace in-memory route caches with shared cache storage.
4. Add bundle analyzer and Lighthouse budgets.
5. Extract reusable dashboard UI primitives.

### P3 - Cleanup

1. Remove lint warnings.
2. Replace raw `<img>` where Next image optimization is useful.
3. Move large docs content out of hydrated client JSX.

## Bottom Line

The current application is a strong interactive demo and a functional signal dashboard prototype. It should not be treated as production ready for live trading until authentication, authorization, validation, SSRF protection, rate limiting, idempotency, durable audit storage, and observability are implemented.

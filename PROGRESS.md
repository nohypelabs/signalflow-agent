# Progress Log

## 2026-06-02 — Dashboard Polish & UX Overhaul

### Summary
Major UI/UX polish session covering Command Center, Market Screener, Performance page, and various bug fixes. **29 commits**, touching signal generation flow, page layouts, component restructure, and design system consistency.

---

### Command Center — Live Decision Score
| Commit | Change |
|--------|--------|
| `849dd40` | Remove lamp indicators (red/yellow/green dots) from live decision score |
| `cf7a865` | Increase chart, decision score, and catalyst monitor height by 10% (544px → 598px) |
| `6a52525` | Fix tooltip clipping on execute button — added `relative z-10` and `overflow-visible` |
| `364214e` | Center execute buttons (generate signal + execute trade) and add labels below each |
| `cd59e7d` | Move buttons down 10%, rename "Execute Trade" → "Execute Setup", shrink tooltips 20% |
| `d7e6480` | Reduce tooltip size by another 20% (w-52 → w-40) |
| `2ddcda1` | Increase tooltip size by 10% (w-40 → w-44) — sweet spot |

### Signal Generation Flow — Timeout Fixes
| Commit | Change |
|--------|--------|
| `375e1bb` | **Critical fix:** Add timeout guards to signal generation pipeline |

**Before:**
- Client fetch: no timeout (hang forever)
- Server data gathering: no timeout (7 parallel API calls could hang)
- Vercel function: default 10s (Hobby plan)

**After:**
- Client fetch: 90s AbortController timeout
- Server `gatherMarketData()`: 15s `withTimeout` wrapper for all external APIs
- Vercel: `maxDuration = 60` export for Pro plan alignment

---

### Market Screener — Full Redesign
| Commit | Change |
|--------|--------|
| `39d38c7` | Polish screener UI: replace emoji (📊→BarChart3, 🔗→Grid3x3), add PageHeader, use design tokens |
| `a4d5a90` | Replace correlation matrix with marketcap-sized price heatmap (treemap layout) |
| `79aa94a` | Fix heatmap not showing — SoDEX API returns `marketcap: 0` for most pairs, added volume fallback |
| `568fec0` | Switch to 2-column layout (heatmap + screener table) |
| `44cae75` | Revert to correlation matrix (user preference) with 2-column layout |
| `1c38675` | Increase correlation matrix text size (+20%) and contrast (faint → secondary) |
| `3251993` | Add stat header: 24H Volume, Top Gainer/Loser, Avg Change, Active Pairs |
| `1ed7212` | Increase stat header height to match signal-history page |
| `22176a3` | Merge signal history into tabbed Market Overview (Screener + Signal History tabs) |
| `c28eafd` | **Final layout:** 3-panel grid — Signal History (25%) + Pair Screener (25%) + Correlation Matrix (50%) |
| `5649bf5` | Rebalance grid widths |
| `0f0ba7a` | Equalize all three panel widths (1/3 each) |
| `27d6d66` | Final grid: `[1fr_1fr_2fr]` — Signal + Pair (25% each) + Correlation (50%) |
| `7894740` | Reorder: Signal → Pair → Correlation Matrix |
| `112a5d9` | Rename sidebar "Screener" → "Market Overview" |

**New components:**
- `PriceHeatmap.tsx` — treemap with marketcap-based sizing, volume fallback
- `SignalHistoryPanel.tsx` — compact 300px signal list with stats + filters
- `MarketOverviewPage.tsx` — tabbed wrapper (later removed, kept for reference)

---

### Performance Page — Restructure
| Commit | Change |
|--------|--------|
| `7499af9` | **Major restructure** for better UX and scannability |

**Before (too much scrolling):**
```
Hero stats → 30D chart → Coin table → 6 stat cards → 3 streak cards
→ Equity curve → 4 drawdown cards → Calibration → Per-Coin
→ Signals table → Live dimensions → Backtest Panel (CTA buried!)
```

**After (compact, scannable):**
```
Hero (4 key metrics) → Backtest CTA (top!) → Equity + Streak/Drawdown (2-col)
→ 30D Returns + Coin table → Collapsible details
```

**Key improvements:**
- Backtest CTA moved to top (was buried 600+ px below)
- 13 scattered stat cards → compact side-by-side panels
- Calibration, Per-Coin, Live Dimensions → collapsible (default closed)
- Recent Signals → collapsible (default open)
- Resolution window selector moved above collapsible sections

---

### Strategy Config
| Commit | Change |
|--------|--------|
| `465f076` | Move strategy preset modal 40% higher (`items-center` → `items-start pt-[12vh]`) |

---

### Sidebar Changes
- Removed "Signal History" link (merged into Market Overview)
- Renamed "Screener" → "Market Overview" pointing to `/screener`
- `/signal-history` route redirects to `/screener`

---

### Files Changed (Summary)
| File | Action |
|------|--------|
| `SignalFlowCommandCenter.tsx` | Modified — lamp removal, height increase, tooltip fixes, button layout |
| `src/lib/api/signals.ts` | Modified — added 90s client timeout |
| `src/app/api/signals/analyze/route.ts` | Modified — added 15s data gathering timeout + maxDuration |
| `ScreenerTable.tsx` | Modified — simplified to 3-column layout, design tokens |
| `CorrelationMatrix.tsx` | Modified — Lucide icons, design tokens, text size/contrast |
| `PriceHeatmap.tsx` | Created → later replaced by CorrelationMatrix |
| `SignalHistoryPanel.tsx` | Created — compact signal list for 3-panel layout |
| `MarketOverviewPage.tsx` | Created — tabbed wrapper |
| `screener/page.tsx` | Modified — 3-panel layout with stats |
| `signal-history/page.tsx` | Modified — redirect to /screener |
| `PerformancePage.tsx` | Modified — major restructure |
| `StrategyConfig.tsx` | Modified — modal position |
| `Sidebar.tsx` | Modified — link rename |

---

## 2026-06-03 — Buildathon Push: 3 Features + Polish

### Summary
Implemented 3 features requested by SoSoValue team (Nuffman's Akindo feedback: 8.5/10), plus mobile responsiveness fixes, page width standardization, and paper trading improvements. **12 commits**.

### Context
SoSoValue team member Nuffman rated the project 8.5/10 on Akindo.io, praising the Command Center layout. Three "biggest opportunity" areas were identified:
1. Alerting system
2. Trade journaling
3. Advanced portfolio analytics

All three were implemented within the same day.

---

### Feature 1: Alerting System
| File | Action |
|------|--------|
| `src/lib/types/alert.ts` | Created — Alert types (PriceAlert, SignalAlert) |
| `src/lib/hooks/useAlerts.ts` | Created — localStorage CRUD, price monitoring, browser Notification API |
| `src/components/ui/Toast.tsx` | Created — Sonner Toaster (dark fintech theme) |
| `src/components/AlertPanel.tsx` | Created — Alert list + create form |
| `src/components/AlertBell.tsx` | Created — Bell icon with unread badge |
| `src/app/(dashboard)/alerts/page.tsx` | Created — /alerts route |
| `src/components/ui/icons.tsx` | Modified — Added BellIcon, PlusIcon, TrashIcon |
| `src/components/TopBar.tsx` | Modified — Added AlertBell between wallet and settings |
| `src/components/layout/Sidebar.tsx` | Modified — Added "Alerts" nav under Trading |
| `src/app/layout.tsx` | Modified — Added `<Toast />` provider |

**Capabilities:**
- Price alerts (above/below) with live ticker monitoring
- Signal alerts (strong signal / reversal)
- Browser Notification API with permission request
- In-app toasts via sonner
- Unread badge on bell icon (last 1 hour)
- localStorage persistence (max 50 alerts)

---

### Feature 2: Trade Journaling
| File | Action |
|------|--------|
| `src/lib/types/journal.ts` | Created — Journal types, mood config, suggested tags |
| `src/lib/hooks/useJournal.ts` | Created — localStorage CRUD, search, filter by tag/mood/pair |
| `src/components/JournalEditor.tsx` | Created — Entry form with pair, side, prices, P&L, mood, tags, notes, lesson |
| `src/components/JournalEntryCard.tsx` | Created — Expandable entry card with delete confirmation |
| `src/components/JournalPage.tsx` | Created — Full journal page with stats bar, filters, search |
| `src/app/(dashboard)/journal/page.tsx` | Created — /journal route |
| `src/components/layout/Sidebar.tsx` | Modified — Added "Journal" nav |
| `src/components/TopBar.tsx` | Modified — Added Journal to navGroups |

**Capabilities:**
- Per-trade notes with mood tracking (Confident, Neutral, Anxious, FOMO, Revenge)
- Tag system with 15 suggested tags + custom tags
- Link to paper trades (auto-populate pair, side, prices, P&L)
- Lesson learned field
- Search across notes, tags, lessons
- Filter by tag, mood, pair
- Stats bar with mood distribution and top tags
- localStorage persistence (max 200 entries)

---

### Feature 3: Advanced Portfolio Analytics
| File | Action |
|------|--------|
| `src/lib/utils/analytics.ts` | Created — 12 pure analytics functions |
| `src/components/EquityCurve.tsx` | Created — SVG equity curve with benchmark overlay + hover tooltips |
| `src/components/DrawdownChart.tsx` | Created — SVG drawdown visualization |
| `src/components/RiskMetrics.tsx` | Created — Risk metrics grid (8 KPIs + streak + win rate bar + per-type/per-pair) |
| `src/components/AnalyticsDashboard.tsx` | Created — Main analytics page component |
| `src/app/(dashboard)/analytics/page.tsx` | Created — /analytics route |
| `src/components/layout/Sidebar.tsx` | Modified — Added "Analytics" nav |
| `src/components/TopBar.tsx` | Modified — Added Analytics to navGroups |

**Analytics functions:**
- `sharpeRatio()` — annualized risk-adjusted return
- `sortinoRatio()` — downside-only risk adjustment
- `calmarRatio()` — annualized return / max drawdown
- `maxDrawdown()` — peak-to-trough decline
- `expectancy()` — expected profit per trade
- `kelly()` — optimal bet fraction
- `profitFactor()` — gross profit / gross loss
- `winRateByType()` / `winRateByPair()` — breakdown by dimension
- `consecutiveWinsLosses()` — streak tracking
- `equityCurve()` / `drawdownSeries()` — time series for charting

**UI:**
- 4 KPI cards (Sharpe, Sortino, Max Drawdown, Calmar)
- Equity curve with BTC benchmark overlay (normalized)
- Drawdown chart (inverted area)
- Win rate bar + streak display
- Per-type performance grid
- Per-pair performance grid

---

### Mobile Responsiveness Fixes
| File | Change |
|------|--------|
| `TopBar.tsx` | Hide "SignalFlow" text on mobile, smaller logo (28px), hide divider, tighter gaps |
| `WalletButton.tsx` | "Connect" instead of "Connect Wallet" on mobile, hide address when connected |

---

### Page Width Standardization
All constrained pages now use `max-w-6xl` (1152px):

| Page | Before | After |
|------|--------|-------|
| Portfolio | full | max-w-6xl |
| Performance | full | max-w-6xl |
| Signals | full | max-w-6xl |
| Analytics | max-w-4xl | max-w-6xl |
| Journal | max-w-3xl | max-w-6xl |
| Alerts | max-w-3xl | max-w-6xl |
| Strategy Config | max-w-5xl | max-w-6xl |
| Settings | max-w-5xl | max-w-6xl |

Full-width kept: Dashboard, Trading, Screener (need space for charts/grids).

---

### Paper Trading Improvements
| File | Change |
|------|--------|
| `TradeForm.tsx` | Added Live/Paper mode switcher, paper balance display, paper trade execution |
| `AppShell.tsx` | Pass paper trading props to TradeForm |
| `layout.tsx` | Wire usePaperTrading into trade form |
| `TradingPageContent.tsx` | Fix PnL: use signal price as fallback, reject when no price, move modal slightly above center |

**Execute Setup modal:**
- Mode switcher: Paper Trade (green) / Live Trade (red)
- Both modes require wallet connection
- Paper mode: shows paper balance, opens paper trade
- Live mode: shows wallet balance, signs & submits to SoDEX
- Default: Paper mode (safer)
- Modal positioned at 15vh from top (slightly above center)

**PnL fix:**
- Entry price now falls back to signal price when ticker unavailable
- Reject trade with error notice when price data completely missing
- Prevents creating trades with $0 entry price (which caused $0 PnL)

---

### Git Commits (2026-06-03)
| Hash | Message |
|------|---------|
| `d844750` | Remove .hermes/plans from tracking, add to .gitignore |
| `b0a5edf` | Add alerting system — price alerts, signal alerts, browser notifications |
| `656ee60` | Add trade journaling — notes, tags, mood tracking, search/filter |
| `4196536` | Add advanced portfolio analytics — Sharpe, Sortino, drawdown, equity curve |
| `92b52ff` | Replace all emoji with proper SVG icons and text labels |
| `5a83b85` | Improve mood UX: full text labels with colored dots, narrower P&L field |
| `61cdca6` | Fix mobile header overflow — compact wallet button, hide brand text |
| `6191b52` | Constrain page widths for portfolio, performance, and signals pages |
| `dbddcfe` | Standardize page widths to max-w-6xl for all constrained pages |
| `b226984` | Add paper trading support to Execute Setup button |
| `9744987` | Add Live/Paper mode switcher to Execute Setup form |
| `e996e79` | Move paper trade confirmation modal slightly above center |
| `125cd42` | Fix paper trade PnL: use signal price as fallback, reject when no price |

---

### Dependencies Added
| Package | Purpose |
|---------|---------|
| `sonner` | Toast notification library (lightweight, dark theme, Tailwind-compatible) |

---

### Sidebar Final State
```
Overview
├── Dashboard
├── Signals
├── Market Overview
└── Performance

Trading
├── Trading
├── Portfolio
├── Analytics        ← NEW
├── Alerts           ← NEW
├── Journal          ← NEW
├── Trade History
└── Strategy Config

System
├── Settings
└── Docs
```

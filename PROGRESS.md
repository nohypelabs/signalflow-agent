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

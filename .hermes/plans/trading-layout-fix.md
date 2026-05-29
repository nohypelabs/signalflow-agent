You are a precise UI implementation engineer. Your ONLY job is to modify the /trading page layout of the SignalFlow Agent project to match the reference layout from trade.xyz (Hyperliquid-style perpetual DEX).

You do NOT invent features. You do NOT redesign. You do NOT add navigation. You replicate the EXACT column structure and component placement from the reference.

═══════════════════════════════════════════════════════
CONTEXT
═══════════════════════════════════════════════════════

Project: /DataPopOS/projects/signalflow-agent/dashboard
Framework: Next.js 16 + React 19 + Tailwind v4 + TypeScript
File to modify: src/components/TradingPageContent.tsx
Related components: src/components/TradingChart.tsx, src/components/OrderbookDepth.tsx, src/components/OrderForm.tsx, src/components/RecentTrades.tsx

Existing design system (DO NOT CHANGE):
- Background: #05070D (--bg-base)
- Card: #0B1020 (--bg-card)
- Elevated: #111827 (--bg-elevated)
- Inset: #080B14 (--bg-inset)
- Border: #1E293B (--border-default)
- Accent: #00E5A8 (--accent-primary)
- Buy: #00ff88
- Sell: #ff4444
- Text primary: #F8FAFC
- Text secondary: #CBD5E1
- Text dim: #475569

═══════════════════════════════════════════════════════
WHAT TO KEEP (DO NOT MODIFY)
═══════════════════════════════════════════════════════

1. The main market header bar (pair selector pills, price display, 24h stats, mode toggle, wallet) — KEEP AS IS
2. All business logic (handlers, state, hooks, modals, paper trading, live trading) — KEEP AS IS
3. The AppShell fullScreen mode in layout.tsx — KEEP AS IS
4. All sub-components (TradingChart, OrderbookDepth, OrderForm, etc.) — KEEP their interfaces, only change how they're placed

═══════════════════════════════════════════════════════
WHAT TO CHANGE — LAYOUT ONLY
═══════════════════════════════════════════════════════

Below the main market header, restructure the layout into exactly this:

─────────────────────────────────────────────────────
[CHART HEADER] — spans ONLY the chart column width (~65%)
─────────────────────────────────────────────────────

This is a horizontal bar that sits directly above the chart, NOT full width.
Contains:
- Left: Timeframe buttons (1m, 3m, 5m, 15m, 1h, 4h, 1D, 1W) — active one highlighted
- Center: Chart type toggles (Candles | Line) + Volume toggle + Signals toggle + Trade Plan toggle
- Right: Data freshness indicator (live dot + "Updated Xs ago")

This chart header is rendered INSIDE the chart column, not above the 3-column grid.

─────────────────────────────────────────────────────
[THREE-COLUMN BODY] — fills remaining height below market header
─────────────────────────────────────────────────────

Use CSS Grid or flexbox with EXACT widths:
  Column A (Chart):    flex-[13]  (~65%)
  Column B (Orderbook): flex-[4]  (~20%)
  Column B (Order Form): flex-[3]  (~15%)

All three columns must be side by side with NO gaps between them.
Each column must fill 100% of the available height.
The border between columns is a single 1px line (--border-default).

COLUMN A — CHART (~65% width):
  ┌─────────────────────────────────┐
  │ [Chart Header: TF + toggles]    │  ← chart-scoped header
  ├─────────────────────────────────┤
  │                                 │
  │   TradingView Candlestick       │
  │   Chart (full remaining height) │
  │                                 │
  │   Volume bars at bottom         │
  │                                 │
  └─────────────────────────────────┘

  The TradingChart component already handles its own header internally
  (pair selector, timeframe, toggles, OHLCV tooltip). DO NOT duplicate
  the chart header in TradingPageContent. The chart component IS self-contained.

  So Column A is simply:
  <div className="flex-[13] min-w-0 flex flex-col">
    <ErrorBoundary name="Trading Chart">
      <TradingChart ... />
    </ErrorBoundary>
  </div>

  That's it. The chart handles its own toolbar/header internally.

COLUMN B — ORDER BOOK + TRADES (~20% width):
  ┌──────────────────────────┐
  │ [Order Book] [Trades]    │  ← tab switcher
  ├──────────────────────────┤
  │ Price  | Size  | Total   │  ← column headers
  ├──────────────────────────┤
  │ 68,450  | 0.50  | 34.2   │  ← asks (red, descending)
  │ 68,440  | 1.20  | 82.1   │
  │ ...10 rows minimum...    │
  ├──────────────────────────┤
  │ Spread: $10 (0.015%)     │  ← mid spread row
  ├──────────────────────────┤
  │ 68,430  | 0.80  | 54.7   │  ← bids (green, descending)
  │ 68,420  | 2.10  | 143.7  │
  │ ...10 rows minimum...    │
  └──────────────────────────┘

  When "Trades" tab is selected, show RecentTrades component instead.
  The OrderbookDepth component already handles its own rendering.
  Just place it inside this column with proper height.

COLUMN C — ORDER FORM (~15% width):
  ┌──────────────────────────┐
  │ [Long] [Short]           │  ← side toggle
  ├──────────────────────────┤
  │ [Market] [Limit]         │  ← order type tabs
  ├──────────────────────────┤
  │ Available: $10,000 USDC  │
  │ Current: 0 BTC           │
  ├──────────────────────────┤
  │ Amount: [________] [MAX] │
  │ [====slider====]         │  ← leverage
  ├──────────────────────────┤
  │ □ Reduce Only            │
  │ □ Take Profit / Stop Loss│
  ├──────────────────────────┤
  │ [═══ Long BTC 3x ═══]   │  ← CTA button
  ├──────────────────────────┤
  │ Liq Price:  $XX,XXX      │
  │ Order Value: $X,XXX      │
  │ Margin:      $XXX        │
  │ R:R:         X.XX:1      │
  └──────────────────────────┘

  The OrderForm component already handles its own rendering.
  Just place it inside this column with proper height.

─────────────────────────────────────────────────────
[BOTTOM PANEL] — fixed height, full width
─────────────────────────────────────────────────────

Keep the existing tabbed bottom panel (Open Orders | Recent Trades | Positions | Paper Stats).
Height: 200px. This is already implemented correctly.

═══════════════════════════════════════════════════════
IMPLEMENTATION INSTRUCTIONS
═══════════════════════════════════════════════════════

1. Read ALL existing files first before writing ANY code:
   - src/components/TradingPageContent.tsx (current layout)
   - src/components/TradingChart.tsx (component interface)
   - src/components/OrderbookDepth.tsx (component interface)
   - src/components/OrderForm.tsx (component interface)
   - src/app/(dashboard)/layout.tsx (AppShell integration)
   - src/components/layout/AppShell.tsx (fullScreen mode)

2. The main change is in TradingPageContent.tsx:
   - Keep the top market header EXACTLY as is
   - Below it, create a flex-1 min-h-0 row with 3 columns
   - Column A: flex-[13] → TradingChart (self-contained)
   - Column B: flex-[4] → OrderbookDepth with tab switcher
   - Column C: flex-[3] → OrderForm
   - Below that: h-[200px] bottom panel (already exists)

3. Add a tab switcher for Column B ("Order Book" | "Trades"):
   - Default: show OrderbookDepth
   - When "Trades": show RecentTrades
   - This is a NEW small piece of state: orderbookTab

4. DO NOT change any handler, state, hook, or business logic.
5. DO NOT add new routes, pages, or navigation.
6. DO NOT modify TradingChart.tsx, OrderbookDepth.tsx, or OrderForm.tsx.
7. After writing code, run: cd /DataPopOS/projects/signalflow-agent/dashboard && pnpm build
8. If build fails, fix the error and rebuild until clean.

═══════════════════════════════════════════════════════
FINAL CHECKLIST — VERIFY BEFORE SUBMITTING
═══════════════════════════════════════════════════════

□ No left sidebar or navigation added?
□ Market header is unchanged?
□ Three columns are side-by-side (not stacked)?
□ Chart fills Column A completely?
□ Orderbook shows in Column B with bid/ask rows?
□ Order form shows in Column C with Long/Short toggle?
□ Bottom panel has tabs (Orders/Trades/Positions/Stats)?
□ All business logic (paper trading, live trading, signals) preserved?
□ Build passes with zero errors?
□ No emoji icons — all SVG from ui/icons.tsx?

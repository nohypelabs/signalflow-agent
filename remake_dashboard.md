# SignalFlow Dashboard Remake Plan

Status: planning handoff
Target page: `/dashboard`
Core direction: turn the dashboard from separate trading widgets into a visible signal pipeline.

Visual reference from prior session:
`/home/dracarys/.codex/generated_images/019e73d8-13cd-7cb0-82cb-a1d9d5df4b7c`

## Product Intent

The dashboard should read as:

```txt
Market Data -> Signal Engine -> AI Thesis -> Trade Setup
```

Right now the dashboard is functionally solid, but the layout still reads like a standard crypto dashboard:

```txt
KPI cards
Chart + signal list
AI generator + reasoning
Data source cards
Macro/news widgets
```

The remake should make "SignalFlow" visible. Users should feel that live market data flows into confluence scoring, then into AI reasoning, then into an actionable trade decision.

## Current Important Files

- `src/app/(dashboard)/dashboard/page.tsx` - main dashboard composition.
- `src/components/KPICards.tsx` - current priority KPI area.
- `src/components/TradingChart.tsx` - main chart, already supports compact dashboard mode.
- `src/components/SignalList.tsx` - live signal feed.
- `src/components/AISignalGenerator.tsx` - generation controls and output.
- `src/components/AIReasoning.tsx` - explanation layer for selected/generated signal.
- `src/components/DataSources.tsx` - source health grid.
- `src/lib/hooks/useDashboardMetrics.ts` - KPI source data.
- `src/lib/dashboard-context.tsx` - central dashboard state and actions.

## Non-Negotiables

- Do not break wallet connection, SoDEX status, orders, or execution flow.
- Do not remove existing routes.
- Do not remove existing signal generation logic.
- Keep the current dark fintech visual system: near-black background, slate cards, thin borders, green/red/amber trading semantics.
- Keep dashboard dense and operational, not a marketing page.
- Prefer existing components and local patterns before adding new abstractions.
- Validate after each phase with `pnpm lint` and `pnpm build`.
- Commit after each completed phase.

## Target Wireframe

```txt
+------------------------------------------------------------------------------+
| SIGNALFLOW RAIL                                                              |
| SoDEX Data -> SoSoValue Data -> Confluence V2 -> AI Thesis -> Trade Setup    |
+------------------------------------------------------------------------------+

+----------------------------------------------+-------------------------------+
| LIVE MARKET CANVAS                            | CURRENT DECISION              |
| TradingChart                                  | Action / Confidence           |
| BTC/USDC, markers, TP/SL context              | Entry / TP / SL / Risk        |
|                                               | Execute / Pin / View Detail   |
+----------------------------------------------+-------------------------------+
| SIGNAL STREAM                                 | FLOW SUMMARY                  |
| compact live signal events                    | sources, latency, freshness   |
+----------------------------------------------+-------------------------------+

+------------------------------------------------------------------------------+
| EVIDENCE FLOW                                                                |
| ETF Flow | Macro | Sentiment | Treasury | Momentum -> Signal Engine          |
+------------------------------------------------------------------------------+

+------------------------------------------------------------------------------+
| EXPLAIN LAYER                                                                |
| AI thesis + dimension reasoning for the selected/current decision             |
+------------------------------------------------------------------------------+
```

## Phase 0 - Baseline Audit

Goal: capture current dashboard state before layout work.

Actions:
- Run `git status --short --branch`.
- Run `pnpm lint` and `pnpm build`.
- Inspect `src/app/(dashboard)/dashboard/page.tsx`.
- Inspect component props for `KPICards`, `TradingChart`, `SignalList`, `AISignalGenerator`, `AIReasoning`, and `DataSources`.
- If Docdex index looks stale, reindex before relying on search results.

Acceptance:
- Working tree state is known.
- Build/lint baseline is known.
- Agent knows which existing props can be reused.

Notes:
- Previous session had a clean lint/build after commit `dbfede3 Clean up lint warnings`.

## Phase 1 - SignalFlow Rail

Goal: make the brand/product concept visible in the first viewport.

Create or modify:
- New component candidate: `src/components/dashboard/SignalFlowRail.tsx`
- Use it from `src/app/(dashboard)/dashboard/page.tsx` above the main chart grid.

Rail nodes:
- SoDEX Data
- SoSoValue Data
- Confluence V2
- AI Thesis
- Trade Setup

Data mapping ideas:
- SoDEX Data: use `d.sodexStatus`, `d.tickers`, `d.tickerMap`.
- SoSoValue Data: use existing API/source status if available through `DataSources`; otherwise start with status text derived from available signal/source errors.
- Confluence V2: use `d.liveSignals`, `metrics.avgConfidence`, `metrics.activeSignals`.
- AI Thesis: use `d.includeAI`, `d.aiProviderLabel`, `d.aiConfig`, `d.analyzing`.
- Trade Setup: use `d.selectedSignal` or `d.displaySignal`.

Design:
- Horizontal rail on desktop.
- Compact stacked/scrollable rail on mobile.
- Thin connector line between nodes.
- Small status dot per node.
- Subtle pulse only for active/loading node. Avoid heavy animation.
- No gradient blobs, no oversized decorative shapes.

Acceptance:
- The top of `/dashboard` immediately reads like a pipeline.
- Rail fits without horizontal overflow on mobile.
- Existing KPI data remains available below or integrated later.

## Phase 2 - Reframe KPI Cards Into Flow Summary

Goal: KPIs should support the flow, not dominate it as generic metrics.

Modify:
- `src/components/KPICards.tsx`

Direction:
- Rename visual concept from generic KPI block to "Flow Summary" or "Signal Quality Summary".
- Keep the dominant Signal Quality card.
- Reduce secondary cards to compact cells:
  - Live Signals
  - Top 24H Gainer
  - Active Markets / 24H Volume
  - Data Freshness

Content hierarchy:
- Primary: signal quality/confidence.
- Secondary: active signals and market breadth.
- Tertiary: source/freshness labels.

Acceptance:
- KPI area feels connected to the SignalFlow Rail.
- No fake metrics or hardcoded market values.
- Loading/error/stale states still render cleanly.

## Phase 3 - Main Workbench Layout

Goal: replace the current generic rows with a trading workbench layout.

Modify:
- `src/app/(dashboard)/dashboard/page.tsx`

Target desktop grid:
- Left: large `TradingChart`, about 7-8 columns.
- Right: `CurrentDecisionPanel`, about 4-5 columns.
- Under chart or between columns: compact `SignalStream` if needed.

New component candidates:
- `src/components/dashboard/CurrentDecisionPanel.tsx`
- `src/components/dashboard/SignalStream.tsx`

Important:
- Reuse existing `SignalList` where possible before building a parallel feed.
- The selected/current signal should drive the decision panel.
- If no selected/generated signal exists, show "Waiting for qualified flow" with clear source status.

Acceptance:
- First viewport shows chart plus a decision output.
- User can understand what the system currently recommends without scrolling.
- Chart does not become a passive decoration.

## Phase 4 - Current Decision Panel

Goal: show the output of the flow as a trade-ready decision.

Create:
- `src/components/dashboard/CurrentDecisionPanel.tsx`

Inputs to consider:
- `signal`: selected signal or generated display signal.
- `tickerMap`: for current price context.
- `onExecuteSignal`: existing dashboard action.
- `onPinSignal`: if using generated AI signal.

Panel content:
- Action badge: LONG / SHORT / NO TRADE.
- Confidence gauge or compact score.
- Pair and current price.
- Entry, take profit, stop loss.
- Risk/reward if available.
- Short reason summary.
- Buttons:
  - Execute
  - View on Trading
  - Pin / Use Signal, only if applicable.

Design:
- This is the "output terminal" of SignalFlow.
- Use strong hierarchy, not many equal cards.
- Keep button states explicit for NO TRADE, missing wallet, missing price, or no signal.

Acceptance:
- A user can answer: "What should I do now?" from this panel.
- No duplicated execution logic. Use existing handlers.

## Phase 5 - Signal Stream

Goal: make signals feel like live events moving through the system.

Modify or wrap:
- `src/components/SignalList.tsx`
- Or create `src/components/dashboard/SignalStream.tsx` that composes `SignalList`.

Stream item content:
- Time
- Pair
- LONG / SHORT / NO TRADE
- Confidence
- Mini reason
- Status: generated, selected, trade-ready

Design:
- More like an event log than a bulky card list.
- Highlight selected item.
- Keep compact row density.
- Avoid repeating too much reasoning in every row; full reasoning belongs in the explain layer.

Acceptance:
- Signal updates feel chronological and operational.
- Selecting a stream item updates the decision/explain context.

## Phase 6 - Evidence Flow

Goal: show why the signal exists through source/dimension evidence.

Create or adapt:
- New component candidate: `src/components/dashboard/EvidenceFlow.tsx`
- Reuse parts of `AIReasoning`, `DataSources`, and existing dimension labels where practical.

Evidence nodes:
- ETF Flow
- Macro
- Sentiment
- Treasury
- Momentum

Each node should show:
- Score or state if available.
- Direction: bullish, bearish, neutral.
- Source/freshness if available.
- One-line explanation.

Layout:
- Desktop: horizontal band under workbench.
- Mobile: 2-column grid or stacked list.

Acceptance:
- User can see input evidence feeding the engine.
- It does not look like unrelated bottom widgets.

## Phase 7 - AI Thesis As Explain Layer

Goal: make AI reasoning feel like an explanation of the selected decision, not a separate generator island.

Modify:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/AISignalGenerator.tsx`
- `src/components/AIReasoning.tsx`

Direction:
- Keep generation controls, but visually attach them to the decision flow.
- `AISignalGenerator` can become a compact "Generate / Refresh Thesis" control.
- `AIReasoning` becomes the larger explain layer for selected/generated signal.

Acceptance:
- AI feels integrated into the pipeline.
- Technical signal still works when AI is disabled or API fails.
- Error states stay graceful.

## Phase 8 - Source Health Integration

Goal: make data health part of the pipeline instead of a separate afterthought.

Modify:
- `src/components/DataSources.tsx`
- Or create a compact mode: `DataSources compact`

Direction:
- Full DataSources card can stay lower on the page.
- Add a compact "Source Health" summary near the rail/workbench.
- Show live/degraded/offline/cached, last update, and source count.

Acceptance:
- Users understand whether signals are live, stale, or degraded.
- Existing source detail remains accessible.

## Phase 9 - Responsive Pass

Goal: ensure the new dashboard is usable on desktop, tablet, and mobile.

Desktop:
- Rail top.
- Chart left, decision right.
- Evidence flow below.
- Explain layer below evidence or beside it if width allows.

Tablet:
- Rail wraps or becomes horizontal scroll.
- Chart full width.
- Decision and stream in 2-column layout.

Mobile:
- Rail becomes compact stacked flow.
- Decision panel comes before chart if current action is the priority.
- Chart full width.
- Signal stream and evidence below.

Acceptance:
- No horizontal overflow.
- Text does not overlap inside buttons/cards.
- Chart and panels have stable heights.

## Phase 10 - Visual Polish

Goal: make the final page feel premium and specific to SignalFlow.

Polish checklist:
- Use consistent labels: SignalFlow Rail, Current Decision, Evidence Flow, Signal Stream.
- Avoid generic labels like "Latest Signals" when a stronger product term fits.
- Keep border radius at 8px or less.
- Use subtle borders and restrained backgrounds.
- Use green/red/amber only for trading semantics.
- Avoid purple-heavy or one-note palette.
- Keep font sizes compact inside cards and panels.
- Use icons only where they aid scanning.

Acceptance:
- First screenshot communicates SignalFlow within 3 seconds.
- The page feels like a signal-to-execution cockpit, not a template.

## Suggested Implementation Order

1. Add `SignalFlowRail`.
2. Add `CurrentDecisionPanel`.
3. Recompose `dashboard/page.tsx` into workbench layout.
4. Wrap/refine `SignalList` into `SignalStream`.
5. Add `EvidenceFlow`.
6. Integrate AI generator/reasoning into the flow.
7. Compact source health.
8. Responsive and polish pass.

## Validation Commands

Run after each phase:

```bash
pnpm lint
pnpm build
git diff --check
```

If available:

```bash
docdexd hook pre-commit --repo /DataPopOS/projects/signalflow-agent/dashboard
```

Known caveat:
- In one prior shell session, `docdexd` was not available on PATH even though Docdex MCP tools worked.

## Commit Strategy

Commit every phase separately so the next session can resume safely:

```txt
Add SignalFlow rail to dashboard
Add current decision panel
Recompose dashboard workbench layout
Add evidence flow band
Integrate AI thesis into dashboard flow
Polish responsive SignalFlow dashboard
```

## Definition Of Done

The remake is done when:

- `/dashboard` first viewport clearly shows data flowing into a trade decision.
- A new user can see the pipeline: data sources, confluence engine, AI thesis, trade setup.
- The chart, signal stream, decision panel, and evidence layer are visually connected.
- Existing trading, wallet, API, and signal generation behavior remains intact.
- `pnpm lint` and `pnpm build` pass.

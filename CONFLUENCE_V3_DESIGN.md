# Confluence V3 Design Document

**Project:** SignalFlow Agent Dashboard  
**Date:** April 2026 (Buildathon final sprint)  
**Status:** Draft — Ready for implementation  
**Author:** Grok (based on user direction)  
**Time Constraint:** ~2 days until judgment

---

## 1. Problem Statement

We currently maintain **two separate signal engines**:

- **Confluence V2** (`confluence`): 5-factor TA (Trend/Momentum/Volatility/Volume/Structure) + regime detection + multi-TF + lessons + rich reasoning. Strong on paper and data, but:
  - Too many layers → signals often arrive late ("keburu market terbang").
  - Heavy policy layer (`applyConfluenceStrategyPolicy`) frequently overrides good TA signals into HOLD due to weak external dimension blending + `minConfidence` gate.
  - Purely lagging (closed-bar TA on primary TF).
  - Multi-TF is mostly cosmetic (direction agreement only).

- **Liquidity Flow** (`liquidityFlow`): Direct microstructure (orderbook imbalance, trade flow delta, funding rate + Hyperliquid cross-venue). Faster and more "real", but:
  - Lacks depth in structured TA, regime awareness, and trading-type differentiation.
  - Still goes through similar final policy gates.
  - Less impressive "story" / reasoning for judges.

**Consequences:**
- Traders are confused by having to choose between two imperfect strategies.
- Both paths produce too many HOLDs or low-conviction signals in live conditions.
- The app feels like "two experiments" instead of one polished product.
- For the upcoming judgment/demo, presenting two strategies weakens the narrative.

**Goal of this doc:** Define a single unified strategy — **Confluence V3** — that meaningfully combines the best parts of both, removes the worst parts, and can be implemented with minimal UI disruption in the remaining time.

---

## 2. Goals (for Confluence V3)

- **One single production-grade signal engine** (no more "choose your fighter").
- **Real edge + depth**: Microstructure as the fast primary trigger + multi-factor TA + regime as confirmation and context.
- **Actionable signals**: Significantly reduce chronic HOLDs while maintaining reasonable quality (user can still tune via `minConfidence`).
- **Trading Type first-class**: Scalping / Intraday / Swing / Position still drive weights, preferred timeframes, TP/SL behavior, and risk.
- **Rich, auditable output**: Keep (and improve) factors, regime, setup/thesis/invalidation, quality, execution plan — excellent for judges and in-app display.
- **Meaningful Multi-TF**: Higher timeframes should actually influence conviction or bias, not just produce a pretty badge.
- **Minimal final gate**: Remove or heavily neuter the policy blending that was killing good signals. Keep only lightweight user-controlled controls.
- **Pragmatic for 2-day sprint**: Deliver a working unified engine that can be demoed. Polish and UI alignment can happen after judgment.

**Success Metrics (for judgment + immediate use):**
- More directional signals (LONG/SHORT/WEAK_*) coming out of the main `/api/signals` endpoint compared to current V2.
- Clear, professional reasoning strings.
- Trading type profiles visibly affect behavior.
- No more "policy blocked" on otherwise decent setups.
- One coherent story: "We learned from two approaches and built something better."

---

## 3. Non-Goals (this iteration)

- Major UI/UX overhaul (StrategySelectionModal, StrategySwitcher, full StrategyConfig pages can stay mostly as-is for now).
- Full walk-forward backtest integration for V3.
- AI enrichment (user previously removed it; can be re-added later as optional layer).
- Perfect multi-TF factor fusion (we can start with bias/conviction adjustment).
- Removing the old engines entirely yet (we can keep the code for now and route everything through V3).
- Changing the public Signal type shape dramatically (extend or use the existing rich `SignalV2` shape).

---

## 4. High-Level Architecture

### Core Philosophy
**"Microstructure leads, Confluence confirms, Trading Type adapts."**

Real-time order flow and liquidity provide the immediate edge. The 5-factor TA + regime layer adds structure, filters noise, and generates the beautiful thesis/reasoning that makes the product stand out. Trading types ensure the whole thing behaves differently for a scalper vs a position trader.

### Proposed Flow (Text Diagram)

```
External Data
├── SoDEX: Klines (multi-TF), Orderbook, Recent Trades
├── Perps/Funding (SoDEX + Hyperliquid)
└── SoSoValue (News, ETF, Macro, Treasury) — optional / de-emphasized

          │
          ▼
[1] Microstructure Primary Layer (Liquidity Flow DNA)
    - Orderbook imbalance (bid/ask pressure, levels)
    - Trade flow delta (recent buy vs sell volume pressure)
    - Funding rate analysis (local + cross-venue)
    - Basic liquidity gates (spread, depth)
    → Produces: baseDirection, flowScore, microstructureFactors

          │
          ▼
[2] TA Confluence Confirmation Layer (V2 DNA, lighter)
    - Select primary TF + supporting TFs based on TradingType
    - Compute 5 factors on primary (and optionally higher TF)
      • TREND (EMA stack + ADX)
      • MOMENTUM (RSI trend-aware + MACD + ROC)
      • VOLATILITY (BB position + ATR + squeeze)
      • VOLUME (ratio + OBV)
      • STRUCTURE (S/R + Fib)
    - Regime detection (TRENDING_UP/DOWN, RANGING, VOLATILE, BREAKOUT)
    - Apply TradingType weights (Thinking Framework)
    → Produces: taConfluence, regime, taFactors, setup

          │
          ▼
[3] Synthesis + Multi-TF Bias
    - Combine microstructure conviction + TA confluence
    - Apply higher-TF bias (e.g. if higher TF agrees → boost conviction; if disagrees → dampen or force weaker action)
    - Classify action (STRONG_LONG ... HOLD ... STRONG_SHORT)
    - Generate rich setup (thesis, invalidation, evidence)
    - Calculate ATR-aware TP/SL (regime + type aware)

          │
          ▼
[4] Lightweight Final Gate (User-controlled only)
    - Only `minConfidence` from StrategyConfig (no heavy external dimension blending)
    - Position sizing from config
    - Optional simple coverage guardrails
    → Final action + confidence + full reasoning

          │
          ▼
Output: Unified Signal (rich factors array, regime, multiTF context, execution, quality, sources)
```

### Key Differences from Current State

- **No more two code paths** in the main signals route for production. One engine.
- **Microstructure is leading** (not just "TA + some flow confirmation").
- **Policy layer is gutted** for this path: no more dragging by mediocre ETF/news/macro scores.
- **Multi-TF becomes active**: higher TF data can adjust conviction or block weak signals.
- **Trading Type profiles** remain the primary way users customize behavior.

---

## 5. Detailed Component Breakdown

### 5.1 Inputs
- Per trading type: primary interval + supporting intervals (we can reuse/improve the existing `PRIMARY_TF` + `CONFLUENCE_TF` maps).
- Klines (multiple TFs), orderbook snapshot, recent trades, funding data.
- Optional context: news, ETF, macro (can be used lightly for reasoning only, not as hard filters).

### 5.2 Factors (Merged)
We should produce a single `factors: ConfluenceFactor[]` that includes both worlds:

- Microstructure factors: `ORDER_FLOW`, `DEPTH`, `FUNDING`, `SPREAD`
- TA factors: `TREND`, `MOMENTUM`, `VOLATILITY`, `VOLUME`, `STRUCTURE`

This gives rich, visual breakdown in SignalCard / AnalysisDrawer without changing the UI much.

### 5.3 Regime & Setup
Keep the excellent regime detection and `classifyTradeSetup` / thesis generation from V2. These are strengths.

### 5.4 Multi-TF Handling (Improvement Area)
Current V2 only uses it for a post-hoc score. For V3 we want it to matter:

- Run core TA on primary TF.
- Sample key signals (trend direction, regime, major structure levels) from higher TF(s).
- Use agreement/disagreement to:
  - Boost or reduce final confidence.
  - Upgrade/downgrade action strength (e.g. WEAK_LONG → LONG only if higher TF agrees).
  - Influence regime (e.g. 1H volatile but 4H trending = treat as trending with caution).

### 5.5 Trading Type Profiles
Continue using the existing `TRADING_TYPES` + Thinking Framework weights. This is one of the most differentiated parts of the product.

### 5.6 Final Gate Philosophy
- **User owns the risk dial** via `minConfidence` + `maxPositionSize` in StrategyConfig.
- Remove (or make extremely light) the external dimension blending for the main V3 path.
- The engine should be opinionated enough to emit directional signals when the combined microstructure + TA evidence is present.

### 5.7 Output Shape
Reuse/extend the existing rich `Signal` / `SignalV2` shape. Add or unify:
- `factors` (merged list)
- `regime`
- `setup`
- `multiTF` (improved details)
- `execution`
- `quality`
- `reasoning` (clear, professional, with both microstructure and TA drivers)

---

## 6. Implementation Plan (2-Day Sprint)

### Day 1 (Core Unification)
- Create `src/lib/strategy/signal-engine-v3.ts` (or a new folder `signal-engine-v3/` if we want modularity).
- Implement the hybrid flow:
  - Fetch combined data (klines multi-TF + orderbook + trades + funding).
  - Microstructure scoring module (extract/refactor good parts from `order-flow-engine.ts` and Liquidity Flow path).
  - TA scoring + regime (reuse or lightly adapt from V2 modules — `score-engine.ts`, `regime-engine.ts`, etc.).
  - Synthesis logic.
- Minimal multi-TF bias.
- Lightweight final gate.
- Wire the new engine into `/api/signals` (for now, force `engine: "confluence"` or introduce a temp `"v3"` and default to it).
- Basic logging / reasoning generation.

### Day 2 (Polish + Integration + Validation)
- Improve reasoning strings (make them tell a clear story: "Microstructure shows strong buying + 4H trend support...").
- Ensure TradingType weights and TP/SL multipliers still work.
- Test with different types (scalping should be faster/more sensitive, position more patient).
- Update labels in a couple of key places (StrategyConfig header, any "Confluence V2" text) to "Confluence V3" or "Unified Engine".
- Quick paper trading smoke test.
- Prepare a short demo narrative.

**Risk Mitigation:** If something breaks hard, we can always fall back to the current Liquidity Flow path for the demo while we fix.

---

## 7. UI Handling (Minimal for Now)

- **Do not** do a full StrategySelectionModal or StrategyConfig refactor in these 2 days.
- Options:
  - Hard-default the main signals endpoint + dashboard to use V3.
  - In StrategyConfig, add a note "Confluence V3 (Unified)" and keep the old selectors but mark them legacy.
  - Or simply change the prominent labels from "Confluence V2" to "Confluence Engine" / "V3".
- Full UI alignment (remove old engine choice, update all descriptions, new onboarding, etc.) is explicitly **post-judgment** work.

---

## 8. Open Questions / Decisions to Confirm

1. Exact name? "Confluence V3", "SignalFlow Confluence", "Unified Microstructure Confluence"?
2. How aggressive do we want to be on "more signals"? (User previously wanted fewer pure HOLDs.)
3. Do we still support the old `engine: "liquidityFlow"` / `"confluence"` in StrategyConfig for now (for backwards compat / testing), or cut over completely?
4. How much do we still use the external SoSoValue data (news/ETF/macro) inside V3? (Suggestion: lightly in reasoning only.)
5. Target output confidence distribution for demo (e.g. many 55-75 confidence signals vs very few ultra-high confidence)?
6. Any must-keep behaviors from the old V2 (e.g. specific lesson notes, framework trace)?

---

## 9. Next Steps After Judgment

- Proper backtesting harness for V3.
- UI redesign to match the new unified philosophy (remove dual strategy picker, new strategy config focused on trading types + a few high-level dials).
- Optional re-introduction of AI layer on top of V3.
- Public docs / in-app explanation of the new engine.

---

**This document is the single source of truth for the next implementation phase.**

Ready when you are after the laptop restart. We can iterate on this doc together, then start coding the engine.

Let me know if you want any section expanded, diagrams added (mermaid), or specific priorities called out before we begin.
TAMBAHAN SPEC UNTUK PROMPT — Real-Time Log Feed (append ke section log yang sudah ada)

LOG FEED — VISUAL & DISPLAY SPEC
Visible rows: 15-20 baris sekaligus dalam fixed height 280px dengan internal vertical scroll. Buffer maksimal 200 entry terakhir di memory — entry lama di-trim otomatis saat buffer penuh.
Text style: Terminal-style

Font: font-mono (monospace)
Font size: 12px atau 13px
Line height: 1.6 biar tidak terlalu rapat
Background: sedikit lebih gelap dari card background — subtle distinction dari surrounding UI
Padding inside log area: 12px 16px
No border radius pada individual log entry — flat, raw, terminal feel

Entry format:
[HH:MM:SS] {emoji} {message}
Contoh:
[09:14:32] 📊 SoDEX tape updated — BTC/USDC $67,420
[09:14:33] ⚡ Volume spike detected — 2.3x avg (M15)
[09:14:35] 📰 News sentiment parsed — 4 bearish / 2 bullish
[09:14:36] 🔄 Confluence V3 recalculating...
[09:14:37] ✅ Score updated: 62% → 68% — SHORT confirmed
[09:14:40] ⚠️ AI thesis confidence below threshold (42%)
[09:14:41] ❌ SoDEX feed timeout — retrying...
Color per log type — applied to entire entry row text:
TypeTrigger conditionText colorDATAroutine data update#6B7280 (dim gray)SIGNALscore update, bias change, signal confirmed#00E5A8 (brand green / existing theme color)RECALCany recalculating event#94A3B8 (slate, slightly brighter than gray)WARNINGlow confidence, below threshold, anomaly#FBBF24 (amber/yellow)ERRORfeed timeout, connection failure, retry#F87171 (red)
Timestamp [HH:MM:SS] selalu dim gray #6B7280 regardless of entry type — hanya message text yang berubah warna.
Scroll behavior:

Auto-scroll to bottom on new entry
Jika user scroll up manually → pause auto-scroll, tampilkan pill kecil di bottom: ▼ new entries yang bisa diklik untuk resume auto-scroll
Resume auto-scroll otomatis jika user scroll kembali ke bottom

Animation:

New entry: fade-in 80ms ease-in — subtle, tidak distracting
Tidak ada slide, bounce, atau animasi lain

Header log card:
SIGNAL LOG                    [All] [Signal Only] [Errors]   ● LIVE

Judul kiri: SIGNAL LOG dalam font-mono uppercase tracking-widest ukuran kecil
Toggle tengah: tiga pill button, default aktif Signal Only
Status indikator kanan: ● LIVE hijau dengan CSS pulse animation saat SSE aktif, ● reconnecting... amber saat retry, ● polling slate saat fallback ke polling


Ini versi final prompt lengkapnya sekarang — gue gabungkan semua section jadi satu:

PROMPT FINAL — SignalFlow Agent Dashboard Redesign (Phase 1: Layout & Content)

You are a senior UI/UX engineer and product designer helping redesign the SignalFlow Agent dashboard at signalflowagent.vercel.app.
This is a Phase 1 redesign focused purely on layout structure and content completeness. Do not touch visual polish, color system, or typography yet — that is Phase 2.

CONTEXT: What SignalFlow Agent is
SignalFlow Agent is an AI-powered signal-to-execution dashboard built on SoSoValue API and SoDEX. It processes market data through a 6-layer pipeline and outputs a trading signal with a decision score. The pipeline is:

SoDEX Data (live DEX prices, klines, volume)
SoSoValue Data (news, ETF flow, macro, sentiment)
Confluence V3 (TA + microstructure: orderbook, flow, funding)
AI Thesis (narrative context, probability check)
Trade Setup (entry, risk, targets, sizing)
Decision Score (final bias, execution readiness)


CORE PROBLEM TO SOLVE
The current dashboard shows signal output (score, bias, SHORT/LONG/NO TRADE) but does not show the signal process — why the score is what it is, which layer contributed what, and what data triggered the change. Users and judges cannot "follow the reasoning." The dashboard lacks transparency into how a signal is born.
The guiding principle for this redesign:

Dashboard = "should I trade and why?"

Trading page = "how do I trade?"


CHANGES TO IMPLEMENT
1. Remove the chart from dashboard

The chart is duplicated on the Trading page
It consumes significant space and render budget
The dashboard is a decision layer, not a charting tool
Freed space must be reallocated to signal transparency components listed below

2. Layout container — do not use full-wide

Wrap entire dashboard content in a single centered container
max-width: 1400px, margin: 0 auto, padding: 0 24px
All cards and panels sit inside this container
Nothing bleeds to full viewport width
Reference: Linear, Vercel dashboard layout conventions


LAYOUT STRUCTURE
The dashboard uses a two-column grid layout inside the max-width container. Column ratio is 60% left / 40% right on desktop. On mobile, both columns stack into single column, top to bottom, left column first.
┌─────────────────────────────────────────────────────────┐
│  NAVBAR (full width inside container)                   │
├───────────────────────────┬─────────────────────────────┤
│  LEFT COLUMN (60%)        │  RIGHT COLUMN (40%)         │
│                           │                             │
│  [A] Decision Score       │  [E] Signal Reliability     │
│      + Bias Hero          │                             │
│                           ├─────────────────────────────┤
│  ─────────────────────    │  [F] Market Breadth         │
│                           │                             │
│  [B] Layer Breakdown      ├─────────────────────────────┤
│      Panel                │  [G] Execution Readiness    │
│                           │                             │
│  ─────────────────────    ├─────────────────────────────┤
│                           │  [H] Market Pressure        │
│  [C] Why This Signal?     │                             │
│      (inline expand)      │                             │
│                           │                             │
├───────────────────────────┴─────────────────────────────┤
│  [D] Real-Time Log Feed (full width, spans both cols)   │
└─────────────────────────────────────────────────────────┘

CARD PLACEMENT — DETAILED SPEC PER CARD
[A] Decision Score + Bias Hero — LEFT COLUMN, TOP

First card in left column, topmost position
Displays: current bias label (LONG / SHORT / NO TRADE), decision score percentage, score progress bar or arc
This is the "headline" of the dashboard — largest text on the page
Contains the "Generate Signal" button
Contains the "Execute Setup" button (security-gated)
No chart inside this card

[B] Layer Breakdown Panel — LEFT COLUMN, SECOND

Sits directly below card A in left column
Shows all 6 pipeline layers as expandable rows
Each row shows: layer name, score contribution in points, visual bar showing weight
Expandable sub-items show what specifically triggered each layer's score
Default state: all rows collapsed, showing only top-level score per layer
Expanded state on click: shows sub-items with individual point contributions
Example structure:

[▼] Core Confluence (TA + Micro)   +42pts  ████████░░
    └ RSI divergence               +18pts
    └ Volume spike                 +15pts
    └ Funding rate                 +9pts
[▼] News Sentiment                 +12pts  ███░░░░░░░
    └ 4 bearish / 2 bullish headlines
[▼] AI Thesis                      +8pts   ██░░░░░░░░
    └ Bearish narrative confirmed
[C] Why This Signal? — LEFT COLUMN, THIRD

Sits directly below card B in left column
Always visible as a collapsed summary line when a signal exists
Expands inline (not modal) on click to show full reasoning paragraph
Content is human-readable, auto-generated from the signal engine output
Example collapsed: "SHORT — funding negative, volume divergence, bearish sentiment"
Example expanded: "SHORT bias because funding rate is negative (-0.03%), volume divergence detected over last 3 candles, and sentiment is bearish from 4 out of 6 parsed headlines. AI thesis confirms bearish narrative with 68% probability."
If no signal has been generated yet, show placeholder: "Generate a signal to see reasoning."

[D] Real-Time Log Feed — FULL WIDTH, BOTTOM

Spans the full width of the container below both columns
NOT inside left or right column — breaks out of two-column grid, sits below as a full-width row
Fixed height: 280px with internal vertical scroll
15-20 baris visible sekaligus dalam fixed height tersebut
Buffer maksimal 200 entry terakhir di memory, entry lama di-trim otomatis
Auto-scrolls to newest entry at bottom
Jika user scroll up manually → pause auto-scroll, tampilkan pill ▼ new entries di bottom yang bisa diklik untuk resume
Resume auto-scroll otomatis jika user scroll kembali ke bottom

Log visual style — terminal-style:

Font: font-mono
Font size: 12px atau 13px
Line height: 1.6
Background: sedikit lebih gelap dari surrounding card background
Padding: 12px 16px
No border radius pada individual log entry — flat, raw

Entry format:
[HH:MM:SS] {emoji} {message}
Color per log type (applied to full entry text):
TypeConditionColorDATAroutine data update#6B7280 dim graySIGNALscore update, bias change, confirmed#00E5A8 brand greenRECALCrecalculating events#94A3B8 slateWARNINGlow confidence, below threshold#FBBF24 amberERRORfeed timeout, retry, failure#F87171 red
Timestamp [HH:MM:SS] always #6B7280 dim gray regardless of type. Only message text changes color.
New entry animation: fade-in 80ms ease-in only. No slide, bounce, or other animation.
Log card header layout:
SIGNAL LOG                    [All] [Signal Only] [Errors]   ● LIVE

Left: SIGNAL LOG in font-mono uppercase tracking-widest small size
Center: three pill toggles, default active: Signal Only
Right: ● LIVE green with CSS pulse when SSE active, ● reconnecting... amber on retry, ● polling slate on fallback

[E] Signal Reliability — RIGHT COLUMN, TOP

First card in right column, aligned to top same as card A
Displays: hit rate percentage, resolved count, wins, misses, current win streak, current loss streak
Shows "collecting" state if not enough resolved signals yet

[F] Market Breadth — RIGHT COLUMN, SECOND

Sits below card E in right column
Displays: breadth impulse score, live markets count, advance/flat/decline counts, active tape percentage, median, holds, LONG vs SHORT engine signal counts, lead move status

[G] Execution Readiness — RIGHT COLUMN, THIRD

Sits below card F in right column
Displays: execution readiness percentage, feed coverage, order bias, actionable signals count, mark price, spread bps, top depth, 24H tape summary

[H] Market Pressure — RIGHT COLUMN, FOURTH

Sits below card G in right column, last card in right column
Displays: live market pressure ranking
Shows placeholder if waiting for tradable pair prices

RIGHT COLUMN ALIGNMENT NOTE:

Cards E, F, G, H stack naturally. If left column total height exceeds right column total height, right column cards align to top and leave empty space at bottom — do not stretch cards to fill height.

NEWS SENTIMENT

Do not render as a standalone card
Integrate inside Card B (Layer Breakdown) as expanded sub-items for the "News Sentiment" layer row


REAL-TIME LOG — SSE IMPLEMENTATION SPEC
Use Server-Sent Events (SSE) via Edge Runtime for the log feed. Do not use polling for the log. Polling may remain for all other dashboard data (score, market breadth, execution readiness, etc.) but log feed must use SSE.
Server route:
typescript// app/api/signal-log/route.ts
export const runtime = 'edge'

// Returns: Content-Type: text/event-stream
// Sends one event per pipeline stage update
// Event format:
// data: {"ts":"09:14:32","type":"SIGNAL","emoji":"✅","msg":"Score updated: 62% → 68% — SHORT confirmed"}\n\n
Client:
typescript// Use native EventSource API
// On message: append new entry to log, trim buffer to 200 max, auto-scroll if not manually scrolled up
// On error: show "● reconnecting..." indicator, retry after 2s delay, max 3 attempts
// After 3 failed attempts: fallback to polling at 5s interval, show "● polling" indicator
// On reconnect success: resume SSE, restore "● LIVE" indicator
// No error toast or blocking UI during reconnect — log continues silently

WHAT NOT TO DO IN THIS PHASE

Do not change colors, fonts, spacing tokens, or visual style
Do not redesign the Trading page or any other page
Do not add new data sources or API integrations beyond the SSE log endpoint
Do not change the signal engine logic or scoring algorithm
Do not use full-width layout — everything inside max-width 1400px container
Do not render a chart anywhere on the dashboard page
Phase 2 (UI polish, aesthetic direction) comes after layout and content are confirmed correct


SUCCESS CRITERIA FOR PHASE 1
A user landing on the dashboard must be able to:

Immediately see the current signal bias and score — card A is the first thing eyes land on
Understand why the signal was generated — layer breakdown (B) and reasoning summary (C)
Watch the signal forming in near real-time — log feed (D) via SSE
Know how reliable the signal history is — signal reliability (E)
Know if market conditions support execution — breadth (F) + readiness (G) + pressure (H)
All of the above without visiting the Trading page or reading any external documentation
# UX Idea: Trader Type Onboarding — Global vs Signal-Only
## Date: May 28, 2026

### Idea from User
Modal "What type of trader are you?" muncul di AWAL ketika user pertama kali
mengakses platform. Semua page (dashboard, signals, trading, performance, dll)
akan beradaptasi berdasarkan pilihan user. Platform becomes truly "private"
dan personalized.

### Two Approaches Evaluated

#### Approach A: Global Onboarding (modal on first visit to ANY page)
- Modal muncul di AppShell/layout level
- Selection affects ALL pages globally
- Dashboard, signals, trading, performance — all adapt
- Truly personalized platform experience

#### Approach B: Signal Page Only (recommended for Wave 2)
- Modal muncul hanya di /signals page
- Selection affects signals filtering + display
- Other pages unchanged
- Simpler, faster to ship, lower risk

### Decision: ✅ DONE — Approach B implemented

**Implemented approach:** Signal Page Only (Approach B)
- Modal (`TraderTypeModal.tsx`) muncul hanya di `/signals` page
- Selection affects signals filtering + display + OrderForm leverage caps
- TypeSwitcher dropdown di header untuk quick switching
- Per-type weights, TP/SL, confidence thresholds all adapt
- Other pages unaffected by type selection

**Commit:** Part of Wave 2 trading type system implementation

"use client";

import { useState, useEffect } from "react";
import { Target, Layers, Activity } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SpeedometerGauge from "@/components/ui/SpeedometerGauge";
import TradingChart from "@/components/TradingChart";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";

/* ── Mock Data ── */

const pipelineSteps = [
  { number: "1", title: "SoDEX Data", description: "On-chain DEX\nFlows & Trades", icon: "database" },
  { number: "2", title: "SoSoValue Data", description: "Market, ETF, Index,\nOn-chain & More", icon: "cube" },
  { number: "3", title: "Confluence V2", description: "Multi-Source Fusion\n& Alignment", icon: "fusion" },
  { number: "4", title: "AI Thesis", description: "Context, Narrative\n& Probability", icon: "brain" },
  { number: "5", title: "Trade Setup", description: "Entry, Risk, Targets\n& Execution Plan", icon: "target" },
  { number: "6", title: "Decision Score", description: "Final Probability\n& Execution Ready", icon: "score" },
];


const decisionPanelData = {
  selected: "LONG",
  confidence: 78,
  confidenceLabel: "High",
  takeProfit: [
    ["TP1", "68,850.0", "(1.5R)"],
    ["TP2", "70,200.0", "(3.0R)"],
    ["TP3", "72,150.0", "(5.0R)"],
  ],
  stopLoss: ["SL", "65,100.0", "(-1.2R)"],
  riskReward: "1 : 2.6",
  positionSize: "0.42 BTC",
};

/* ── Helpers ── */

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}


/* ── Tech Icon (inline SVG) ── */

function TechIcon({ name, className = "" }: { name: string; className?: string }) {
  const common = "fill-none stroke-current";
  return (
    <svg viewBox="0 0 32 32" className={cx("h-7 w-7 text-accent", className)} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {name === "database" && <path className={common} d="M8 9c0-2 16-2 16 0v14c0 2-16 2-16 0V9Zm0 0c0 2 16 2 16 0M8 16c0 2 16 2 16 0" />}
      {name === "cube" && <path className={common} d="m16 4 10 6v12l-10 6-10-6V10l10-6Zm0 0v12m10-6-10 6-10-6m10 6v12" />}
      {name === "fusion" && <g className={common}><circle cx="12" cy="18" r="6" /><circle cx="20" cy="18" r="6" /><circle cx="16" cy="11" r="6" /></g>}
      {name === "brain" && <path className={common} d="M11 7c-3 0-5 2-5 5 0 1 .3 2 .8 2.8A5.3 5.3 0 0 0 8 25c2 0 3.5-1 4-2m9-16c3 0 5 2 5 5 0 1-.3 2-.8 2.8A5.3 5.3 0 0 1 24 25c-2 0-3.5-1-4-2M16 6v20M11 12h3m4 0h3M10 18h4m4 0h4" />}
      {name === "target" && <g className={common}><circle cx="16" cy="16" r="9" /><circle cx="16" cy="16" r="3" /><path d="M16 2v6M16 24v6M2 16h6M24 16h6" /></g>}
      {name === "trend" && <path className={common} d="M5 22h22M7 19l5-5 4 4 8-10m0 0v6m0-6h-6" />}
      {name === "globe" && <g className={common}><circle cx="16" cy="16" r="10" /><path d="M6 16h20M16 6c3 3 4 7 4 10s-1 7-4 10M16 6c-3 3-4 7-4 10s1 7 4 10" /></g>}
      {name === "chat" && <path className={common} d="M6 8h20v13H12l-6 5V8Zm5 5h10M11 17h7" />}
      {name === "bank" && <path className={common} d="M5 13h22L16 6 5 13Zm3 0v11m5-11v11m6-11v11m5-11v11M5 24h22" />}
      {name === "bars" && <path className={common} d="M7 24V14m6 10V8m6 16V11m6 13V5M5 26h22" />}
      {name === "score" && <g className={common}><circle cx="16" cy="16" r="10" /><path d="M11 16l3 3 7-7" /></g>}
      {!["database", "cube", "fusion", "brain", "target", "trend", "globe", "chat", "bank", "bars", "score"].includes(name) && <circle className={common} cx="16" cy="16" r="10" />}
    </svg>
  );
}

/* ── Pipeline Flow ── */

function PipelineStepCard({ step }: { step: (typeof pipelineSteps)[number] }) {
  return (
    <Card variant="default" padding="none" className="relative flex h-[88px] items-center gap-4 rounded-xl px-5">
      <span className="absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-muted text-[11px] font-bold text-accent">{step.number}</span>
      <TechIcon name={step.icon} className="h-10 w-10 shrink-0" />
      <div>
        <h3 className="text-sm font-semibold text-txt-primary">{step.title}</h3>
        <p className="mt-1 whitespace-pre-line text-xs leading-snug text-txt-tertiary">{step.description}</p>
      </div>
    </Card>
  );
}

function Connector() {
  return (
    <div className="hidden min-w-[64px] flex-1 items-center lg:flex">
      {/* Left line — shimmer on the line itself */}
      <div className="h-px flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent-dim" />
        <div className="absolute inset-0 connector-line-shimmer" />
      </div>
      {/* Heartbeat — base + flowing dash */}
      <svg viewBox="0 0 64 26" className="h-7 w-16 shrink-0">
        <path d="M0 13h18l4-10 8 20 8-20 8 20 4-10h14" fill="none" stroke="var(--color-accent-dim)" strokeWidth="1.5" />
        <path d="M0 13h18l4-10 8 20 8-20 8 20 4-10h14" fill="none" stroke="white" strokeWidth="1.5"
          strokeDasharray="20 48" strokeLinecap="round" opacity="0.5"
          className="connector-shimmer-svg" />
      </svg>
      {/* Right line — shimmer on the line itself */}
      <div className="h-px flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent-dim" />
        <div className="absolute inset-0 connector-line-shimmer" />
      </div>
    </div>
  );
}

function PipelineFlow() {
  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <div className="grid min-w-[1120px] grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-center">
        {pipelineSteps.map((step, index) => (
          <div key={step.title} className="contents">
            <PipelineStepCard step={step} />
            {index < pipelineSteps.length - 1 && <Connector />}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Section Panel (using design system Card) ── */

function Panel({ title, badge, children, className = "" }: { title: string; badge?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card variant="default" padding="none" className={cx("rounded-xl overflow-hidden flex flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold tracking-wide text-txt-primary">{title}</h2>
        {badge}
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </Card>
  );
}

/* ── Market Canvas (real TradingView chart) ── */

function MarketCanvas({ pair }: { pair: string }) {
  const d = useDashboard();
  const sodexSymbol = pairToSodexSymbol(pair);
  const ticker = d.tickerMap.get(sodexSymbol);
  const currentPrice = ticker ? parseFloat(ticker.lastPx) : null;

  return (
    <Card variant="default" padding="none" className="rounded-xl overflow-hidden h-[494px] flex flex-col">
      <TradingChart
        klines={d.klines}
        symbol={pair}
        currentPrice={currentPrice}
        liveSignals={d.liveSignals}
        tickerMap={d.tickerMap}
      />
    </Card>
  );
}

/* ── Decision Panel ── */

function DecisionPanel() {
  const [signal, setSignal] = useState(decisionPanelData.selected);
  const execute = () => console.info("SignalFlow execute setup", { signal });

  const signalColors: Record<string, { active: string; idle: string; icon: string }> = {
    LONG: {
      active: "bg-buy-muted border-2 border-buy text-buy ring-1 ring-buy/30",
      idle: "border border-border-default text-txt-muted hover:border-buy-dim hover:text-buy",
      icon: "↑",
    },
    SHORT: {
      active: "bg-sell-muted border-2 border-sell text-sell ring-1 ring-sell/30",
      idle: "border border-border-default text-txt-muted hover:border-sell-dim hover:text-sell",
      icon: "↓",
    },
    "NO TRADE": {
      active: "bg-hold-muted border-2 border-hold text-hold ring-1 ring-hold/30",
      idle: "border border-border-default text-txt-muted hover:border-hold-dim hover:text-hold",
      icon: "⊖",
    },
  };

  return (
    <Panel title="CURRENT DECISION SCORE" className="h-[494px]">
      <div className="space-y-4 p-4">
        {/* Signal Selector */}
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-txt-tertiary uppercase">Primary Signal</div>
          <div className="grid grid-cols-3 gap-1.5">
            {["LONG", "SHORT", "NO TRADE"].map((item) => {
              const isActive = signal === item;
              const colors = signalColors[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSignal(item)}
                  className={cx(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-all",
                    isActive ? colors.active : colors.idle
                  )}
                >
                  <div className="text-xl">{colors.icon}</div>
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confidence — Speedometer */}
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-txt-tertiary uppercase">Signal Strength</div>
          <div className="flex items-center justify-center py-1">
            <div className="text-center">
              <SpeedometerGauge value={decisionPanelData.confidence} size="lg" showLabel={false} />
              <div className="mt-1 text-4xl font-bold tabular-nums tracking-tight" style={{ color: decisionPanelData.confidence >= 75 ? "var(--color-buy)" : decisionPanelData.confidence >= 50 ? "var(--color-hold)" : "var(--color-sell)" }}>
                {decisionPanelData.confidence}%
              </div>
              <div className="text-sm font-medium text-txt-tertiary">{decisionPanelData.confidenceLabel}</div>
            </div>
          </div>
        </div>

        {/* TP / SL Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card variant="inset" padding="sm" className="rounded-xl">
            <div className="mb-2 text-[11px] font-semibold text-buy uppercase tracking-wide">Take Profit (TP)</div>
            <div className="space-y-1.5">
              {decisionPanelData.takeProfit.map(([label, price, risk]) => (
                <div key={label} className="grid grid-cols-[36px_1fr_54px] gap-1 font-mono text-xs">
                  <span className="text-txt-muted">{label}</span>
                  <span className="text-buy">{price}</span>
                  <span className="text-txt-tertiary">{risk}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card variant="inset" padding="sm" className="rounded-xl">
            <div className="mb-2 text-[11px] font-semibold text-sell uppercase tracking-wide">Stop Loss (SL)</div>
            <div className="grid grid-cols-[28px_1fr_58px] gap-1 font-mono text-xs">
              <span className="text-txt-muted">{decisionPanelData.stopLoss[0]}</span>
              <span className="text-sell">{decisionPanelData.stopLoss[1]}</span>
              <span className="text-txt-tertiary">{decisionPanelData.stopLoss[2]}</span>
            </div>
            <div className="my-3 h-px bg-border-default" />
            <div className="text-[11px] font-semibold text-txt-tertiary uppercase tracking-wide">Risk / Reward</div>
            <div className="mt-1 font-mono text-xl font-bold text-txt-primary">{decisionPanelData.riskReward}</div>
          </Card>
        </div>

        {/* Execute */}
        <Button variant="primary" size="lg" onClick={execute} className="w-full h-12 rounded-xl text-sm">
          <span className="text-lg">▶</span> Execute Setup
        </Button>

        {/* Position Size */}
        <div className="flex justify-between text-sm">
          <span className="text-txt-tertiary">Position Size (Risk 1%):</span>
          <span className="font-mono font-semibold text-txt-primary">{decisionPanelData.positionSize}</span>
        </div>
      </div>
    </Panel>
  );
}

/* ── News Feed ── */

interface NewsItem {
  id: number;
  title: string;
  content: string;
  release_time: number;
  source_link: string;
  matched_currencies: Array<{ currency_id: string; symbol: string }> | null;
  tags: Array<{ name: string }> | null;
}

interface NewsResponse {
  list: NewsItem[];
  error?: string | null;
  sentiment: { score: number; label: string };
  topCoins: Array<{ symbol: string; count: number }>;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function sentimentVariant(label: string): string {
  if (label === "Bullish") return "buy";
  if (label === "Bearish") return "sell";
  return "muted";
}

function NewsFeed() {
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch("/api/news?pageSize=8")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setNews(data))
      .catch(() => setFetchError(true));
  }, []);

  const apiError = news?.error;
  const hasData = news && news.list.length > 0;

  return (
    <Panel
      title="NEWS FEED"
      badge={hasData && news?.sentiment && (
        <Badge variant={sentimentVariant(news.sentiment.label)} size="sm">
          {news.sentiment.label} {news.sentiment.score}
        </Badge>
      )}
      className="h-[494px]"
    >
      <div>
        {hasData && news?.list.map((item) => (
          <div
            key={item.id}
            className="border-b border-border-default px-3 py-2.5 transition-colors hover:bg-elevated/30"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-txt-muted">{timeAgo(item.release_time)}</span>
              {item.matched_currencies?.slice(0, 3).map((c) => (
                <span key={c.symbol} className="rounded bg-accent-muted px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                  {c.symbol}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs font-medium text-txt-primary leading-snug line-clamp-2">{item.title}</p>
          </div>
        ))}
        {fetchError && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-xs font-semibold text-sell">Connection Failed</span>
            <span className="text-[11px] text-txt-tertiary">Unable to reach news API</span>
          </div>
        )}
        {!news && !fetchError && (
          <div className="flex items-center justify-center py-12 text-xs text-txt-muted">Loading news…</div>
        )}
        {apiError && !hasData && !fetchError && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-xs font-semibold text-hold">API Quota Exceeded</span>
            <span className="text-[11px] text-txt-tertiary text-center px-4">SoSoValue monthly limit reached. Resumes after quota reset.</span>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ── Market Stats Bar (real data) ── */

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function changeColor(pct: number): string {
  return pct > 0 ? "text-buy" : pct < 0 ? "text-sell" : "text-txt-muted";
}

function changeArrow(pct: number): string {
  return pct > 0 ? "▲" : pct < 0 ? "▼" : "—";
}

function TopMoversCard() {
  const d = useDashboard();
  const tickers = d.tickers ?? [];

  const parsed = tickers
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      change: typeof t.changePct === "number" ? t.changePct : parseFloat(String(t.changePct ?? "0")),
      price: parseFloat(t.lastPx ?? "0"),
    }))
    .filter((t) => t.price > 0)
    .sort((a, b) => b.change - a.change);

  const top3 = parsed.slice(0, 3);
  const bottom3 = parsed.slice(-3).reverse();

  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">Top Movers</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[9px] uppercase text-buy font-medium">Gainers</p>
          {top3.map((t) => (
            <div key={t.symbol} className="flex items-center justify-between py-0.5 text-xs">
              <span className="font-medium text-txt-primary">{t.symbol}</span>
              <span className={`font-mono tabular-nums ${changeColor(t.change)}`}>
                {changeArrow(t.change)} {Math.abs(t.change).toFixed(2)}%
              </span>
            </div>
          ))}
          {top3.length === 0 && <p className="text-[10px] text-txt-muted">No data</p>}
        </div>
        <div>
          <p className="mb-1.5 text-[9px] uppercase text-sell font-medium">Losers</p>
          {bottom3.map((t) => (
            <div key={t.symbol} className="flex items-center justify-between py-0.5 text-xs">
              <span className="font-medium text-txt-primary">{t.symbol}</span>
              <span className={`font-mono tabular-nums ${changeColor(t.change)}`}>
                {changeArrow(t.change)} {Math.abs(t.change).toFixed(2)}%
              </span>
            </div>
          ))}
          {bottom3.length === 0 && <p className="text-[10px] text-txt-muted">No data</p>}
        </div>
      </div>
    </Card>
  );
}

function SignalAccuracyCard() {
  const d = useDashboard();
  const stats = d.signalStats;
  const streaks = d.streaks;

  const accuracy = stats?.accuracy;
  const totalResolved = stats?.totalResolved ?? 0;
  const currentStreak = streaks?.current;
  const winStreak = currentStreak?.type === "win" ? currentStreak.count : 0;
  const lossStreak = currentStreak?.type === "loss" ? currentStreak.count : 0;

  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">
        <Target size={12} className="text-accent" /> Signal Accuracy
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Win Rate</span>
          <span className="font-mono text-sm font-bold tabular-nums text-accent">
            {accuracy !== null && accuracy !== undefined ? `${accuracy.toFixed(1)}%` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Resolved</span>
          <span className="font-mono text-xs font-semibold text-txt-primary tabular-nums">{totalResolved}</span>
        </div>
        <div className="h-px bg-border-default" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Win Streak</span>
          <span className="font-mono text-xs font-semibold text-buy tabular-nums">{winStreak || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Loss Streak</span>
          <span className="font-mono text-xs font-semibold text-sell tabular-nums">{lossStreak || "—"}</span>
        </div>
      </div>
    </Card>
  );
}

function IndexCard() {
  const d = useDashboard();
  const tickers = d.tickers ?? [];

  const coins = ["vBTC_vUSDC", "vETH_vUSDC", "vSOL_vUSDC"];
  const labels: Record<string, string> = { vBTC_vUSDC: "BTC", vETH_vUSDC: "ETH", vSOL_vUSDC: "SOL" };

  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">
        <Layers size={12} className="text-accent" /> Index Prices
      </h3>
      <div className="space-y-2">
        {coins.map((sym) => {
          const t = tickers.find((tk) => tk.symbol === sym);
          if (!t) return (
            <div key={sym} className="flex items-center justify-between text-xs">
              <span className="font-medium text-txt-primary">{labels[sym]}</span>
              <span className="text-txt-muted">—</span>
            </div>
          );
          const price = parseFloat(t.lastPx);
          const change = typeof t.changePct === "number" ? t.changePct : parseFloat(String(t.changePct ?? "0"));
          return (
            <div key={sym} className="flex items-center justify-between text-xs">
              <span className="font-medium text-txt-primary">{labels[sym]}</span>
              <div className="text-right">
                <span className="font-mono font-semibold text-txt-primary tabular-nums">{fmtUsd(price)}</span>
                <span className={`ml-2 font-mono text-[10px] tabular-nums ${changeColor(change)}`}>
                  {changeArrow(change)} {Math.abs(change).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MarketStatsCard() {
  const d = useDashboard();
  const tickers = d.tickers ?? [];
  const signals = d.liveSignals ?? [];

  const totalVolume = tickers.reduce((sum, t) => sum + parseFloat(t.quoteVolume ?? "0"), 0);
  const activePairs = tickers.filter((t) => parseFloat(t.lastPx ?? "0") > 0).length;
  const buySignals = signals.filter((s) => s.action === "LONG").length;
  const sellSignals = signals.filter((s) => s.action === "SHORT").length;

  return (
    <Card variant="default" padding="sm" className="rounded-xl">
      <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-txt-secondary">
        <Activity size={12} className="text-accent" /> Market Stats
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Volume 24H</span>
          <span className="font-mono text-sm font-bold text-txt-primary tabular-nums">{fmtUsd(totalVolume)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Active Pairs</span>
          <span className="font-mono text-xs font-semibold text-txt-primary tabular-nums">{activePairs}</span>
        </div>
        <div className="h-px bg-border-default" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Buy Signals</span>
          <span className="font-mono text-xs font-semibold text-buy tabular-nums">{buySignals}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">Sell Signals</span>
          <span className="font-mono text-xs font-semibold text-sell tabular-nums">{sellSignals}</span>
        </div>
      </div>
    </Card>
  );
}

function MarketStatsBar() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TopMoversCard />
      <SignalAccuracyCard />
      <IndexCard />
      <MarketStatsCard />
    </div>
  );
}

/* ── Root Component ── */

export default function SignalFlowCommandCenter() {
  const d = useDashboard();
  const pairBase = d.selectedPair.startsWith("v")
    ? d.selectedPair.replace(/^v/, "").replace(/_vUSDC$/, "")
    : d.selectedPair.split("/")[0];
  const pair = `${pairBase}/USDC`;

  return (
    <div className="space-y-3 px-2 lg:px-3 pt-2 lg:pt-3">
      <div className="overflow-x-auto">
        <PipelineFlow />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2.8fr)_minmax(280px,1.3fr)_minmax(280px,1.2fr)]">
        <MarketCanvas pair={pair} />
        <DecisionPanel />
        <NewsFeed />
      </div>
      <MarketStatsBar />
    </div>
  );
}

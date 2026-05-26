"use client";

import { useState } from "react";

const sections = [
  "Overview",
  "Getting Started",
  "Architecture",
  "Signal Engine",
  "AI Agents",
  "Risk Engine",
  "Data Pipeline",
  "Trading & Execution",
  "Wallet Infrastructure",
  "API Reference",
  "Deployment",
  "Roadmap",
];

export default function DocsPage() {
  const [active, setActive] = useState("Overview");

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Sidebar nav */}
      <nav className="lg:w-48 shrink-0 bg-[#070A12] border border-border-default rounded-xl p-3 lg:max-h-[calc(100vh-120px)] overflow-y-auto">
        <h3 className="text-xs font-bold text-txt-muted uppercase tracking-wider mb-3 px-2">
          Documentation
        </h3>
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-0.5 ${
              active === s
                ? "text-white font-semibold bg-accent-muted border-l-[3px] border-[#00E5A8]"
                : "text-txt-muted hover:text-white hover:bg-[#ffffff05]"
            }`}
          >
            {s}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-card border border-border-default rounded-xl p-6 lg:p-8">
        {active === "Overview" && <Overview />}
        {active === "Getting Started" && <GettingStarted />}
        {active === "Architecture" && <Architecture />}
        {active === "Signal Engine" && <SignalEngine />}
        {active === "AI Agents" && <AIAgents />}
        {active === "Risk Engine" && <RiskEngine />}
        {active === "Data Pipeline" && <DataPipeline />}
        {active === "Trading & Execution" && <TradingExecution />}
        {active === "Wallet Infrastructure" && <WalletInfrastructure />}
        {active === "API Reference" && <APIReference />}
        {active === "Deployment" && <Deployment />}
        {active === "Roadmap" && <Roadmap />}
      </div>
    </div>
  );
}

/* ── Section Components ── */

function Overview() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white m-0">SignalFlow Agent</h2>
        <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted text-accent border border-accent-dim">
          Wave 2
        </span>
      </div>

      <p className="text-[#aaaacc] leading-relaxed">
        SignalFlow Agent is an <strong className="text-white">AI-powered signal-to-execution trading dashboard</strong> built by{" "}
        <strong className="text-white">NoHype Labs</strong> for the SoSoValue Buildathon 2026.
        It transforms multi-dimensional market data into explainable, executable trade signals —
        specialist agents making real decisions from live data, enforcing risk rules,
        and executing trades non-custodially on SoDEX.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <StatCard
          label="Integrations"
          value="3"
          sub="SoSoValue · SoDEX · AI Providers"
        />
        <StatCard
          label="API Routes"
          value="9"
          sub="Server-side proxy endpoints"
        />
        <StatCard
          label="Signal Dimensions"
          value="5"
          sub="ETF · Sentiment · Macro · Momentum · Treasury"
        />
      </div>

      <h3 className="text-lg font-bold text-white mt-8">Core Philosophy</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PrincipleCard
          title="Not just data — decisions"
          desc="Every signal includes entry price, stop-loss, and take-profit targets. Actionable intelligence, not just scores."
        />
        <PrincipleCard
          title="Not just a dashboard — execution"
          desc="Trade directly on SoDEX with EIP-712 signing. No third-party middleman, non-custodial execution."
        />
        <PrincipleCard
          title="Not just one AI — your choice"
          desc="Use DeepSeek, OpenAI, Claude, Gemini, Grok, MiMo, Qwen, GLM, Mistral, Groq, or OpenRouter with your own API key. 11 providers, your control."
        />
        <PrincipleCard
          title="Not just desktop — everywhere"
          desc="PWA installable on iOS/Android, responsive layout, WalletConnect v2 for mobile trading."
        />
      </div>

      <h3 className="text-lg font-bold text-white mt-8">Supported Networks</h3>

      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Network</th>
            <th className="py-2 pr-4">Chain ID</th>
            <th className="py-2 pr-4">Native Token</th>
            <th className="py-2 pr-4">Trading Pair</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#1E293B20]">
            <td className="py-2 pr-4 text-white">ValueChain Mainnet</td>
            <td className="py-2 pr-4 font-mono text-[#aaaacc]">286623</td>
            <td className="py-2 pr-4 text-white">SOSO</td>
            <td className="py-2 pr-4 font-mono text-[#aaaacc]">vBTC_vUSDC</td>
            <td className="py-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00ff8815] text-buy border border-buy-dim">
                LIVE
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-lg font-bold text-white mt-8">Stack</h3>
      <div className="flex flex-wrap gap-2 mt-2">
        {["Next.js 16", "React 19", "Tailwind CSS v4", "TypeScript 5", "wagmi v3", "viem", "WalletConnect v2", "@tanstack/react-query", "Vercel"].map((t) => (
          <span key={t} className="text-xs px-2 py-1 rounded bg-[#1E293B] text-[#aaaacc] border border-border-default">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function GettingStarted() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Getting Started</h2>

      <h3 className="text-lg font-bold text-white">Prerequisites</h3>
      <ul className="text-[#aaaacc] space-y-1">
        <li><strong className="text-white">Node.js 18+</strong> — <code className="text-accent bg-[#1E293B] px-1 rounded">node --version</code></li>
        <li><strong className="text-white">pnpm</strong> — <code className="text-accent bg-[#1E293B] px-1 rounded">npm install -g pnpm</code></li>
        <li>A wallet with <strong className="text-white">SOSO on ValueChain mainnet</strong> for trading</li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-6">Installation</h3>
      <CodeBlock>{`git clone https://github.com/nohypelabs/signalflow-agent.git
cd signalflow-agent/dashboard
pnpm install
cp .env.example .env.local`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-6">Environment Variables</h3>
      <p className="text-[#aaaacc]">
        Create <code className="text-accent bg-[#1E293B] px-1 rounded">.env.local</code> in the dashboard root:
      </p>
      <CodeBlock>{`# SoDEX — Sosovalue DEX
SODEX_NETWORK=mainnet
SODEX_API_KEY_NAME=SignalFlowAgent

# DeepSeek (fallback AI provider)
DEEPSEEK_API_KEY=sk-your-deepseek-key

# SoSoValue — Market intelligence API
SOSOVALUE_API_KEY=SOSO-your-sosovalue-key

# WalletConnect v2 (for mobile wallet connections)
# Get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-6">Running</h3>
      <CodeBlock>{`pnpm dev       # Development — http://localhost:3000
pnpm build     # Production build
pnpm start     # Production server — http://localhost:3000
pnpm lint      # ESLint check`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-6">Environment Variable Reference</h3>
      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Variable</th>
            <th className="py-2 pr-4">Required</th>
            <th className="py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["SOSOVALUE_API_KEY", "Recommended", "SoSoValue OpenAPI key for ETF, news, macro, treasury data"],
            ["DEEPSEEK_API_KEY", "Recommended", "DeepSeek API key — server-side fallback for AI signals"],
            ["SODEX_NETWORK", "Optional", '"mainnet" (default) or "testnet"'],
            ["SODEX_API_KEY_NAME", "Optional", "x-api-key header value for authenticated SoDEX endpoints"],
            ["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "Optional", "Enables WalletConnect v2 for mobile trading"],
          ].map(([k, r, d]) => (
            <tr key={k} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 font-mono text-accent text-xs">{k}</td>
              <td className="py-2 pr-4 text-[#aaaacc]">{r}</td>
              <td className="py-2 text-[#aaaacc]">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-[#00E5A810] border border-accent-dim rounded-lg p-4 mt-6">
        <p className="text-sm text-[#aaaacc] m-0">
          <strong className="text-white">Graceful degradation:</strong> The app works without API keys —
          it falls back to mock data. Live data appears automatically when keys are configured.
        </p>
      </div>
    </div>
  );
}

function Architecture() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Architecture</h2>

      <p className="text-[#aaaacc]">
        SignalFlow Agent follows a <strong className="text-white">client-rendered SPA</strong> architecture
        on Next.js 16 App Router. All components use <code className="text-accent bg-[#1E293B] px-1 rounded">&quot;use client&quot;</code> —
        routing is handled by <code className="text-accent bg-[#1E293B] px-1 rounded">useState</code> in{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">page.tsx</code>, not Next.js file-based routing.
      </p>

      <h3 className="text-lg font-bold text-white mt-6">Data Flow</h3>
      <div className="bg-inset border border-border-default rounded-lg p-4 font-mono text-xs leading-relaxed">
        <pre className="text-[#aaaacc] whitespace-pre-wrap">{`External APIs → Server API Routes → Client Hooks → Components
                         (Next.js SSR proxy)   (React state)    (UI render)

┌──────────────┐    ┌──────────────────┐    ┌─────────────┐
│  SoSoValue   │───▶│  /api/signals    │───▶│ useSignals()│──▶ SignalsPage
│  (9 modules) │    │  (heuristic +    │    │ (60s auto-  │    KPICards
│              │    │   dynamic weight) │    │  refresh)   │
└──────────────┘    └──────────────────┘    └─────────────┘

┌──────────────┐    ┌──────────────────┐    ┌─────────────┐
│   SoDEX      │───▶│ /api/market/     │───▶│ useMarket() │──▶ PortfolioChart
│  (spot API)  │    │   [type]         │    │             │    TradeHistory
│              │    │ /api/orders/     │    │ useOrders() │──▶ OpenOrders
│              │    │ /api/balance/    │    │ useWallet() │──▶ WalletButton
└──────────────┘    └──────────────────┘    └─────────────┘

┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ AI Provider  │───▶│ /api/signals/    │───▶│ useAISignal()│──▶ AIReasoning
│ (11 providers│    │   analyze        │    │              │    SignalList
│  DeepSeek,   │    │ (POST with coin) │    │              │
│  OpenAI, etc)│    └──────────────────┘    └──────────────┘
└──────────────┘`}</pre>
      </div>

      <h3 className="text-lg font-bold text-white mt-6">Project Structure</h3>
      <CodeBlock>{`dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + PWA metadata + fonts
│   │   ├── page.tsx            # Main SPA orchestrator (client-side routing)
│   │   ├── providers.tsx       # WagmiProvider + QueryClientProvider
│   │   ├── globals.css         # Tailwind v4 + custom animations
│   │   └── api/
│   │       ├── signals/        # GET (scoring) + POST /analyze (AI)
│   │       ├── market/[type]   # SoDEX: tickers, klines, symbols
│   │       ├── orders/         # GET (list) + POST (place)
│   │       ├── orders/[id]     # DELETE (cancel)
│   │       ├── balance/        # SoDEX wallet balance
│   │       ├── performance/    # Multi-coin performance + klines
│   │       ├── sources/        # SoSoValue module status
│   │       └── status/         # SoDEX connection health
│   ├── components/             # All "use client" React components
│   │   ├── TopBar.tsx          # Header + status indicators
│   │   ├── Sidebar.tsx         # Desktop nav + mobile drawer
│   │   ├── MobileBottomNav.tsx # Mobile bottom tab bar
│   │   ├── WalletButton.tsx    # Connect/disconnect + balance
│   │   ├── TradeForm.tsx       # EIP-712 trade execution modal
│   │   ├── SignalsPage.tsx     # AI + heuristic signal analysis
│   │   ├── SignalList.tsx      # Signal table with confidence
│   │   ├── TradeHistory.tsx    # Orders + positions + signals
│   │   ├── OpenOrders.tsx      # Active SoDEX orders
│   │   ├── KPICards.tsx        # Dashboard stat cards
│   │   ├── PortfolioChart.tsx  # Kline price chart
│   │   ├── AIReasoning.tsx     # Signal rationale panel
│   │   ├── DataSources.tsx     # API module status grid
│   │   ├── PerformancePage.tsx # Signal accuracy tracking
│   │   ├── StrategyConfig.tsx  # Signal strategy settings
│   │   ├── SettingsPage.tsx    # AI provider + model config
│   │   ├── PWARegister.tsx     # Service worker registration
│   │   └── DocsPage.tsx        # This documentation page
│   └── lib/
│       ├── sosovalue.ts        # SoSoValue API client (server)
│       ├── sodex.ts            # SoDEX API client (server)
│       ├── sodex-types.ts      # SoDEX TypeScript types
│       ├── deepseek.ts         # AI chat completions client
│       ├── ai-providers.ts     # Provider registry (11 providers)
│       ├── eip712.ts           # EIP-712 typed data domain
│       ├── wallet-config.ts    # ValueChain + wagmi config
│       ├── pair-map.ts         # Display pair ↔ SoDEX symbol
│       ├── chart-drawings/     # Drawing tool types, storage, math
│       ├── hooks/
│       │   ├── useSignals.ts       # Hook: heuristic scoring
│       │   ├── useSignalGeneration.ts # Hook: AI signal generation
│       │   ├── useMarket.ts        # Hook: SoDEX market data
│       │   ├── useTradeExecution.ts # Hook: order CRUD
│       │   ├── useWallet.ts        # Hook: wallet state
│       │   ├── usePerformance.ts   # Hook: performance data
│       │   ├── useDataSources.ts   # Hook: source health
│       │   ├── useStatus.ts        # Hook: connection health
│       │   ├── useAIConfig.ts      # Hook: AI provider config
│       │   ├── useSignalHistory.ts # Hook: signal accuracy tracking
│       │   └── useChartDrawings.ts # Hook: chart drawing tools
│       ├── types/
│       │   ├── signal.ts           # Signal, dimensions, execution types
│       │   ├── trade.ts            # SoDEX types (ticker, kline, order)
│       │   └── datasource.ts       # AI provider, config types
│       └── api/
│           ├── signals.ts          # Client-side signal fetchers
│           ├── dashboard-metrics.ts # Dashboard KPI computations
│           ├── datasources.ts      # Data source fetchers
│           ├── trades.ts           # Trade API helpers
│           └── no-cache.ts         # JSON response helper
└── public/
    ├── icons/                  # PWA app icons (192px, 512px)
    ├── manifest.json           # PWA manifest
    └── sw.js                   # Service worker`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-6">Key Design Decisions</h3>
      <ul className="text-[#aaaacc] space-y-3">
        <li>
          <strong className="text-white">All server-side API proxying.</strong> Environment variables never reach the browser.
          Every external API call goes through a Next.js route handler, keeping API keys server-side only.
        </li>
        <li>
          <strong className="text-white">User-owned AI keys.</strong> The AI provider and API key are stored in localStorage
          and sent to the server per-request. The server never persists user API keys — they flow through
          the request body only.
        </li>
        <li>
          <strong className="text-white">EIP-712 typed signing.</strong> Trade orders use EIP-712 typed data signatures,
          not raw transaction signing. This provides human-readable order confirmation and prevents
          blind-signing attacks.
        </li>
        <li>
          <strong className="text-white">Dual connector wallet.</strong> <code className="text-accent bg-[#1E293B] px-1 rounded">injected()</code> for
          desktop MetaMask and <code className="text-accent bg-[#1E293B] px-1 rounded">walletConnect()</code> for mobile —
          auto-detected based on environment.
        </li>
        <li>
          <strong className="text-white">In-memory caching.</strong> Signal data is cached for 60 seconds
          server-side to avoid rate-limiting SoSoValue and SoDEX APIs on rapid refreshes.
        </li>
      </ul>
    </div>
  );
}

function SignalEngine() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Signal Engine</h2>
      <p className="text-[#aaaacc]">
        The Signal Engine is the core intelligence layer — a{" "}
        <strong className="text-white">multi-dimensional scoring system</strong> that aggregates
        five independent data dimensions into a unified confidence score, then feeds that data
        to an AI agent for final synthesis.
      </p>

      <h3 className="text-lg font-bold text-white mt-6">Five Signal Dimensions</h3>
      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Dimension</th>
            <th className="py-2 pr-4">Source</th>
            <th className="py-2 pr-4">Weight</th>
            <th className="py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["ETF Flow", "SoSoValue /etfs/*", "20%", "Institutional capital rotation via BTC/ETH ETF net flows, cumulative inflows, and AUM trends"],
            ["Sentiment", "SoSoValue /news/hot", "20%", "News headline NLP — bullish/bearish keyword ratio, headline volume, matched currency tags"],
            ["Macro", "SoSoValue /macro/events", "20%", "Fed calendar events, CPI releases, yield curve signals, employment data impact on risk assets"],
            ["Momentum", "SoDEX /markets/*", "20%", "Price action via klines, 24h change %, volume analysis, market cap rank"],
            ["Treasury", "SoSoValue /btc-treasuries", "20%", "Public company BTC holdings, institutional adoption signals, purchase activity"],
          ].map(([d, s, w, desc]) => (
            <tr key={d} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 text-white font-semibold">{d}</td>
              <td className="py-2 pr-4 font-mono text-accent text-xs">{s}</td>
              <td className="py-2 pr-4 text-[#aaaacc]">{w}</td>
              <td className="py-2 text-[#aaaacc]">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-bold text-white mt-8">Heuristic Scoring (Phase 1)</h3>
      <p className="text-[#aaaacc]">
        Before the AI agent runs, a deterministic heuristic layer computes baseline scores (0–100) for each dimension:
      </p>

      <div className="space-y-4 mt-4">
        <DimensionScoring
          name="ETF Flow Scoring"
          formula="50 + (inflow ? 30 : -20) + min(20, log₁₀(|flow| + 1) × 5)"
          desc="Net inflows shift the baseline up; outflows shift it down. Magnitude is dampened logarithmically to prevent single-day outliers from dominating."
        />
        <DimensionScoring
          name="Sentiment Scoring"
          formula="30 + (bullish / (bearish + bullish)) × 50 + min(20, article_count × 2)"
          desc="Bullish/bearish ratio from keyword matching on headlines and content. Volume bonus for high news coverage days."
        />
        <DimensionScoring
          name="Macro Scoring"
          formula="50 + (events > 5 ? 20 : events > 2 ? 10 : 0)"
          desc="Counts macro events scheduled for the current day. High-event days get a modest boost reflecting increased market attention."
        />
        <DimensionScoring
          name="Momentum Scoring"
          formula="50 + clamp(-40, 40, 24h_change% × 8)"
          desc="Linear mapping of 24h price change to a score. -5% ≈ score 10; +5% ≈ score 90. Clamped to [0, 100]."
        />
        <DimensionScoring
          name="Treasury Scoring"
          formula="50 + company_count × 3"
          desc="Each public company holding BTC adds 3 points. More institutional holders = higher adoption signal."
        />
      </div>

      <h3 className="text-lg font-bold text-white mt-8">Dynamic Weight Engine (Phase 2)</h3>
      <p className="text-[#aaaacc]">
        After heuristic scoring, a <strong className="text-white">dynamic weight engine</strong> adjusts
        dimension weights based on statistical dispersion:
      </p>
      <ol className="text-[#aaaacc] space-y-2 ml-4">
        <li>
          <strong className="text-white">Compute mean and standard deviation</strong> across all 5 dimension scores.
        </li>
        <li>
          <strong className="text-white">Detect outliers</strong> — any dimension whose score deviates
          more than <strong>1.5 standard deviations</strong> from the mean (and std dev &gt; 8).
        </li>
        <li>
          <strong className="text-white">Cap outliers at 8% weight</strong> — prevents a single anomalous
          dimension from skewing the overall signal.
        </li>
        <li>
          <strong className="text-white">Redistribute freed weight</strong> proportionally to non-capped
          dimensions based on their individual scores.
        </li>
        <li>
          <strong className="text-white">Compute weighted final score</strong> — each dimension&apos;s
          score × its dynamic weight, summed and rounded.
        </li>
      </ol>

      <div className="bg-inset border border-border-default rounded-lg p-4 mt-4">
        <p className="text-xs text-txt-muted font-mono m-0">
          Example: If ETF Flow scores 95 but Sentiment is 45 (std dev = 22), ETF Flow gets capped at
          8% and its excess 12% weight is redistributed to Sentiment, Macro, Momentum, and Treasury proportionally.
        </p>
      </div>

      <h3 className="text-lg font-bold text-white mt-8">Weight Visibility</h3>
      <p className="text-[#aaaacc]">
        The Signals page displays <strong className="text-white">per-coin dynamic weights</strong> and
        highlights <strong className="text-hold">capped dimensions in amber</strong> so users can see
        which data sources are being downweighted due to outlier behavior. The overall score and weight
        breakdown are visible for BTC, ETH, and SOL.
      </p>
    </div>
  );
}

function AIAgents() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">AI Signal Agent</h2>
      <p className="text-[#aaaacc]">
        The AI Signal Agent takes raw market data and produces a structured trading signal with
        per-dimension reasoning and an executable trade plan. It is invoked on-demand by the user
        via the Dashboard or Signals page.
      </p>

      <h3 className="text-lg font-bold text-white mt-6">Multi-Provider Architecture</h3>
      <p className="text-[#aaaacc]">
        Users choose their AI provider and bring their own API key (stored in localStorage).
        The server-side route handler accepts user provider configuration per-request.
      </p>

      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Provider</th>
            <th className="py-2 pr-4">Base URL</th>
            <th className="py-2 pr-4">Default Model</th>
            <th className="py-2">Available Models</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["DeepSeek", "api.deepseek.com/v1", "deepseek-chat", "deepseek-chat, deepseek-reasoner"],
            ["OpenAI", "api.openai.com/v1", "gpt-4o", "gpt-4o, gpt-4.1, o3-mini, o1"],
            ["Anthropic (Claude)", "api.anthropic.com/v1", "claude-sonnet-4", "opus-4, sonnet-4, 3.5-haiku"],
            ["Google (Gemini)", "generativelanguage.googleapis.com", "gemini-2.5-pro", "gemini-2.5-pro, 2.5-flash, 2.0-flash"],
            ["xAI (Grok)", "api.x.ai/v1", "grok-3", "grok-3, grok-3-mini, grok-2"],
            ["Xiaomi (MiMo)", "api.xiaomi.com/v1", "mimo-v2.5-pro", "mimo-v2.5-pro, mimo-v2.5-flash"],
            ["Zhipu AI (GLM)", "open.bigmodel.cn/api/paas/v4", "glm-4-plus", "glm-4-plus, glm-4-flash, glm-4-long"],
            ["Alibaba (Qwen)", "dashscope.aliyuncs.com", "qwen-max", "qwen-max, qwen-plus, qwen-turbo"],
            ["Mistral AI", "api.mistral.ai/v1", "mistral-large", "mistral-large, codestral, mistral-small"],
            ["Groq", "api.groq.com/openai/v1", "llama-3.3-70b", "llama-3.3, mixtral, gemma2"],
            ["OpenRouter", "openrouter.ai/api/v1", "openai/gpt-4o", "All providers via gateway"],
          ].map(([p, u, d, m]) => (
            <tr key={p} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 text-white font-semibold">{p}</td>
              <td className="py-2 pr-4 font-mono text-accent text-xs">{u}</td>
              <td className="py-2 pr-4 font-mono text-[#aaaacc]">{d}</td>
              <td className="py-2 font-mono text-[#aaaacc] text-xs">{m}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-bold text-white mt-8">AI Prompt Structure</h3>
      <p className="text-[#aaaacc]">
        The prompt is a structured template with five data sections:
      </p>
      <ol className="text-[#aaaacc] space-y-2 ml-4">
        <li><strong className="text-white">Price Data</strong> — current price, 24h change, volume (from SoDEX ticker + SoSoValue snapshot)</li>
        <li><strong className="text-white">ETF Flow Data</strong> — last 3 days of net inflows, AUM, cumulative flows</li>
        <li><strong className="text-white">Hot News Headlines</strong> — up to 8 recent headlines from SoSoValue</li>
        <li><strong className="text-white">Macro Events</strong> — today&apos;s macro calendar (Fed, CPI, etc.)</li>
        <li><strong className="text-white">BTC Treasury Holdings</strong> — top 5 public companies with BTC on balance sheet</li>
      </ol>

      <h3 className="text-lg font-bold text-white mt-8">AI Output Schema</h3>
      <p className="text-[#aaaacc]">
        The AI must return valid JSON matching this structure:
      </p>
      <CodeBlock>{`{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "reasoning": "<2-4 sentence thesis>",
  "dimensions": {
    "etfFlow":    { "score": <0-100>, "detail": "<specific to data>" },
    "sentiment":  { "score": <0-100>, "detail": "<news sentiment>" },
    "macro":      { "score": <0-100>, "detail": "<macro conditions>" },
    "momentum":   { "score": <0-100>, "detail": "<price action>" },
    "treasury":   { "score": <0-100>, "detail": "<institutional>" }
  },
  "execution": {
    "orderType": "Limit Buy on SoDEX | Limit Sell | No action",
    "entry": <current price>,
    "takeProfit": <number | 0 for HOLD>,
    "stopLoss": <number | 0 for HOLD>,
    "positionSize": "<X% of portfolio>",
    "riskReward": "<1 : X.XX | —>"
  }
}`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-8">AI Generation Flow</h3>
      <div className="bg-inset border border-border-default rounded-lg p-4 font-mono text-xs leading-relaxed">
        <pre className="text-[#aaaacc] whitespace-pre-wrap">{`User clicks "Generate Signal" for BTC
        │
        ▼
POST /api/signals/analyze { coin: "BTC", provider, model, apiKey }
        │
        ▼
Server gathers 5 data sources in parallel:
  ├─ SoSoValue: currencies, ETF summary, macro events, BTC treasuries, hot news
  └─ SoDEX: tickers (for live vBTC_vUSDC price)
        │
        ▼
Build structured prompt with raw data (NOT heuristic scores)
        │
        ▼
Call AI provider (user's config or server DeepSeek fallback)
  ├─ OpenAI-compatible: response_format = json_object (for supported providers)
  └─ OpenAI/OpenRouter: standard chat completion
        │
        ▼
Strip markdown fences, parse JSON, validate shape
        │
        ▼
Return enriched signal: { ...parsed, pair, price, sources[], generated }`}</pre>
      </div>

      <h3 className="text-lg font-bold text-white mt-8">Response Processing</h3>
      <ul className="text-[#aaaacc] space-y-2">
        <li>Markdown code fences (<code className="text-accent bg-[#1E293B] px-1 rounded">```json</code>) are stripped before parsing</li>
        <li>Required fields (action, confidence, dimensions, execution) are validated</li>
        <li>Missing fields throw a 502 error with descriptive message</li>
        <li>AI-generated signal is tagged with the source data and generation timestamp</li>
      </ul>
    </div>
  );
}

function RiskEngine() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Risk Engine</h2>
      <p className="text-[#aaaacc]">
        Risk management is enforced at multiple layers — from signal generation constraints
        to order execution guardrails.
      </p>

      <h3 className="text-lg font-bold text-white mt-6">AI-Level Risk Guardrails</h3>
      <p className="text-[#aaaacc]">
        The AI prompt enforces risk rules structurally:
      </p>
      <ul className="text-[#aaaacc] space-y-3 ml-4">
        <li>
          <strong className="text-white">Take-profit and stop-loss are mandatory.</strong> Every BUY/SELL signal
          must include concrete TP and SL levels. The AI cannot output null for these fields.
        </li>
        <li>
          <strong className="text-white">Directional consistency check.</strong> For BUY: TP &gt; entry &gt; SL.
          For SELL: SL &gt; entry &gt; TP. The AI prompt explicitly validates this.
        </li>
        <li>
          <strong className="text-white">HOLD signals have zeroed execution.</strong> When the AI determines
          no trade, TP/SL are set to 0 and position size is &quot;—&quot;.
        </li>
        <li>
          <strong className="text-white">Default 5% TP/SL spread.</strong> The prompt instructs the AI to use
          price × 1.05 for take-profit and price × 0.95 for stop-loss as sensible defaults.
        </li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-8">Heuristic Risk Controls</h3>
      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Control</th>
            <th className="py-2 pr-4">Mechanism</th>
            <th className="py-2">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Dynamic outlier capping", "Dimensions >1.5σ from mean capped at 8% weight", "Prevents single anomalous data point from dominating signal"],
            ["Score clamping", "All dimension scores clamped to [0, 100]", "Prevents extreme values from breaking the weighted average"],
            ["60s cache TTL", "In-memory server cache on /api/signals", "Prevents rate limiting and ensures data consistency"],
            ["Signal history resolution", "1-hour delay before signals are evaluated for accuracy", "Ensures sufficient price movement for meaningful accuracy assessment"],
          ].map(([c, m, p]) => (
            <tr key={c} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 text-white font-semibold">{c}</td>
              <td className="py-2 pr-4 text-[#aaaacc] text-xs">{m}</td>
              <td className="py-2 text-[#aaaacc]">{p}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-bold text-white mt-8">Execution-Level Safety</h3>
      <ul className="text-[#aaaacc] space-y-2 ml-4">
        <li>
          <strong className="text-white">One active order per pair.</strong> The Execute button is disabled
          when an open order exists for the same SoDEX symbol, preventing duplicate entries.
        </li>
        <li>
          <strong className="text-white">Wallet connection required.</strong> Trading UI shows &quot;Connect Wallet&quot;
          until a wallet is connected, preventing accidental execution attempts.
        </li>
        <li>
          <strong className="text-white">EIP-712 human-readable signing.</strong> Users see the exact order
          parameters (symbol, side, type, quantity, timestamp) before signing — no blind transaction signing.
        </li>
        <li>
          <strong className="text-white">Network detection.</strong> The UI detects wrong networks and
          offers chain switching or wallet disconnection.
        </li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-8">Signal Accuracy Tracking</h3>
      <p className="text-[#aaaacc]">
        Every AI-generated signal is recorded to localStorage with its dimensions, price, and timestamp.
        After 1 hour, signals are resolved against live ticker prices:
      </p>
      <ul className="text-[#aaaacc] space-y-1 ml-4">
        <li><strong className="text-white">BUY correct</strong> if current price &gt; signal price</li>
        <li><strong className="text-white">SELL correct</strong> if current price &lt; signal price</li>
        <li><strong className="text-white">HOLD correct</strong> if price moved &lt; 2%</li>
      </ul>
      <p className="text-[#aaaacc] mt-2">
        Accuracy stats (total resolved, correct, percentage) are displayed on the Performance page,
        with per-coin breakdowns.
      </p>
    </div>
  );
}

function DataPipeline() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Data Pipeline</h2>

      <h3 className="text-lg font-bold text-white mt-4">Sources &amp; Integrations</h3>

      <h4 className="text-md font-bold text-white mt-6">1. SoSoValue API</h4>
      <p className="text-[#aaaacc]">
        Primary market intelligence source. Server-side client at{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">src/lib/sosovalue.ts</code>.
      </p>
      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Module</th>
            <th className="py-2 pr-4">Endpoint</th>
            <th className="py-2">Data</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Currencies", "GET /currencies", "Currency list with IDs, symbols, names"],
            ["Market Snapshot", "GET /currencies/:id/market-snapshot", "Price, 24h change, volume, market cap, ATH"],
            ["Klines", "GET /currencies/:id/klines", "OHLCV candles (1d interval, 100 limit)"],
            ["ETF Summary", "GET /etfs/summary-history", "Daily net inflow, value traded, net assets, cumulative inflow"],
            ["ETF List", "GET /etfs", "ETF tickers by crypto symbol + country code"],
            ["Macro Events", "GET /macro/events", "Economic calendar events by date"],
            ["BTC Treasuries", "GET /btc-treasuries", "Public companies holding BTC"],
            ["Purchase History", "GET /btc-treasuries/:ticker/purchase-history", "Per-company BTC acquisition timeline"],
            ["Hot News", "GET /news/hot", "Paginated news with currency tags and sentiment signals"],
            ["Index Snapshot", "GET /indices/:ticker/market-snapshot", "SoSoValue sector index performance"],
          ].map(([m, e, d]) => (
            <tr key={m} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 text-white font-semibold">{m}</td>
              <td className="py-2 pr-4 font-mono text-accent text-xs">{e}</td>
              <td className="py-2 text-[#aaaacc] text-xs">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="text-md font-bold text-white mt-8">2. SoDEX API</h4>
      <p className="text-[#aaaacc]">
        Spot trading and market data. Server-side client at{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">src/lib/sodex.ts</code>.
        Types at <code className="text-accent bg-[#1E293B] px-1 rounded">src/lib/sodex-types.ts</code>{" "}
        (separated so client components can import types without server env refs).
      </p>
      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Endpoint</th>
            <th className="py-2 pr-4">Auth</th>
            <th className="py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["GET /markets/tickers", "Public", "Live tickers for all or specific symbol. Returns lastPx, changePct, quoteVolume, highPx, lowPx"],
            ["GET /markets/:symbol/klines", "Public", "OHLCV candles with configurable interval (1m, 5m, 15m, 1h, 4h, 1d)"],
            ["GET /markets/symbols", "Public", "Available trading pairs with base/quote asset details"],
            ["GET /markets/:symbol/orderbook", "Public", "Bid/ask depth with price and quantity levels"],
            ["POST /orders", "x-api-key", "Place new order (EIP-712 signed). Returns order with status, filled qty, avg price"],
            ["GET /orders", "x-api-key", "List all orders for authenticated account"],
            ["DELETE /orders/:id", "x-api-key", "Cancel an open order by ID"],
            ["GET /accounts/:address/state", "x-api-key", "Account state including balances array"],
          ].map(([e, a, d]) => (
            <tr key={e} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 font-mono text-accent text-xs">{e}</td>
              <td className="py-2 pr-4">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${a === "Public" ? "bg-[#00ff8815] text-buy" : "bg-[#ff880015] text-hold"}`}>
                  {a}
                </span>
              </td>
              <td className="py-2 text-[#aaaacc] text-xs">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="text-md font-bold text-white mt-8">3. AI Providers</h4>
      <p className="text-[#aaaacc]">
        Chat completions client at{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">src/lib/deepseek.ts</code>.
        Despite the filename, it supports any OpenAI-compatible chat completions endpoint.
      </p>
      <ul className="text-[#aaaacc] space-y-1 ml-4">
        <li>Temperature: 0.3 (low, for consistent structured output)</li>
        <li>Max tokens: 1500</li>
        <li>DeepSeek: uses <code className="text-accent bg-[#1E293B] px-1 rounded">response_format: json_object</code> for guaranteed JSON. Other providers use standard chat completion format.</li>
        <li>OpenAI/OpenRouter: standard chat completion without JSON mode enforcement</li>
        <li>Server fallback: <code className="text-accent bg-[#1E293B] px-1 rounded">DEEPSEEK_API_KEY</code> env var</li>
        <li>User override: provider, model, and apiKey passed in request body</li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-8">Pair Mapping</h3>
      <p className="text-[#aaaacc]">
        The app translates between display pairs (BTC/USDC) and SoDEX symbols (vBTC_vUSDC) via{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">src/lib/pair-map.ts</code>.
        Currently supports 9 assets: BTC, ETH, SOL, AVAX, LINK, DOGE, ADA, XRP, BNB.
      </p>

      <h3 className="text-lg font-bold text-white mt-8">Caching Strategy</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CacheCard
          layer="Server"
          route="/api/signals"
          ttl="60 seconds"
          strategy="In-memory object cache. Returns stale data within TTL window to avoid rate-limiting upstream APIs."
        />
        <CacheCard
          layer="Client"
          route="useSignals()"
          ttl="60 seconds"
          strategy="setInterval polling. Refetches every 60s. Cleanup on unmount via clearInterval."
        />
        <CacheCard
          layer="Client"
          route="usePerformance()"
          ttl="5 minutes"
          strategy="Slower polling for compute-heavy multi-coin kline aggregation."
        />
        <CacheCard
          layer="Client"
          route="useOrders()"
          ttl="Manual refresh"
          strategy="On-demand refresh after order placement/cancellation. No auto-polling."
        />
      </div>
    </div>
  );
}

function TradingExecution() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Trading &amp; Execution</h2>

      <h3 className="text-lg font-bold text-white mt-4">Order Flow</h3>
      <div className="bg-inset border border-border-default rounded-lg p-4 font-mono text-xs leading-relaxed">
        <pre className="text-[#aaaacc] whitespace-pre-wrap">{`User clicks "Execute" on a signal
        │
        ▼
TradeForm modal opens:
  ├─ Signal details (pair, action, confidence, entry/TP/SL)
  ├─ Live ticker price from SoDEX
  ├─ Quantity input with 25/50/75/100% quick-fill buttons
  └─ "Sign & Place Order" button
        │
        ▼
1. Build EIP-712 typed data:
   { symbol, side, orderType, quantity, timestamp }
        │
        ▼
2. Request wallet signature via wagmi signTypedData:
   domain: { name: "spot", version: "1", chainId: 286623,
             verifyingContract: "0x00...00" }
        │
        ▼
3. User signs in MetaMask/WalletConnect
   (sees human-readable order details)
        │
        ▼
4. POST /api/orders { order + signature }
   Server forwards to SoDEX POST /orders with x-api-key
        │
        ▼
5. SoDEX creates order → returns order with status "NEW"
        │
        ▼
6. Order list refreshes → OpenOrders panel updates
   TradeHistory page shows order in table with status badge`}</pre>
      </div>

      <h3 className="text-lg font-bold text-white mt-8">EIP-712 Typed Data</h3>
      <p className="text-[#aaaacc]">
        Orders use EIP-712 typed data signing (not raw transaction signing). Defined in{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">src/lib/eip712.ts</code>:
      </p>
      <CodeBlock>{`// Domain
{ name: "spot", version: "1", chainId: 286623,
  verifyingContract: "0x0000000000000000000000000000000000000000" }

// Types
NewOrder: [
  { name: "symbol",     type: "string" },
  { name: "side",       type: "string" },   // "BUY" | "SELL"
  { name: "orderType",  type: "string" },   // "LIMIT" | "IOC"
  { name: "quantity",   type: "string" },
  { name: "timestamp",  type: "uint256" },
]`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-8">Order Types</h3>
      <ul className="text-[#aaaacc] space-y-2 ml-4">
        <li>
          <strong className="text-white">LIMIT orders</strong> — placed at the signal&apos;s entry price.
          Remain on the order book until filled or canceled.
        </li>
        <li>
          <strong className="text-white">IOC (Immediate-or-Cancel)</strong> — fill immediately at best available
          price, cancel any unfilled portion. Suitable for market entry/exit.
        </li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-8">Order Management</h3>
      <ul className="text-[#aaaacc] space-y-2 ml-4">
        <li>
          <strong className="text-white">Open Orders panel</strong> — shows active orders (NEW, PARTIALLY_FILLED)
          with cancel button. Color-coded status badges.
        </li>
        <li>
          <strong className="text-white">Trade History page</strong> — full order table with status,
          filled quantity, average price, timestamp. One-row-per-action layout. Cancel action for open orders.
        </li>
        <li>
          <strong className="text-white">Duplicate prevention</strong> — &quot;Execute&quot; button shows &quot;Order Open&quot;
          when an active order exists for the same symbol, preventing accidental double-entry.
        </li>
      </ul>
    </div>
  );
}

function WalletInfrastructure() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Wallet Infrastructure</h2>

      <h3 className="text-lg font-bold text-white mt-4">Connection Architecture</h3>
      <p className="text-[#aaaacc]">
        Dual-connector setup via wagmi v3. Config at{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">src/lib/wallet-config.ts</code>:
      </p>
      <ul className="text-[#aaaacc] space-y-3 ml-4">
        <li>
          <strong className="text-white">Injected connector</strong> — detects <code className="text-accent bg-[#1E293B] px-1 rounded">window.ethereum</code>{" "}
          for MetaMask, Rabby, and other browser wallets. Always available.
        </li>
        <li>
          <strong className="text-white">WalletConnect v2 connector</strong> — QR code modal for mobile wallets
          (MetaMask Mobile, Trust Wallet, etc.). Enabled when{" "}
          <code className="text-accent bg-[#1E293B] px-1 rounded">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> is set.
        </li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-6">ValueChain Network</h3>
      <CodeBlock>{`defineChain({
  id: 286623,
  name: "ValueChain",
  nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.valuechain.xyz"] },
  },
})`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-6">Wallet Features</h3>
      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Feature</th>
            <th className="py-2">Implementation</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Connect", "wagmi useConnect with injected + WalletConnect connectors"],
            ["Disconnect", "wagmi useDisconnect — clears session, resets state"],
            ["Balance", "Live SOSO balance from SoDEX account state via /api/balance"],
            ["Address display", "Truncated (0x1234...abcd) in TopBar, Trading page, and TradeForm"],
            ["Network detection", "Checks chainId === 286623. Shows \"Wrong Network\" with switch/disconnect options"],
            ["EIP-712 signing", "wagmi useSignTypedData with domain+types from eip712.ts"],
            ["Quick-fill", "TradeForm: 25/50/75/100% of balance as quantity presets"],
            ["Persistence", "wagmi cookie storage for SSR-safe reconnection on page reload"],
          ].map(([f, i]) => (
            <tr key={f} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 text-white font-semibold">{f}</td>
              <td className="py-2 text-[#aaaacc] text-sm">{i}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-bold text-white mt-8">Component: WalletButton</h3>
      <p className="text-[#aaaacc]">
        Located in the TopBar. Three states:
      </p>
      <ul className="text-[#aaaacc] space-y-1 ml-4">
        <li><strong className="text-accent">Disconnected:</strong> Shows &quot;Connect Wallet&quot; button</li>
        <li><strong className="text-buy">Connected (correct network):</strong> Shows truncated address + SOSO balance. Click opens dropdown with Copy Address, View Balance, Disconnect</li>
        <li><strong className="text-hold">Wrong network:</strong> Shows &quot;Wrong Network&quot; with Switch Network and Disconnect options</li>
      </ul>

      <div className="bg-[#00E5A810] border border-accent-dim rounded-lg p-4 mt-6">
        <p className="text-sm text-[#aaaacc] m-0">
          <strong className="text-white">Security note:</strong> Private keys never leave the wallet.
          The app only requests EIP-712 signatures for order data. No raw transactions, no token approvals,
          no key export. All trading is non-custodial.
        </p>
      </div>
    </div>
  );
}

function APIReference() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">API Reference</h2>
      <p className="text-[#aaaacc]">
        All external APIs are proxied through Next.js API routes in{" "}
        <code className="text-accent bg-[#1E293B] px-1 rounded">src/app/api/</code>.
        This keeps API keys server-side and enables rate limiting, caching, and error normalization.
      </p>

      <h3 className="text-lg font-bold text-white mt-6">GET /api/signals</h3>
      <p className="text-[#aaaacc]">
        Fetches live data from SoSoValue, computes heuristic 5-dimension scores with dynamic weights.
      </p>
      <p className="text-xs text-txt-muted">Cache: 60 seconds in-memory · Rate: auto-refreshed client-side every 60s</p>
      <h4 className="text-sm font-bold text-white mt-3">Response</h4>
      <CodeBlock>{`{
  "updated": 1716153600000,
  "sources": {
    "etf": true,
    "macro": true,
    "treasuries": true,
    "news": true,
    "snapshots": 3
  },
  "dimensions": {
    "BTC": { "etfFlow": { score, detail }, "sentiment": {...}, ... },
    "ETH": { ... },
    "SOL": { ... }
  },
  "overall": { "BTC": 78, "ETH": 72, "SOL": 65 },
  "weights": {
    "BTC": { "etfFlow": 20, "sentiment": 24, "macro": 20, "momentum": 20, "treasury": 16 },
    ...
  },
  "capped": {
    "BTC": ["etfFlow"],  // dimensions capped at 8% for outlier behavior
    ...
  }
}`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-8">POST /api/signals/analyze</h3>
      <p className="text-[#aaaacc]">
        Gathers live data, builds structured prompt, calls AI provider, returns parsed signal.
      </p>
      <h4 className="text-sm font-bold text-white mt-3">Request Body</h4>
      <CodeBlock>{`{
  "coin": "BTC",              // required: BTC, ETH, or SOL
  "provider": "...",          // optional: user's AI base URL
  "model": "...",             // optional: user's AI model
  "apiKey": "sk-..."          // optional: user's AI API key
}`}</CodeBlock>
      <h4 className="text-sm font-bold text-white mt-3">Response</h4>
      <CodeBlock>{`{
  "action": "BUY",
  "confidence": 87,
  "reasoning": "BTC ETF inflows surged...",
  "dimensions": {
    "etfFlow":    { "score": 92, "detail": "ETF inflow $520M in 24h..." },
    "sentiment":  { "score": 85, "detail": "News sentiment 85% bullish..." },
    "macro":      { "score": 78, "detail": "Fed holding rates steady..." },
    "momentum":   { "score": 82, "detail": "BTC +3.2% with strong volume..." },
    "treasury":   { "score": 90, "detail": "12 public companies accumulating..." }
  },
  "execution": {
    "orderType": "Limit Buy on SoDEX",
    "entry": 68420,
    "takeProfit": 71841,
    "stopLoss": 64999,
    "positionSize": "5% of portfolio",
    "riskReward": "1 : 1.21"
  },
  "coin": "BTC",
  "pair": "BTC/USDC",
  "price": 68420,
  "change24h": 3.2,
  "generated": 1716153600000,
  "sources": ["ETF Module (SoSoValue)", "News Feeds (SoSoValue)", ...]
}`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-8">GET /api/market/[type]</h3>
      <p className="text-[#aaaacc]">Proxies SoDEX market data endpoints.</p>
      <table className="w-full text-sm mt-2 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Query Params</th>
            <th className="py-2">Returns</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["tickers", "symbol? (e.g. vBTC_vUSDC)", "SoDEXTicker[] — lastPx, changePct, volume"],
            ["klines", "symbol, interval? (1h), limit?", "SoDEXKline[] — OHLCV candles"],
            ["symbols", "symbol?", "SoDEXSymbol[] — available pairs"],
          ].map(([t, q, r]) => (
            <tr key={t} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 font-mono text-accent">{t}</td>
              <td className="py-2 pr-4 text-[#aaaacc] text-xs">{q}</td>
              <td className="py-2 text-[#aaaacc] text-xs">{r}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-bold text-white mt-8">GET /api/orders</h3>
      <p className="text-[#aaaacc]">Fetches all orders for the authenticated account via SoDEX.</p>

      <h3 className="text-lg font-bold text-white mt-6">POST /api/orders</h3>
      <p className="text-[#aaaacc]">Places a new order on SoDEX with EIP-712 signature.</p>

      <h3 className="text-lg font-bold text-white mt-6">DELETE /api/orders/[id]</h3>
      <p className="text-[#aaaacc]">Cancels an open order by ID on SoDEX.</p>

      <h3 className="text-lg font-bold text-white mt-8">GET /api/balance</h3>
      <p className="text-[#aaaacc]">
        Fetches account balances for a wallet address. Query: <code className="text-accent bg-[#1E293B] px-1 rounded">?address=0x...</code>
      </p>

      <h3 className="text-lg font-bold text-white mt-6">GET /api/performance</h3>
      <p className="text-[#aaaacc]">Multi-coin performance data with 30-day klines for BTC, ETH, SOL.</p>

      <h3 className="text-lg font-bold text-white mt-6">GET /api/sources</h3>
      <p className="text-[#aaaacc]">SoSoValue API module status — which modules are returning data.</p>

      <h3 className="text-lg font-bold text-white mt-6">GET /api/status</h3>
      <p className="text-[#aaaacc]">SoDEX connection health check.</p>

      <h3 className="text-lg font-bold text-white mt-8">Error Handling</h3>
      <p className="text-[#aaaacc]">All API routes follow a consistent error pattern:</p>
      <ul className="text-[#aaaacc] space-y-1 ml-4">
        <li><strong className="text-white">400</strong> — invalid input (e.g., unsupported coin)</li>
        <li><strong className="text-white">404</strong> — unknown route/market type</li>
        <li><strong className="text-white">502</strong> — upstream API failure (SoSoValue, SoDEX, or AI provider)</li>
      </ul>
      <p className="text-[#aaaacc] text-xs mt-2">
        Error responses include <code className="text-accent bg-[#1E293B] px-1 rounded">{`{ "error": "human-readable message" }`}</code>.
        Upstream errors are caught per-source (individual Promise failures don&apos;t crash the route).
      </p>
    </div>
  );
}

function Deployment() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Deployment</h2>

      <h3 className="text-lg font-bold text-white mt-4">Vercel</h3>
      <p className="text-[#aaaacc]">
        SignalFlow Agent is deployed on <strong className="text-white">Vercel</strong> with automatic CI/CD
        from the <code className="text-accent bg-[#1E293B] px-1 rounded">main</code> branch.
        Every push triggers a production build.
      </p>
      <ul className="text-[#aaaacc] space-y-1 ml-4">
        <li><strong className="text-white">Project:</strong> dashboard</li>
        <li><strong className="text-white">Organization:</strong> team_tUzAbpJU8X4n5mrQJV03eZm9</li>
        <li><strong className="text-white">Framework:</strong> Next.js (auto-detected by Vercel)</li>
        <li><strong className="text-white">Build command:</strong> next build (auto-detected)</li>
        <li><strong className="text-white">Output directory:</strong> .next (auto-detected)</li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-6">Environment Variables on Vercel</h3>
      <p className="text-[#aaaacc]">
        Set these in the Vercel project dashboard (Settings → Environment Variables):
      </p>
      <CodeBlock>{`SOSOVALUE_API_KEY=SOSO-...
DEEPSEEK_API_KEY=sk-...
SODEX_NETWORK=mainnet
SODEX_API_KEY_NAME=SignalFlowAgent
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...`}</CodeBlock>

      <h3 className="text-lg font-bold text-white mt-6">Build Configuration</h3>
      <CodeBlock>{`// next.config.ts
import type { NextConfig } from "next";
const config: NextConfig = {};
export default config;`}</CodeBlock>
      <p className="text-[#aaaacc] text-xs mt-2">
        No special Next.js configuration needed. Vercel auto-detects Next.js and
        applies optimal defaults (ISR, edge caching, image optimization).
      </p>

      <h3 className="text-lg font-bold text-white mt-6">PWA Configuration</h3>
      <p className="text-[#aaaacc]">
        The app is a Progressive Web App with:
      </p>
      <ul className="text-[#aaaacc] space-y-1 ml-4">
        <li><strong className="text-white">manifest.json</strong> — app name, icons (192px + 512px), standalone display, theme color</li>
        <li><strong className="text-white">sw.js</strong> — basic offline service worker with cache-first strategy</li>
        <li><strong className="text-white">Apple Web App meta tags</strong> — black-translucent status bar, apple-touch-icon</li>
        <li><strong className="text-white">PWARegister component</strong> — client-only service worker registration in layout.tsx</li>
      </ul>

      <h3 className="text-lg font-bold text-white mt-6">Production Health</h3>
      <ul className="text-[#aaaacc] space-y-1 ml-4">
        <li>SoDEX status indicator in TopBar (green dot = connected, red = error)</li>
        <li>API route health: GET /api/status returns SoDEX connection state</li>
        <li>Graceful degradation: all components work with mock data when APIs are unreachable</li>
      </ul>
    </div>
  );
}

function Roadmap() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <h2 className="text-2xl font-bold text-white">Roadmap</h2>

      <h3 className="text-lg font-bold text-accent mt-6">Wave 1 — Baseline ✅</h3>
      <ul className="text-[#aaaacc] space-y-1 ml-4 mt-2">
        {[
          "Next.js dashboard shell with dark-themed trading interface",
          "SoSoValue API integration (ETF, sentiment, macro, treasury, indices)",
          "SoDEX live market data (tickers, klines, orderbooks)",
          "Heuristic 5-dimension signal scoring engine",
          "AI signal generation via DeepSeek with structured prompts",
          "Full sidebar navigation with 8 pages",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-buy text-xs">✓</span> {item}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-bold text-accent mt-8">Wave 2 — Execution ✅</h3>
      <ul className="text-[#aaaacc] space-y-1 ml-4 mt-2">
        {[
          "Wallet connection — MetaMask (desktop) + WalletConnect v2 (mobile)",
          "EIP-712 trade execution on SoDEX via typed data signing",
          "Multi-AI provider — 11 providers (DeepSeek, OpenAI, Claude, Gemini, Grok, MiMo, Qwen, GLM, Mistral, Groq, OpenRouter) with user API keys",
          "Explainable signals — per-dimension reasoning, key factors, execution plans",
          "Live balance display with 25/50/75/100% quick-fill",
          "PWA support — installable, offline-capable, custom app icons",
          "Mobile responsive — bottom tab nav, slide-in drawer, compact header",
          "Order management — place, view, cancel SoDEX orders",
          "Wrong network handling — switch chain or disconnect option",
          "Wallet panel — address copy, balance view, clear disconnect button",
          "Dynamic weight engine with outlier capping",
          "Signal history tracking with accuracy validation",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-buy text-xs">✓</span> {item}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-bold text-hold mt-8">Wave 3 — Production 🔨</h3>
      <ul className="text-[#aaaacc] space-y-1 ml-4 mt-2">
        {[
          "Backtesting engine — validate signal accuracy against historical data",
          "Multi-asset support — expand beyond vBTC_vUSDC to additional trading pairs",
          "Portfolio management — multi-asset position tracking, automated rebalancing, risk-adjusted sizing",
          "Strategy marketplace — create, share, and subscribe to custom signal strategies",
          "Notification system — Telegram and email alerts for high-confidence signals and trade executions",
          "Performance optimization — Redis caching, rate limiting, WebSocket streaming",
          "Public launch — documentation, onboarding wizard, community channels",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-hold text-xs">◻</span> {item}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-bold text-txt-muted mt-8">Wave 4 — Ecosystem</h3>
      <ul className="text-[#aaaacc] space-y-1 ml-4 mt-2">
        {[
          "Multi-chain expansion — cross-chain signal aggregation, unified portfolio view",
          "Advanced order types — trailing stop-loss, OCO bracket orders, TWAP execution",
          "Copy-trading and signal leaderboards with verified on-chain track records",
          "Institutional dashboard — multi-wallet management, team roles, approval workflows",
          "Public REST API, WebSocket feeds, and trading bot SDK (TypeScript/Python)",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-txt-muted text-xs">◻</span> {item}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-bold text-white mt-8">Competitive Landscape</h3>
      <p className="text-[#aaaacc]">
        SignalFlow Agent competes in the <strong className="text-white">Agentic Finance OS</strong> space alongside:
      </p>
      <table className="w-full text-sm mt-3 border-collapse">
        <thead>
          <tr className="border-b border-border-default text-txt-muted text-left">
            <th className="py-2 pr-4">Platform</th>
            <th className="py-2 pr-4">Agents</th>
            <th className="py-2 pr-4">Integrations</th>
            <th className="py-2">Key Differentiator</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["SignalFlow Agent", "1 AI agent (multi-provider)", "SoSoValue + SoDEX", "Your keys, your models. Non-custodial EIP-712 execution."],
            ["SoSoMind", "5 specialist agents", "SoSoValue + SoDEX + 6 AI providers", "Agent specialization: Research, Risk, Execution, Macro, Sector Rotation"],
          ].map(([p, a, i, d]) => (
            <tr key={p} className="border-b border-[#1E293B20]">
              <td className="py-2 pr-4 text-white font-semibold">{p}</td>
              <td className="py-2 pr-4 text-[#aaaacc]">{a}</td>
              <td className="py-2 pr-4 text-[#aaaacc] text-xs">{i}</td>
              <td className="py-2 text-[#aaaacc] text-xs">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Reusable UI Components ── */

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-inset border border-border-default rounded-xl p-4">
      <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-txt-muted mt-1">{sub}</p>
    </div>
  );
}

function PrincipleCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-inset border border-border-default rounded-lg p-4">
      <h4 className="text-sm font-bold text-white m-0 mb-1">{title}</h4>
      <p className="text-xs text-[#aaaacc] m-0">{desc}</p>
    </div>
  );
}

function DimensionScoring({ name, formula, desc }: { name: string; formula: string; desc: string }) {
  return (
    <div className="bg-inset border border-border-default rounded-lg p-4">
      <h4 className="text-sm font-bold text-white m-0">{name}</h4>
      <p className="font-mono text-xs text-accent mt-2 mb-2">{formula}</p>
      <p className="text-xs text-txt-muted m-0">{desc}</p>
    </div>
  );
}

function CacheCard({ layer, route, ttl, strategy }: { layer: string; route: string; ttl: string; strategy: string }) {
  return (
    <div className="bg-inset border border-border-default rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-muted text-accent">{layer}</span>
        <span className="font-mono text-xs text-white">{route}</span>
        <span className="text-[10px] text-txt-muted">{ttl}</span>
      </div>
      <p className="text-xs text-[#aaaacc] m-0">{strategy}</p>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-inset border border-border-default rounded-lg p-4 overflow-x-auto">
      <pre className="text-xs font-mono text-[#aaaacc] whitespace-pre-wrap m-0">{children}</pre>
    </div>
  );
}

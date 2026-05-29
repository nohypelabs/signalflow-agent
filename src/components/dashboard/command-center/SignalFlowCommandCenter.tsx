"use client";

import { useMemo, useState } from "react";

const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const timeframes = ["1m", "5m", "15m", "1H", "4H", "1D"];

const pipelineSteps = [
  { number: "1", title: "SoDEX Data", description: "On-chain DEX\nFlows & Trades", icon: "database" },
  { number: "2", title: "SoSoValue Data", description: "Market, ETF, Index,\nOn-chain & More", icon: "cube" },
  { number: "3", title: "Confluence V2", description: "Multi-Source Fusion\n& Alignment", icon: "fusion" },
  { number: "4", title: "AI Thesis", description: "Context, Narrative\n& Probability", icon: "brain" },
  { number: "5", title: "Trade Setup", description: "Entry, Risk, Targets\n& Execution Plan", icon: "target" },
];

const signalStream = [
  { time: "09:41", title: "AI Thesis Updated", detail: "Bullish continuation\nprobability increased", level: "HIGH", icon: "brain" },
  { time: "09:40", title: "Confluence V2", detail: "Alignment Score: 0.82", level: "HIGH", icon: "cube" },
  { time: "09:39", title: "SoSoValue Data", detail: "ETF Net Flow: +$287M", level: "HIGH", icon: "database" },
  { time: "09:39", title: "SoDEX Data", detail: "Large Buy Flow Detected\n(>$10M)", level: "HIGH", icon: "database" },
  { time: "09:38", title: "Momentum", detail: "RSI 56.1 UP\nMACD Bullish Cross", level: "MED", icon: "trend" },
  { time: "09:37", title: "Macro", detail: "DXY 102.31 DOWN\n10Y Yield 4.37% DOWN", level: "MED", icon: "globe" },
  { time: "09:36", title: "Sentiment", detail: "Greed Index: 67\nSocial Volume UP", level: "LOW", icon: "chat" },
  { time: "09:35", title: "Treasury", detail: "Exchange Reserve DOWN\nNet Outflow", level: "LOW", icon: "bank" },
];

const evidenceCards = [
  { title: "ETF FLOW", icon: "bars", rows: [["Net Flow (24H)", "+$287M"]], impact: "HIGH", spark: "up" },
  { title: "MACRO", icon: "globe", rows: [["DXY", "102.31 DOWN"], ["10Y", "4.37% DOWN"]], impact: "MEDIUM", spark: "down" },
  { title: "SENTIMENT", icon: "chat", rows: [["Greed Index", "67"], ["Social Vol.", "UP 18%"]], impact: "LOW", spark: "flat" },
  { title: "TREASURY", icon: "bank", rows: [["Exchange Reserve", "-12.4K BTC (24H)"]], impact: "MEDIUM", spark: "down" },
  { title: "MOMENTUM", icon: "trend", rows: [["RSI (14)", "56.1"], ["MACD", "Bull Cross"]], impact: "HIGH", spark: "up" },
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

const marketDataMock = {
  exchange: "Binance",
  pair: "BTCUSDT",
  timeframe: "1H",
  ohlc: "O 67,450.0   H 67,610.0   L 67,210.0   C 67,495.0   +45.0 (+0.07%)",
  volume: "Vol - BTC   1.25K",
};

const candles = [
  [61500, 62600, 60900, 62050], [62050, 62800, 61300, 61800], [61800, 63350, 61600, 63100],
  [63100, 64000, 62400, 63750], [63750, 64200, 62150, 62800], [62800, 63500, 62200, 63200],
  [63200, 65050, 62900, 64600], [64600, 65400, 63400, 63800], [63800, 64250, 62500, 62950],
  [62950, 63600, 61900, 62300], [62300, 63900, 62000, 63650], [63650, 64100, 62850, 63100],
  [63100, 64700, 62600, 64400], [64400, 65700, 64000, 65200], [65200, 66300, 64900, 66100],
  [66100, 67600, 65700, 67100], [67100, 68400, 66800, 68100], [68100, 69000, 67400, 67850],
  [67850, 68600, 66800, 67200], [67200, 68100, 66500, 67650], [67650, 69200, 67200, 68800],
  [68800, 69700, 68200, 69250], [69250, 70400, 68600, 69900], [69900, 70650, 69100, 69550],
  [69550, 70200, 68050, 68400], [68400, 69200, 67400, 67950], [67950, 69600, 67600, 69100],
  [69100, 69900, 68300, 68700],
];

const rsiPoints = [37, 42, 51, 47, 59, 53, 61, 45, 49, 43, 55, 48, 57, 52, 69, 63, 71, 58, 54, 62, 68, 56, 61, 52, 48, 59, 55, 56];
const volumeBars = [20, 28, 23, 37, 30, 42, 22, 31, 18, 25, 29, 21, 34, 39, 52, 46, 41, 35, 26, 29, 20, 24, 33, 56, 27, 31, 44, 38];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TechIcon({ name, className = "" }: { name: string; className?: string }) {
  const common = "fill-none stroke-current";
  return (
    <svg viewBox="0 0 32 32" className={cx("h-7 w-7 text-white", className)} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
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
      {!["database", "cube", "fusion", "brain", "target", "trend", "globe", "chat", "bank", "bars"].includes(name) && <circle className={common} cx="16" cy="16" r="10" />}
    </svg>
  );
}

function HeaderBar({ symbol, setSymbol }: { symbol: string; setSymbol: (symbol: string) => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setFullscreen] = useState(false);
  const utc = useMemo(() => "09:41:23 UTC", []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  return (
    <header className="flex h-[56px] items-center justify-between border-b border-white/20 px-3">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/55 text-lg font-light text-white">SF</div>
        <div className="h-8 w-px bg-white/35" />
        <div className="flex items-baseline gap-5">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-white">SignalFlow</h1>
          <p className="text-lg font-light text-white">Pipeline Command Center</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-white">
        <div className="flex h-9 items-center gap-3 rounded-md border border-white/45 px-3 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span>LIVE</span>
          <span className="h-5 w-px bg-white/35" />
          <span>{utc}</span>
        </div>
        <select
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          className="h-9 rounded-md border border-white/45 bg-black px-3 font-mono text-white outline-none"
        >
          {symbols.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} className="relative flex h-9 w-11 items-center justify-center rounded-md border border-white/45 text-white">
          <span className="text-xl">⚙</span>
          {settingsOpen && (
            <div className="absolute right-0 top-11 z-40 w-56 rounded-md border border-white/20 bg-[#080808] p-2 text-left shadow-2xl">
              {["Data Sources", "Strategy Config", "Risk Settings", "API Providers", "Docs"].map((item) => (
                <div key={item} className="rounded px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10">{item}</div>
              ))}
            </div>
          )}
        </button>
        <button type="button" onClick={toggleFullscreen} className="flex h-9 w-11 items-center justify-center rounded-md border border-white/45 text-lg text-white">
          {isFullscreen ? "↙" : "↗"}
        </button>
      </div>
    </header>
  );
}

function PipelineStepCard({ step }: { step: (typeof pipelineSteps)[number] }) {
  return (
    <div className="relative flex h-[88px] min-w-[218px] flex-1 items-center gap-4 rounded-md border border-white/65 bg-black px-6">
      <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 text-[11px] text-white">{step.number}</span>
      <TechIcon name={step.icon} className="h-10 w-10 shrink-0" />
      <div>
        <h3 className="text-[14px] font-medium text-white">{step.title}</h3>
        <p className="mt-1 whitespace-pre-line text-[12px] leading-snug text-white/80">{step.description}</p>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="hidden min-w-[64px] flex-1 items-center lg:flex">
      <div className="h-px flex-1 bg-white/65" />
      <svg viewBox="0 0 64 26" className="h-7 w-16 text-white">
        <path d="M0 13h18l4-10 8 20 8-20 8 20 4-10h14" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="h-px flex-1 bg-white/65" />
    </div>
  );
}

function PipelineFlow() {
  return (
    <section className="rounded-md border border-white/35 p-3">
      <div className="flex min-w-[1120px] items-center">
        {pipelineSteps.map((step, index) => (
          <div key={step.title} className="flex flex-1 items-center">
            <PipelineStepCard step={step} />
            {index < pipelineSteps.length - 1 && <Connector />}
          </div>
        ))}
      </div>
    </section>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-md border border-white/35 bg-[#060606]", className)}>
      <div className="border-b border-white/20 px-4 py-3">
        <h2 className="text-[15px] font-medium tracking-wide text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MarketChartSvg() {
  const min = 59000;
  const max = 71000;
  const height = 290;
  const width = 780;
  const chartTop = 24;
  const chartHeight = 190;
  const xStep = width / (candles.length + 1);
  const y = (price: number) => chartTop + ((max - price) / (max - min)) * chartHeight;
  const rsiY = (value: number) => 232 + ((80 - value) / 60) * 58;
  const rsiPath = rsiPoints.map((value, index) => `${index === 0 ? "M" : "L"} ${40 + index * xStep} ${rsiY(value)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <defs>
        <pattern id="sf-grid" width="82" height="42" patternUnits="userSpaceOnUse">
          <path d="M82 0H0V42" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#sf-grid)" />
      {[70000, 68000, 66000, 64000, 62000, 60000].map((price) => (
        <g key={price}>
          <line x1="34" x2="722" y1={y(price)} y2={y(price)} stroke="rgba(255,255,255,.12)" />
          <text x="737" y={y(price) + 4} fill="white" fontSize="12" fontFamily="monospace">{price.toLocaleString(undefined, { minimumFractionDigits: 1 })}</text>
        </g>
      ))}
      <line x1="34" x2="722" y1={y(67495)} y2={y(67495)} stroke="rgba(255,255,255,.45)" strokeDasharray="2 2" />
      <rect x="730" y={y(67495) - 10} width="48" height="18" fill="white" rx="2" />
      <text x="736" y={y(67495) + 4} fill="black" fontSize="11" fontFamily="monospace" fontWeight="700">67,495.0</text>
      {volumeBars.map((value, index) => (
        <rect key={index} x={42 + index * xStep} y={214 - value * 0.75} width="5" height={value * 0.75} fill="rgba(255,255,255,.32)" />
      ))}
      {candles.map(([open, high, low, close], index) => {
        const x = 42 + index * xStep;
        const up = close >= open;
        const bodyTop = Math.min(y(open), y(close));
        const bodyHeight = Math.max(3, Math.abs(y(open) - y(close)));
        return (
          <g key={index} stroke="white">
            <line x1={x + 4} x2={x + 4} y1={y(high)} y2={y(low)} strokeOpacity=".9" />
            <rect x={x} y={bodyTop} width="8" height={bodyHeight} fill={up ? "rgba(255,255,255,.82)" : "#050505"} strokeOpacity=".9" />
          </g>
        );
      })}
      <line x1="34" x2="722" y1="224" y2="224" stroke="rgba(255,255,255,.5)" />
      <text x="47" y="242" fill="white" fillOpacity=".8" fontSize="12">RSI (14)</text>
      <text x="112" y="242" fill="white" fontSize="12">56.13</text>
      <path d={rsiPath} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.2" />
      {[16, 17, 18, 19, 20, 21, 22].map((day, index) => (
        <text key={day} x={150 + index * 92} y="280" fill="white" fillOpacity=".8" fontSize="12" fontFamily="monospace">{day}</text>
      ))}
      <line x1="722" x2="722" y1="0" y2="290" stroke="rgba(255,255,255,.38)" />
      <text x="736" y="240" fill="white" fillOpacity=".8" fontSize="12" fontFamily="monospace">80.00</text>
      <text x="736" y="260" fill="white" fillOpacity=".8" fontSize="12" fontFamily="monospace">50.00</text>
      <text x="736" y="280" fill="white" fillOpacity=".8" fontSize="12" fontFamily="monospace">20.00</text>
    </svg>
  );
}

function LeftToolbar() {
  const tools = ["+", "/", "x", "T", "□", "↗", "▰", "Ω", "◎", "⌫"];
  return (
    <div className="flex w-[52px] shrink-0 flex-col items-center gap-3 border-r border-white/25 py-4 text-[22px] leading-none text-white/85">
      {tools.map((tool) => <button key={tool} type="button" className="h-6 w-6 text-center hover:text-white">{tool}</button>)}
    </div>
  );
}

function MarketCanvas({ timeframe, setTimeframe }: { timeframe: string; setTimeframe: (value: string) => void }) {
  return (
    <Panel title="LIVE MARKET CANVAS" className="min-h-[458px]">
      <div className="-mt-[45px] flex h-[45px] items-center justify-end gap-2 border-b border-white/20 px-4 text-[12px] text-white">
        {timeframes.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTimeframe(item)}
            className={cx("rounded px-2 py-1 font-mono", timeframe === item ? "border border-white/45 text-white" : "text-white/80 hover:text-white")}
          >
            {item}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-white/30" />
        <button type="button" className="px-2 text-white">Indicators⌄</button>
        <span className="h-6 w-px bg-white/30" />
        <button type="button" className="px-2 text-white">Templates⌄</button>
        <span className="px-2 text-lg">↗</span>
        <span className="px-1 text-lg">⋮</span>
      </div>
      <div className="flex h-[413px]">
        <LeftToolbar />
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute left-4 top-4 z-10 text-white">
            <div className="text-[14px] font-medium">{marketDataMock.pair} · {timeframe} · {marketDataMock.exchange}</div>
            <div className="mt-2 font-mono text-[12px] text-white/80">{marketDataMock.ohlc}</div>
            <div className="mt-1 font-mono text-[12px] text-white/80">{marketDataMock.volume}</div>
          </div>
          <MarketChartSvg />
          <button type="button" className="absolute bottom-3 right-3 text-lg text-white">⚙</button>
        </div>
      </div>
    </Panel>
  );
}

function ConfidenceGauge({ value, label }: { value: number; label: string }) {
  const angle = -180 + (value / 100) * 180;
  return (
    <div className="relative mx-auto h-[150px] w-[240px]">
      <svg viewBox="0 0 240 140" className="h-full w-full">
        <path d="M30 120 A90 90 0 0 1 210 120" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" />
        {Array.from({ length: 36 }).map((_, index) => {
          const a = Math.PI + (index / 35) * Math.PI;
          const x1 = 120 + Math.cos(a) * 82;
          const y1 = 120 + Math.sin(a) * 82;
          const x2 = 120 + Math.cos(a) * 96;
          const y2 = 120 + Math.sin(a) * 96;
          return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeOpacity=".8" strokeWidth="1" />;
        })}
        <line x1="120" y1="120" x2="120" y2="28" stroke="white" strokeWidth="1.4" transform={`rotate(${angle} 120 120)`} />
        <circle cx="120" cy="120" r="4" fill="white" />
        <text x="20" y="124" fill="white" fontSize="12">0%</text>
        <text x="198" y="124" fill="white" fontSize="12">100%</text>
        <text x="112" y="28" fill="white" fontSize="12">50%</text>
      </svg>
      <div className="absolute inset-x-0 top-[64px] text-center">
        <div className="text-3xl font-light text-white">{value}%</div>
        <div className="text-base text-white/85">{label}</div>
      </div>
    </div>
  );
}

function DecisionPanel() {
  const [signal, setSignal] = useState(decisionPanelData.selected);
  const execute = () => console.info("SignalFlow execute setup", { signal, symbol: marketDataMock.pair });

  return (
    <Panel title="CURRENT DECISION PANEL" className="min-h-[458px]">
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 text-[12px] font-medium tracking-wide text-white">PRIMARY SIGNAL</div>
          <div className="grid grid-cols-3 overflow-hidden rounded-md border border-white/45">
            {["LONG", "SHORT", "NO TRADE"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSignal(item)}
                className={cx("h-16 border-r border-white/35 text-[13px] text-white last:border-r-0", signal === item && "bg-white/8 ring-1 ring-inset ring-white")}
              >
                <div className="text-2xl">{item === "LONG" ? "↑" : item === "SHORT" ? "↓" : "⊖"}</div>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[12px] font-medium tracking-wide text-white">CONFIDENCE</div>
          <ConfidenceGauge value={decisionPanelData.confidence} label={decisionPanelData.confidenceLabel} />
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-white/45">
          <div className="space-y-2 border-r border-white/35 p-3">
            <div className="text-[12px] text-white/75">TAKE PROFIT (TP)</div>
            {decisionPanelData.takeProfit.map(([label, price, risk]) => (
              <div key={label} className="grid grid-cols-[34px_1fr_54px] gap-2 font-mono text-[12px] text-white">
                <span>{label}</span><span>{price}</span><span>{risk}</span>
              </div>
            ))}
          </div>
          <div className="p-3">
            <div className="text-[12px] text-white/75">STOP LOSS (SL)</div>
            <div className="mt-2 grid grid-cols-[28px_1fr_58px] gap-2 font-mono text-[12px] text-white">
              <span>{decisionPanelData.stopLoss[0]}</span><span>{decisionPanelData.stopLoss[1]}</span><span>{decisionPanelData.stopLoss[2]}</span>
            </div>
            <div className="my-3 h-px bg-white/25" />
            <div className="text-[12px] text-white/75">RISK / REWARD</div>
            <div className="font-mono text-xl text-white">{decisionPanelData.riskReward}</div>
          </div>
        </div>
        <button type="button" onClick={execute} className="flex h-12 w-full items-center justify-center gap-4 rounded-md border border-white/65 text-[15px] tracking-wide text-white hover:bg-white/8">
          <span className="text-2xl">▷</span> EXECUTE SETUP
        </button>
        <div className="flex justify-between text-[13px] text-white/85">
          <span>Position Size (Risk 1%):</span>
          <span className="font-mono text-white">{decisionPanelData.positionSize}</span>
        </div>
      </div>
    </Panel>
  );
}

function SignalStream() {
  return (
    <Panel title="SIGNAL STREAM" className="min-h-[458px]">
      <div>
        {signalStream.map((item) => (
          <div key={`${item.time}-${item.title}`} className="grid grid-cols-[46px_34px_1fr_42px] gap-2 border-b border-white/20 px-3 py-[9px] text-white">
            <div className="font-mono text-[12px] text-white">{item.time}</div>
            <TechIcon name={item.icon} className="h-6 w-6" />
            <div>
              <div className="text-[12px] font-medium text-white">{item.title}</div>
              <div className="whitespace-pre-line text-[11px] leading-snug text-white/80">{item.detail}</div>
            </div>
            <div className="self-start rounded border border-white/45 px-1.5 py-1 text-center text-[9px] text-white">{item.level}</div>
          </div>
        ))}
        <button type="button" className="flex w-full items-center justify-between px-5 py-3 text-[13px] text-white">
          View All Signals <span>›</span>
        </button>
      </div>
    </Panel>
  );
}

function Sparkline({ mode }: { mode: string }) {
  const path = mode === "up" ? "M2 26 L10 20 L16 22 L23 12 L30 15 L38 4" : mode === "down" ? "M2 8 L11 14 L18 13 L26 22 L34 21 L42 29" : "M2 18 L10 16 L18 20 L26 15 L34 18 L42 14";
  return (
    <svg viewBox="0 0 44 32" className="h-9 w-16 text-white">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" />
      {mode === "up" && <path d="M38 4v7M38 4h-7" fill="none" stroke="currentColor" />}
    </svg>
  );
}

function EvidenceCard({ card }: { card: (typeof evidenceCards)[number] }) {
  return (
    <div className="relative rounded-md border border-white/55 bg-[#060606] p-3">
      <div className="mb-3 flex items-center gap-2">
        <TechIcon name={card.icon} className="h-6 w-6" />
        <h3 className="text-[14px] font-medium text-white">{card.title}</h3>
      </div>
      <div className="grid min-h-[43px] grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1">
          {card.rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[1fr_auto] gap-3 text-[12px] text-white">
              <span className="text-white/80">{label}</span>
              <span className="font-mono text-white">{value}</span>
            </div>
          ))}
        </div>
        <Sparkline mode={card.spark} />
      </div>
      <div className="mt-3 border-t border-white/35 pt-2 text-[12px] text-white/85">Impact: <span className="text-white">{card.impact}</span></div>
    </div>
  );
}

function EvidenceFlow() {
  return (
    <section className="rounded-md border border-white/35 bg-[#050505] p-4">
      <h2 className="mb-3 text-[15px] font-medium tracking-wide text-white">
        EVIDENCE FLOW <span className="ml-2 text-[12px] text-white/75">(DATA → INSIGHT → SIGNAL)</span>
      </h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        {evidenceCards.map((card) => <EvidenceCard key={card.title} card={card} />)}
      </div>
      <SignalEngineFlow />
    </section>
  );
}

function SignalEngineFlow() {
  return (
    <div className="relative mt-4 min-h-[100px]">
      <div className="absolute left-[8%] right-[28%] top-0 hidden h-6 rounded-b-md border-b border-l border-r border-dashed border-white/55 xl:block" />
      <div className="grid grid-cols-1 items-end gap-5 pt-8 xl:grid-cols-[1fr_300px_320px_260px]">
        <div className="hidden xl:block" />
        <div className="rounded-md border border-white/55 bg-[#060606] p-4">
          <div className="flex items-center gap-4">
            <TechIcon name="fusion" className="h-10 w-10" />
            <div>
              <h3 className="text-[15px] tracking-wide text-white">SIGNAL ENGINE</h3>
              <p className="mt-1 text-[13px] text-white/80">Weighted Fusion & Scoring</p>
            </div>
          </div>
        </div>
        <div className="relative rounded-md border border-white/55 bg-[#060606] p-4">
          <span className="absolute -left-5 top-1/2 hidden h-px w-5 bg-white/65 xl:block" />
          <h3 className="text-[13px] tracking-wide text-white">CONFLUENCE SCORE</h3>
          <div className="mt-1 font-mono text-xl text-white">0.82 <span className="text-sm text-white/70">/ 1.00</span></div>
          <div className="mt-1 text-[12px] text-white/80">Strong Alignment</div>
          <div className="absolute bottom-4 right-4 flex items-end gap-2">
            {[14, 20, 26, 31, 36, 40, 45].map((height) => <span key={height} className="w-2 bg-white/85" style={{ height }} />)}
          </div>
        </div>
        <div className="relative rounded-md border border-white/55 bg-[#060606] p-4">
          <span className="absolute -left-5 top-1/2 hidden h-px w-5 bg-white/65 xl:block" />
          <div className="flex items-center gap-4">
            <TechIcon name="target" className="h-10 w-10" />
            <div>
              <h3 className="text-[14px] tracking-wide text-white">OUTPUT: TRADE SETUP</h3>
              <p className="mt-1 text-[13px] text-white">High Probability</p>
              <p className="mt-1 text-[12px] text-white/80">Execution Ready ○</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignalFlowCommandCenter() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1H");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] p-4 text-white">
      <div className="mx-auto max-w-[1720px] rounded-md border border-white/25 bg-[#050505]">
        <HeaderBar symbol={symbol} setSymbol={setSymbol} />
        <main className="space-y-3 p-3">
          <div className="overflow-x-auto">
            <PipelineFlow />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,3.6fr)_minmax(330px,1.5fr)_minmax(270px,.9fr)]">
            <MarketCanvas timeframe={timeframe} setTimeframe={setTimeframe} />
            <DecisionPanel />
            <SignalStream />
          </div>
          <EvidenceFlow />
        </main>
      </div>
    </div>
  );
}

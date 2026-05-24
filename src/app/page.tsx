"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import KPICards from "@/components/KPICards";
import PortfolioChart from "@/components/PortfolioChart";
import SignalList from "@/components/SignalList";
import AIReasoning from "@/components/AIReasoning";
import DataSources from "@/components/DataSources";
import SignalsPage from "@/components/SignalsPage";
import TradeHistory from "@/components/TradeHistory";
import StrategyConfig from "@/components/StrategyConfig";
import PerformancePage from "@/components/PerformancePage";
import SettingsPage from "@/components/SettingsPage";
import { Signal, signals } from "@/lib/mock-data";
import { useMarket } from "@/lib/use-market";
import { useSignals } from "@/lib/use-signals";
import { useAISignal } from "@/lib/use-ai-signal";

const DEFAULT_PAIR = "vBTC_vUSDC";

function pairToCoin(pair: string): string {
  return pair.split("/")[0]; // "BTC/USDT" → "BTC"
}

export default function Home() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(signals[0]);
  const { tickers, klines, loading, error } = useMarket(DEFAULT_PAIR);
  const { data: signalsData } = useSignals();
  const { aiSignal, analyzing, error: aiError, generate } = useAISignal();
  const [aiCoin, setAiCoin] = useState("BTC");

  const displaySignal = aiSignal ?? selectedSignal;
  const liveDims =
    signalsData && displaySignal
      ? signalsData.dimensions[pairToCoin(displaySignal.pair)] ?? null
      : null;

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        sodexStatus={
          loading ? "loading" : error ? "error" : tickers ? "connected" : "loading"
        }
        tickerCount={tickers?.length}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={activeMenu} onSelect={setActiveMenu} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {activeMenu === "Dashboard" && (
            <>
              <KPICards tickers={tickers} />
              <div className="flex flex-col lg:flex-row gap-4">
                <PortfolioChart klines={klines} symbol="BTC/USDC" />
                <SignalList
                  onSelect={setSelectedSignal}
                  selected={selectedSignal?.id ?? null}
                  tickers={tickers}
                />
              </div>
              {/* AI Signal Generator */}
              <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-white">AI Signal Generator</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7b2fff20] text-[#7b2fff] border border-[#7b2fff30]">
                    Deepseek 4 Pro
                  </span>
                  <select
                    value={aiCoin}
                    onChange={(e) => setAiCoin(e.target.value)}
                    className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    {["BTC", "ETH", "SOL"].map((c) => (
                      <option key={c} value={c}>{c}/USDC</option>
                    ))}
                  </select>
                  <button
                    onClick={() => generate(aiCoin)}
                    disabled={analyzing}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#7b2fff] text-white hover:bg-[#6a1fee] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {analyzing ? "Analyzing..." : "Generate Signal"}
                  </button>
                  {aiSignal && (
                    <button
                      onClick={() => {
                        setSelectedSignal(aiSignal);
                      }}
                      className="px-3 py-1.5 text-[10px] rounded-lg bg-[#00ff8820] text-[#00ff88] border border-[#00ff8830] hover:bg-[#00ff8830] transition-colors"
                    >
                      Pin to Compare
                    </button>
                  )}
                </div>
                {aiError && (
                  <p className="mt-2 text-xs text-[#ff4444]">{aiError}</p>
                )}
                {aiSignal && (
                  <p className="mt-2 text-xs text-[#00ff88]">
                    AI signal ready: {aiSignal.action} {aiSignal.pair} @ {aiSignal.confidence}% confidence
                  </p>
                )}
              </div>
              <AIReasoning signal={displaySignal} liveDims={liveDims} />
              <DataSources />
            </>
          )}

          {activeMenu === "Signals" && <SignalsPage tickers={tickers} />}

          {activeMenu === "Trade History" && <TradeHistory tickers={tickers} />}

          {activeMenu === "Strategy Config" && <StrategyConfig />}

          {activeMenu === "Data Sources" && <DataSources />}

          {activeMenu === "Performance" && <PerformancePage />}

          {activeMenu === "Settings" && <SettingsPage />}

          <footer className="text-center text-[11px] text-[#333344] py-4">
            NoHype Labs — SignalFlow Agent — SoSoValue Buildathon 2026
          </footer>
        </main>
      </div>
    </div>
  );
}

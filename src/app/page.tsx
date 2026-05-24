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
import TradeForm from "@/components/TradeForm";
import OpenOrders from "@/components/OpenOrders";
import { Signal, signals } from "@/lib/mock-data";
import { useMarket } from "@/lib/use-market";
import { useSignals } from "@/lib/use-signals";
import { useAISignal } from "@/lib/use-ai-signal";
import { useWallet } from "@/lib/use-wallet";
import { useOrders } from "@/lib/use-orders";
import { useAIConfig } from "@/lib/use-ai-config";
import { getProvider } from "@/lib/ai-providers";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { SoDEXTicker, SoDEXNewOrderRequest } from "@/lib/sodex-types";

const DEFAULT_PAIR = "vBTC_vUSDC";

function pairToCoin(pair: string): string {
  return pair.split("/")[0];
}

export default function Home() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(signals[0]);
  const { tickers, klines, loading, error } = useMarket(DEFAULT_PAIR);
  const { data: signalsData } = useSignals();
  // Wallet
  const { address, isConnected } = useWallet();

  // AI config (user's own provider + API key)
  const { config: aiConfig, update: updateAIConfig } = useAIConfig();
  const { aiSignal, analyzing, error: aiError, generate } = useAISignal(aiConfig);
  const [aiCoin, setAiCoin] = useState("BTC");

  const aiProviderLabel = getProvider(aiConfig.providerId)?.name || "Deepseek";

  // Real orders from SoDEX
  const ordersHook = useOrders(true);

  // Trade form
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [executingSignal, setExecutingSignal] = useState<Signal | null>(null);

  const displaySignal = aiSignal ?? selectedSignal;
  const liveDims =
    signalsData && displaySignal
      ? signalsData.dimensions[pairToCoin(displaySignal.pair)] ?? null
      : null;

  const sodexStatus =
    loading ? "loading" : error ? "error" : tickers ? "connected" : "loading";

  // Build ticker map
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  // ── Trade execution callbacks ──

  const handleExecuteSignal = (signal: Signal) => {
    setExecutingSignal(signal);
    setShowTradeForm(true);
  };

  const handleExecuteOrder = async (_order: SoDEXNewOrderRequest) => {
    // Order was already posted to SoDEX by TradeForm (with EIP-712 signature)
    // Just refresh the orders list
    await ordersHook.refresh();
  };

  const handleCloseForm = () => {
    setShowTradeForm(false);
    setExecutingSignal(null);
  };

  // Find ticker for the executing signal
  const executingSodSym = executingSignal ? pairToSodexSymbol(executingSignal.pair) : "";
  const executingTicker = executingSodSym ? tickerMap.get(executingSodSym) ?? null : null;

  const openOrders = ordersHook.orders.filter(
    (o) => o.status === "NEW" || o.status === "PARTIALLY_FILLED",
  );

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        sodexStatus={sodexStatus}
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
                    {aiProviderLabel} {aiConfig.model ? `/ ${aiConfig.model}` : ""}
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
                    <>
                      <button
                        onClick={() => {
                          setSelectedSignal(aiSignal);
                        }}
                        className="px-3 py-1.5 text-[10px] rounded-lg bg-[#00ff8820] text-[#00ff88] border border-[#00ff8830] hover:bg-[#00ff8830] transition-colors"
                      >
                        Pin to Compare
                      </button>
                      <button
                        onClick={() => handleExecuteSignal(aiSignal)}
                        className="px-3 py-1.5 text-[10px] rounded-lg bg-[#7b2fff20] text-[#7b2fff] border border-[#7b2fff30] hover:bg-[#7b2fff30] transition-colors"
                      >
                        Execute Trade
                      </button>
                    </>
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

          {activeMenu === "Trading" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Trading</h2>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830] rounded">
                  LIVE
                </span>
                {!isConnected && (
                  <span className="text-[10px] text-[#ff8800]">— Connect wallet to trade</span>
                )}
                {isConnected && (
                  <span className="text-[10px] text-[#666677]">
                    — {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                )}
              </div>

              {/* Signals to execute */}
              <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3">Execute Signals</h3>
                {!isConnected && (
                  <p className="text-xs text-[#ff8800] mb-3">Connect wallet to execute trades on SoDEX</p>
                )}
                <div className="flex flex-col gap-2">
                  {signals.map((s, i) => {
                    const sodSym = pairToSodexSymbol(s.pair);
                    const live = tickerMap.get(sodSym);
                    const livePrice = live ? parseFloat(live.lastPx) : s.price;
                    const hasOpenOrder = openOrders.some((o) => o.symbol === sodSym);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border border-[#1a1a2e] hover:bg-[#1a1a2e40] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-white">{s.pair}</span>
                          <span className={`text-xs font-bold ${s.action === "BUY" ? "text-[#00ff88]" : s.action === "SELL" ? "text-[#ff4444]" : "text-[#ff8800]"}`}>
                            {s.action}
                          </span>
                          <span className="text-[11px] text-[#666677] font-mono">
                            ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            s.confidence >= 80 ? "bg-[#00ff8820] text-[#00ff88]" : "bg-[#ff880020] text-[#ff8800]"
                          }`}>
                            {s.confidence}%
                          </span>
                        </div>
                        <button
                          onClick={() => handleExecuteSignal(s)}
                          disabled={!isConnected || hasOpenOrder}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            !isConnected || hasOpenOrder
                              ? "bg-[#ffffff05] text-[#444455] cursor-not-allowed"
                              : "bg-[#7b2fff] text-white hover:bg-[#6a1fee]"
                          }`}
                        >
                          {!isConnected ? "Connect Wallet" : hasOpenOrder ? "Order Open" : "Execute"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Open orders */}
              <OpenOrders
                orders={ordersHook.orders}
                loading={ordersHook.loading}
                error={ordersHook.error}
                onCancel={ordersHook.cancel}
              />
            </div>
          )}

          {activeMenu === "Trade History" && (
            <TradeHistory
              orders={ordersHook.orders}
              ordersLoading={ordersHook.loading}
              ordersError={ordersHook.error}
              tickers={tickers}
              onExecuteSignal={handleExecuteSignal}
              onCancelOrder={ordersHook.cancel}
            />
          )}

          {activeMenu === "Strategy Config" && <StrategyConfig />}

          {activeMenu === "Data Sources" && <DataSources />}

          {activeMenu === "Performance" && <PerformancePage />}

          {activeMenu === "Settings" && (
            <SettingsPage
              walletConnected={isConnected}
              aiConfig={aiConfig}
              onAIConfigChange={updateAIConfig}
            />
          )}

          <footer className="text-center text-[11px] text-[#333344] py-4">
            NoHype Labs — SignalFlow Agent — SoSoValue Buildathon 2026
          </footer>
        </main>
      </div>

      {/* Trade form modal */}
      {showTradeForm && (
        <TradeForm
          signal={executingSignal}
          ticker={executingTicker}
          walletConnected={isConnected}
          onExecute={handleExecuteOrder}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

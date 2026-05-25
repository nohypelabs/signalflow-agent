"use client";

import { useState, useEffect, useCallback } from "react";
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
import DocsPage from "@/components/DocsPage";
import TradeForm from "@/components/TradeForm";
import OpenOrders from "@/components/OpenOrders";
import MobileBottomNav from "@/components/MobileBottomNav";
import AISignalGenerator from "@/components/AISignalGenerator";
import { Signal, signals } from "@/lib/mock-data";
import { useMarket } from "@/lib/use-market";
import { useSignals } from "@/lib/use-signals";
import { useAISignal } from "@/lib/use-ai-signal";
import { useWallet } from "@/lib/use-wallet";
import { useOrders } from "@/lib/use-orders";
import { useAIConfig } from "@/lib/use-ai-config";
import { useSignalHistory } from "@/lib/use-signal-history";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { tickers, klines, loading, error } = useMarket(DEFAULT_PAIR);
  const { data: signalsData } = useSignals();
  // Wallet
  const { address, isConnected } = useWallet();

  // AI config (user's own provider + API key)
  const { config: aiConfig, update: updateAIConfig } = useAIConfig();
  const { aiSignal, analyzing, error: aiError, generate } = useAISignal(aiConfig);
  const [aiCoin, setAiCoin] = useState("BTC");

  // Signal history & accuracy tracking
  const { history, hydrated: historyHydrated, recordSignal, resolveSignals, stats } = useSignalHistory();

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

  // Resolve past signals against current prices (every ticker update)
  const resolvePending = useCallback(() => {
    if (!tickers || !historyHydrated) return;
    for (const t of tickers) {
      const pair = t.symbol; // vBTC_vUSDC format
      const coin = pair.startsWith("v") ? pair.split("_")[0].replace("v", "") : pair.split("_")[0];
      const price = parseFloat(t.lastPx);
      if (coin && !Number.isNaN(price)) {
        resolveSignals(coin, price);
      }
    }
  }, [tickers, historyHydrated, resolveSignals]);

  useEffect(() => {
    resolvePending();
  }, [resolvePending]);

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
        onMenuToggle={() => setMobileMenuOpen(true)}
        btcPrice={(() => {
          const t = tickerMap.get("vBTC_vUSDC");
          return t ? `$${parseFloat(t.lastPx).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined;
        })()}
        btcChange={(() => {
          const t = tickerMap.get("vBTC_vUSDC");
          if (!t) return undefined;
          const pct = t.changePct;
          return typeof pct === "number" && !Number.isNaN(pct) ? pct : undefined;
        })()}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          active={activeMenu}
          onSelect={setActiveMenu}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 pb-20 md:pb-0">
          {activeMenu === "Dashboard" && (
            <>
              <KPICards tickers={tickers} />
              <div className="flex flex-col lg:flex-row gap-4">
                <PortfolioChart klines={klines} symbol="BTC/USDC" currentPrice={tickerMap.get("vBTC_vUSDC") ? parseFloat(tickerMap.get("vBTC_vUSDC")!.lastPx) : null} />
                <SignalList
                  onSelect={setSelectedSignal}
                  selected={selectedSignal?.id ?? null}
                  tickers={tickers}
                />
              </div>
              {/* AI Signal Generator */}
              <AISignalGenerator
                aiConfig={aiConfig}
                aiProviderLabel={aiProviderLabel}
                aiCoin={aiCoin}
                onCoinChange={setAiCoin}
                analyzing={analyzing}
                aiSignal={aiSignal}
                aiError={aiError}
                onGenerate={async () => {
                  const signal = await generate(aiCoin);
                  if (signal) recordSignal(signal);
                }}
                onPinSignal={() => {
                  if (aiSignal) setSelectedSignal(aiSignal);
                }}
                onExecuteSignal={() => {
                  if (aiSignal) handleExecuteSignal(aiSignal);
                }}
              />
              <AIReasoning signal={displaySignal} liveDims={liveDims} />
              <DataSources />
            </>
          )}

          {activeMenu === "Signals" && (
                <SignalsPage
                  tickers={tickers}
                  liveDims={signalsData?.dimensions}
                  overallScores={signalsData?.overall}
                  weights={signalsData?.weights}
                  cappedDims={signalsData?.capped}
                />
              )}

          {activeMenu === "Trading" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-txt-primary">Trading</h2>
                <span className="text-[10px] px-1.5 py-0.5 bg-buy-muted text-buy border border-buy-dim rounded">
                  LIVE
                </span>
                {!isConnected && (
                  <span className="text-[10px] text-hold">&mdash; Connect wallet to trade</span>
                )}
                {isConnected && (
                  <span className="text-[10px] text-txt-muted">
                    &mdash; {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                )}
              </div>

              {/* Signals to execute */}
              <div className="bg-card border border-border-default rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 text-txt-primary">Execute Signals</h3>
                {!isConnected && (
                  <p className="text-xs text-hold mb-3">Connect wallet to execute trades on SoDEX</p>
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
                        className="flex items-center justify-between p-3 rounded-lg border border-border-default hover:bg-elevated transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-txt-primary">{s.pair}</span>
                          <span className={`text-xs font-bold ${s.action === "BUY" ? "text-buy" : s.action === "SELL" ? "text-sell" : "text-hold"}`}>
                            {s.action}
                          </span>
                          <span className="text-[11px] text-txt-muted font-mono">
                            ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            s.confidence >= 80 ? "bg-buy-muted text-buy" : "bg-hold-muted text-hold"
                          }`}>
                            {s.confidence}%
                          </span>
                        </div>
                        <button
                          onClick={() => handleExecuteSignal(s)}
                          disabled={!isConnected || hasOpenOrder}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            !isConnected || hasOpenOrder
                              ? "bg-inset text-txt-dim cursor-not-allowed"
                              : "bg-accent text-white hover:bg-[#6a1fee]"
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

          {activeMenu === "Performance" && (
            <PerformancePage signalHistory={history} signalStats={stats} historyHydrated={historyHydrated} />
          )}

          {activeMenu === "Settings" && (
            <SettingsPage
              walletConnected={isConnected}
              aiConfig={aiConfig}
              onAIConfigChange={updateAIConfig}
            />
          )}

          {activeMenu === "Docs" && <DocsPage />}

          <footer className="text-center text-[11px] text-txt-dim py-4 border-t border-border-default mt-auto">
            <p>SignalFlow Agent — Built by <span className="text-txt-muted">NoHype Labs</span></p>
            <p className="mt-0.5 text-txt-faint">SoSoValue Buildathon 2026 — Wave 2</p>
          </footer>
        </main>
      </div>

      <MobileBottomNav active={activeMenu} onSelect={setActiveMenu} />

      {/* Trade form modal */}
      {showTradeForm && (
        <TradeForm
          signal={executingSignal}
          ticker={executingTicker}
          walletConnected={isConnected}
          walletAddress={address}
          onExecute={handleExecuteOrder}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import KPICards from "@/components/KPICards";
import TradingChart from "@/components/TradingChart";
import AISignalGenerator from "@/components/AISignalGenerator";
import AIReasoning from "@/components/AIReasoning";
import DataSources from "@/components/DataSources";
import SignalFlowRail from "@/components/dashboard/SignalFlowRail";
import CurrentDecisionPanel from "@/components/dashboard/CurrentDecisionPanel";
import SignalStream from "@/components/dashboard/SignalStream";
import EvidenceFlow from "@/components/dashboard/EvidenceFlow";
import ETFFlowChart from "@/components/ETFFlowChart";
import MacroCalendar from "@/components/MacroCalendar";
import MacroEventHistory from "@/components/MacroEventHistory";
import NewsSentimentDashboard from "@/components/NewsSentimentDashboard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion";

export default function DashboardPage() {
  const d = useDashboard();
  const metrics = useDashboardMetrics(d.tickers, d.liveSignals, d.marketError, d.signalsError);
  const activeDecision = d.displaySignal ?? d.liveSignals[0] ?? null;
  const btcTicker = d.tickerMap.get("vBTC_vUSDC");
  const btcPrice = btcTicker ? parseFloat(btcTicker.lastPx) : null;
  const handleGenerate = async () => {
    const signal = await d.generate(d.aiCoin);
    if (signal) d.recordSignal(signal);
  };
  const handlePinDecision = () => {
    if (activeDecision) d.setSelectedSignal(activeDecision);
  };

  return (
    <StaggerContainer stagger={0.05} className="space-y-4">
      <StaggerItem>
        <SignalFlowRail
          sodexStatus={d.sodexStatus}
          marketError={d.marketError}
          signalsError={d.signalsError}
          metrics={metrics}
          includeAI={d.includeAI}
          aiProviderLabel={d.aiProviderLabel}
          analyzing={d.analyzing}
          displaySignal={activeDecision}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4 items-start">
          <div className="2xl:col-span-8 min-w-0 space-y-4">
            <div className="h-[clamp(420px,58vh,570px)]">
              <TradingChart
                klines={d.klines}
                symbol="BTC/USDC"
                currentPrice={btcPrice}
                liveSignals={d.liveSignals}
                tickerMap={d.tickerMap}
                compact
              />
            </div>
            <SignalStream
              signals={d.liveSignals}
              selectedId={activeDecision?.id ?? null}
              tickerMap={d.tickerMap}
              onSelect={d.setSelectedSignal}
            />
            <KPICards metrics={metrics} />
          </div>
          <div className="2xl:col-span-4 min-w-0">
            <div className="2xl:sticky 2xl:top-4 space-y-4">
              <CurrentDecisionPanel
                signal={activeDecision}
                tickerMap={d.tickerMap}
                isConnected={d.isConnected}
                analyzing={d.analyzing}
                onExecuteSignal={d.handleExecuteSignal}
                onGenerate={handleGenerate}
                onPinSignal={handlePinDecision}
              />
            </div>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <EvidenceFlow signal={activeDecision} liveDims={d.liveDims} />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <div className="xl:col-span-6 transition-all duration-300">
            <AISignalGenerator
              aiConfig={d.aiConfig}
              aiProviderLabel={d.aiProviderLabel}
              aiCoin={d.aiCoin}
              onCoinChange={d.setAiCoin}
              analyzing={d.analyzing}
              phase={d.signalPhase}
              baseSignal={d.baseSignal}
              aiThesis={d.aiThesis}
              aiError={d.aiError}
              includeAI={d.includeAI}
              onIncludeAIChange={d.setIncludeAI}
              onGenerate={handleGenerate}
              onPinSignal={() => {
                if (d.baseSignal) d.setSelectedSignal(d.baseSignal);
              }}
              onExecuteSignal={() => {
                if (d.baseSignal) d.handleExecuteSignal(d.baseSignal);
              }}
            />
          </div>
          <div className="xl:col-span-6 transition-all duration-300">
            <AIReasoning signal={d.displaySignal} liveDims={d.liveDims} tickerMap={d.tickerMap} />
          </div>
        </div>
      </StaggerItem>

      {/* Data Sources */}
      <StaggerItem>
        <DataSources />
      </StaggerItem>

      {/* Deep API Integration Row */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ErrorBoundary name="ETF Flow">
            <ETFFlowChart symbol="BTC" />
          </ErrorBoundary>
          <ErrorBoundary name="Macro Calendar">
            <MacroCalendar />
          </ErrorBoundary>
          <ErrorBoundary name="News Sentiment">
            <NewsSentimentDashboard />
          </ErrorBoundary>
        </div>
      </StaggerItem>

      {/* Macro Event History */}
      <StaggerItem>
        <ErrorBoundary name="Macro History">
          <MacroEventHistory />
        </ErrorBoundary>
      </StaggerItem>
    </StaggerContainer>
  );
}

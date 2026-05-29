"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import KPICards from "@/components/KPICards";
import TradingChart from "@/components/TradingChart";
import SignalList from "@/components/SignalList";
import AISignalGenerator from "@/components/AISignalGenerator";
import AIReasoning from "@/components/AIReasoning";
import DataSources from "@/components/DataSources";
import ETFFlowChart from "@/components/ETFFlowChart";
import MacroCalendar from "@/components/MacroCalendar";
import MacroEventHistory from "@/components/MacroEventHistory";
import NewsSentimentDashboard from "@/components/NewsSentimentDashboard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion";

export default function DashboardPage() {
  const d = useDashboard();
  const metrics = useDashboardMetrics(d.tickers, d.liveSignals, d.marketError, d.signalsError);

  return (
    <StaggerContainer stagger={0.05} className="space-y-4">
      {/* KPI stats row */}
      <StaggerItem>
        <KPICards metrics={metrics} />
      </StaggerItem>

      {/* Chart + Signals row */}
      <StaggerItem>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <div className="xl:col-span-8 min-w-0">
            <div className="h-[clamp(420px,60vh,560px)]">
              <TradingChart
                klines={d.klines}
                symbol="BTC/USDC"
                currentPrice={
                  d.tickerMap.get("vBTC_vUSDC")
                    ? parseFloat(d.tickerMap.get("vBTC_vUSDC")!.lastPx)
                    : null
                }
                liveSignals={d.liveSignals}
                tickerMap={d.tickerMap}
                compact
              />
            </div>
          </div>
          <div className="xl:col-span-4 min-w-0">
            <div className="xl:sticky xl:top-4 h-[clamp(400px,60vh,560px)]">
              <SignalList
                onSelect={d.setSelectedSignal}
                selected={d.selectedSignal?.id ?? null}
                tickers={d.tickers}
                liveSignals={d.liveSignals}
                className="transition-all duration-300 hover:border-border-muted"
              />
            </div>
          </div>
        </div>
      </StaggerItem>

      {/* AI Row */}
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
              onGenerate={async () => {
                const signal = await d.generate(d.aiCoin);
                if (signal) d.recordSignal(signal);
              }}
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

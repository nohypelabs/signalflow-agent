"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import KPICards from "@/components/KPICards";
import TradingChart from "@/components/TradingChart";
import SignalList from "@/components/SignalList";
import AISignalGenerator from "@/components/AISignalGenerator";
import AIReasoning from "@/components/AIReasoning";
import DataSources from "@/components/DataSources";

export default function DashboardPage() {
  const d = useDashboard();
  const metrics = useDashboardMetrics(d.tickers, d.liveSignals, d.marketError, d.signalsError);

  return (
    <div className="space-y-4">
      {/* KPI stats row */}
      <KPICards metrics={metrics} />

      {/* Chart + Signals row */}
      <div className="flex flex-col lg:flex-row gap-4">
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
        />
        <SignalList
          onSelect={d.setSelectedSignal}
          selected={d.selectedSignal?.id ?? null}
          tickers={d.tickers}
          liveSignals={d.liveSignals}
        />
      </div>

      {/* AI Generator */}
      <AISignalGenerator
        aiConfig={d.aiConfig}
        aiProviderLabel={d.aiProviderLabel}
        aiCoin={d.aiCoin}
        onCoinChange={d.setAiCoin}
        analyzing={d.analyzing}
        aiSignal={d.aiSignal}
        aiError={d.aiError}
        onGenerate={async () => {
          const signal = await d.generate(d.aiCoin);
          if (signal) d.recordSignal(signal);
        }}
        onPinSignal={() => {
          if (d.aiSignal) d.setSelectedSignal(d.aiSignal);
        }}
        onExecuteSignal={() => {
          if (d.aiSignal) d.handleExecuteSignal(d.aiSignal);
        }}
      />

      {/* AI Reasoning */}
      <AIReasoning signal={d.displaySignal} liveDims={d.liveDims} tickerMap={d.tickerMap} />

      {/* Data Sources */}
      <DataSources />
    </div>
  );
}

"use client";

import { useDashboard } from "@/lib/dashboard-context";
import KPICards from "@/components/KPICards";
import PortfolioChart from "@/components/PortfolioChart";
import SignalList from "@/components/SignalList";
import AISignalGenerator from "@/components/AISignalGenerator";
import AIReasoning from "@/components/AIReasoning";
import DataSources from "@/components/DataSources";

export default function DashboardPage() {
  const d = useDashboard();
  return (
    <>
      <KPICards tickers={d.tickers} />
      <div className="flex flex-col lg:flex-row gap-4">
        <PortfolioChart
          klines={d.klines}
          symbol="BTC/USDC"
          currentPrice={
            d.tickerMap.get("vBTC_vUSDC")
              ? parseFloat(d.tickerMap.get("vBTC_vUSDC")!.lastPx)
              : null
          }
        />
        <SignalList
          onSelect={d.setSelectedSignal}
          selected={d.selectedSignal?.id ?? null}
          tickers={d.tickers}
        />
      </div>
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
      <AIReasoning signal={d.displaySignal} liveDims={d.liveDims} />
      <DataSources />
    </>
  );
}

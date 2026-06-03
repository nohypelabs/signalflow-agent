"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import TradeHistory from "@/components/TradeHistory";

export default function TradeHistoryPage() {
  const d = useDashboard();
  const paper = usePaperTrading(d.isConnected ? d.address : undefined);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <TradeHistory
        orders={d.orders}
        ordersLoading={d.ordersLoading}
        ordersError={d.ordersError}
        tickers={d.tickers}
        liveSignals={d.liveSignals}
        paperTrades={paper.trades}
        paperStats={paper.stats}
        onExecuteSignal={d.handleExecuteSignal}
        onCancelOrder={d.cancelOrder}
      />
    </div>
  );
}

"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import TradeHistory from "@/components/TradeHistory";

export default function TradeHistoryRoute() {
  const d = useDashboard();
  const paper = usePaperTrading(d.isConnected ? d.address : undefined);

  return (
    <div className="mx-auto max-w-[1000px] w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-txt-primary tracking-tight">Trade History</h2>
        <p className="text-xs text-txt-muted mt-0.5">Track your open orders, filled trades, and paper trading performance metrics.</p>
      </div>
      <TradeHistory
        orders={d.orders}
        ordersLoading={d.ordersLoading}
        ordersError={d.ordersError}
        tickers={d.tickers}
        liveSignals={d.liveSignals}
        paperTrades={paper.trades}
        paperStats={paper.stats}
        onExecuteSignal={d.setExecutingSignal}
        onCancelOrder={d.cancelOrder}
      />
    </div>
  );
}

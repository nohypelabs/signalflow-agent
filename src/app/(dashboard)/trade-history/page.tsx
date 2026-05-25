"use client";

import { useDashboard } from "@/lib/dashboard-context";
import TradeHistory from "@/components/TradeHistory";

export default function TradeHistoryPage() {
  const d = useDashboard();
  return (
    <TradeHistory
      orders={d.orders}
      ordersLoading={d.ordersLoading}
      ordersError={d.ordersError}
      tickers={d.tickers}
      onExecuteSignal={d.handleExecuteSignal}
      onCancelOrder={d.cancelOrder}
    />
  );
}

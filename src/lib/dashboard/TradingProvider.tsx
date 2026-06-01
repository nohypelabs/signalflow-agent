"use client";

import { useMemo } from "react";
import { useTradeExecution } from "../hooks/useTradeExecution";

export function useTradingProviderState() {
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    refresh: refreshOrders,
    placeOrder,
    cancel: cancelOrder,
  } = useTradeExecution(true);

  const openOrders = useMemo(
    () => orders.filter((order) => order.status === "NEW" || order.status === "PARTIALLY_FILLED"),
    [orders],
  );

  return {
    orders,
    ordersLoading,
    ordersError,
    refreshOrders,
    placeOrder,
    cancelOrder,
    openOrders,
  };
}

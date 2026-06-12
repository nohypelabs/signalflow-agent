"use client";

import { useState, useCallback, useEffect } from "react";
import type { SoDEXOrder, SoDEXNewOrderRequest } from "../types/trade";
import { fetchOrders, placeOrder as apiPlaceOrder, cancelOrder as apiCancelOrder } from "../api/trades";

export type { SoDEXOrder, SoDEXNewOrderRequest };

export function useTradeExecution(autoRefresh = false) {
  const [orders, setOrders] = useState<SoDEXOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders();
      // External API can return [] , array of orders, or wrapped {orders: []} during transitions.
      // Always coerce to array to prevent .filter crashes (see hydration + perps migration).
      const list: SoDEXOrder[] = Array.isArray(data)
        ? data
        : (data as { orders?: SoDEXOrder[] })?.orders ?? [];
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
      setOrders([]); // keep state as array on error
    } finally {
      setLoading(false);
    }
  }, []);

  const placeOrder = useCallback(
    async (signedOrder: SoDEXNewOrderRequest & { signature?: string; userAddress?: string }) => {
      const result = await apiPlaceOrder(signedOrder);
      await refresh();
      return result;
    },
    [refresh],
  );

  const cancel = useCallback(async (orderId: number) => {
    await apiCancelOrder(orderId);
    setOrders((prev) => (Array.isArray(prev) ? prev.filter((o) => o.id !== orderId) : []));
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      refresh();
      const interval = setInterval(refresh, 30_000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refresh]);

  const openOrders = Array.isArray(orders)
    ? orders.filter((o) => o.status === "NEW" || o.status === "PARTIALLY_FILLED")
    : [];

  return { orders, openOrders, loading, error, refresh, placeOrder, cancel };
}

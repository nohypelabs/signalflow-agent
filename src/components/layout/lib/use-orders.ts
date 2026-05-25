"use client";

import { useState, useCallback, useEffect } from "react";
import type { SoDEXOrder, SoDEXNewOrderRequest } from "./sodex-types";

export function useOrders(autoRefresh = false) {
  const [orders, setOrders] = useState<SoDEXOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const placeOrder = useCallback(
    async (signedOrder: SoDEXNewOrderRequest & { signature?: string; userAddress?: string }) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signedOrder),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || "Order failed");
      }
      await refresh();
      return res.json();
    },
    [refresh],
  );

  const cancel = useCallback(async (orderId: number) => {
    const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Cancel failed");
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      refresh();
      const interval = setInterval(refresh, 30_000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refresh]);

  return { orders, loading, error, refresh, placeOrder, cancel };
}

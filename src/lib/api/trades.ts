import type { SoDEXOrder, SoDEXNewOrderRequest } from "../types/trade";

export async function fetchOrders(): Promise<SoDEXOrder[]> {
  const res = await fetch("/api/orders", { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function placeOrder(
  signedOrder: SoDEXNewOrderRequest & { signature?: string; userAddress?: string },
): Promise<unknown> {
  const orderWithId = {
    ...signedOrder,
    clientOrderId:
      "clientOrderId" in signedOrder && typeof signedOrder.clientOrderId === "string"
        ? signedOrder.clientOrderId
        : `sf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderWithId),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || "Order failed");
  }
  return res.json();
}

export async function cancelOrder(orderId: number): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Cancel failed" }));
    throw new Error(body.error || "Cancel failed");
  }
}

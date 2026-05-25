import type { SoDEXOrder, SoDEXNewOrderRequest } from "../types/trade";

export async function fetchOrders(): Promise<SoDEXOrder[]> {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function placeOrder(
  signedOrder: SoDEXNewOrderRequest & { signature?: string; userAddress?: string },
): Promise<unknown> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedOrder),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || "Order failed");
  }
  return res.json();
}

export async function cancelOrder(orderId: number): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Cancel failed");
}

import type { SoDEXOrder, SoDEXNewOrderRequest } from "../types/trade";
import { parseApiResponse } from "./client";

export async function fetchOrders(): Promise<SoDEXOrder[]> {
  const res = await fetch("/api/orders", { cache: "no-store" });
  return parseApiResponse(res);
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
  return parseApiResponse(res);
}

export async function cancelOrder(orderId: number): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
  await parseApiResponse(res);
}

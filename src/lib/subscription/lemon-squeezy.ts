/**
 * Lemon Squeezy REST API client.
 * Handles subscription lookups and customer management.
 */

const BASE = "https://api.lemonsqueezy.com/v1";

function apiKey(): string {
  const key = process.env.LEMON_SQUEEZY_API_KEY;
  if (!key) throw new Error("LEMON_SQUEEZY_API_KEY is not configured");
  return key;
}

async function lsFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LemonSqueezy ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json as T;
}

// ─── Types ───

export interface LSSubscription {
  id: string;
  type: "subscriptions";
  attributes: {
    store_id: string;
    customer_id: string;
    order_id: string;
    product_id: string;
    variant_id: string;
    status: "on_trial" | "active" | "paused" | "past_due" | "unpaid" | "cancelled" | "expired";
    trial_ends_at: string | null;
    renews_at: string;
    ends_at: string | null;
    created_at: string;
    updated_at: string;
    urls: {
      update_payment_method: string;
      customer_portal: string;
    };
    user_name: string;
    user_email: string;
  };
}

export interface LSOrder {
  id: string;
  type: "orders";
  attributes: {
    store_id: string;
    customer_id: string;
    identifier: string;
    user_name: string;
    user_email: string;
    status: "pending" | "failed" | "paid" | "refunded";
    total: number;
    currency: string;
    created_at: string;
    updated_at: string;
  };
}

interface LSResponse<T> {
  data: T;
  meta?: {
    page: number;
    pages: number;
  };
}

// ─── API Functions ───

/** Fetch a subscription by its Lemon Squeezy ID. */
export async function getSubscription(id: string): Promise<LSSubscription> {
  const res = await lsFetch<LSResponse<LSSubscription>>(`/subscriptions/${id}`);
  return res.data;
}

/** List subscriptions for a customer. */
export async function listCustomerSubscriptions(
  customerId: string,
): Promise<LSSubscription[]> {
  const res = await lsFetch<{ data: LSSubscription[] }>(
    `/subscriptions?filter[customer_id]=${customerId}`,
  );
  return res.data;
}

/** Cancel a subscription immediately or at period end. */
export async function cancelSubscription(
  id: string,
  atPeriodEnd = true,
): Promise<LSSubscription> {
  const body = atPeriodEnd
    ? { data: { type: "subscriptions", id, attributes: { cancelled: true } } }
    : { data: { type: "subscriptions", id, attributes: { status: "cancelled" } } };

  const res = await lsFetch<LSResponse<LSSubscription>>(`/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.data;
}

/** Map a Lemon Squeezy variant ID to our SubscriptionTier. */
export function variantIdToTier(variantId: string): "PRO" | "WHALE" {
  const proVariant = process.env.LEMON_SQUEEZY_PRO_VARIANT_ID;
  const whaleVariant = process.env.LEMON_SQUEEZY_WHALE_VARIANT_ID;

  if (variantId === whaleVariant) return "WHALE";
  if (variantId === proVariant) return "PRO";
  // Default to PRO if unknown
  return "PRO";
}

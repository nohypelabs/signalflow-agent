/**
 * Lemon Squeezy webhook event processor.
 * Dispatches subscription lifecycle events to database updates.
 */

import { getPrismaClient } from "@/lib/db/client";
import type { LSSubscription } from "./lemon-squeezy";
import { variantIdToTier } from "./lemon-squeezy";

type LemonSqueezyEvent =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_expired"
  | "subscription_payment_failed"
  | "subscription_payment_recovered"
  | "subscription_paused"
  | "subscription_resumed"
  | "order_created";

interface WebhookPayload {
  meta: {
    event_name: LemonSqueezyEvent;
    custom_data?: Record<string, string>;
  };
  data: LSSubscription;
}

/** Map Lemon Squeezy subscription status to our internal status. */
function mapStatus(status: LSSubscription["attributes"]["status"]): string {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "on_trial":
      return "TRIAL";
    case "paused":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "PAST_DUE";
    case "cancelled":
      return "CANCELED";
    case "expired":
      return "EXPIRED";
    default:
      return "ACTIVE";
  }
}

/** Extract wallet address from webhook custom data or user email. */
function extractWalletAddress(payload: WebhookPayload): string | null {
  // Prefer custom_data wallet address (set during checkout)
  const customWallet = payload.meta.custom_data?.wallet_address;
  if (customWallet) return customWallet;

  // Fallback: wallet might be stored in user_email field
  const email = payload.data.attributes.user_email;
  if (email?.startsWith("0x") && email.length === 42) return email;

  return null;
}

/** Process a Lemon Squeezy webhook event. */
export async function handleWebhookEvent(
  payload: WebhookPayload,
): Promise<{ success: boolean; action: string }> {
  const prisma = getPrismaClient();
  const event = payload.meta.event_name;
  const lsData = payload.data;
  const attrs = lsData.attributes;

  // Only process subscription events
  if (event === "order_created") {
    return { success: true, action: "order_recorded" };
  }

  const walletAddress = extractWalletAddress(payload);
  if (!walletAddress) {
    return { success: false, action: "no_wallet_address" };
  }

  const normalizedWallet = walletAddress.toLowerCase();

  // Ensure WalletProfile exists
  const profile = await prisma.walletProfile.upsert({
    where: { normalizedWallet },
    create: {
      walletAddress,
      normalizedWallet,
      lastSeenAt: new Date(),
    },
    update: { lastSeenAt: new Date() },
  });

  const tier = variantIdToTier(attrs.variant_id);

  switch (event) {
    case "subscription_created": {
      await prisma.subscription.upsert({
        where: { walletProfileId: profile.id },
        create: {
          walletProfileId: profile.id,
          tier,
          status: "ACTIVE",
          lemonSqueezyId: lsData.id,
          lemonSqueezyOrderId: attrs.order_id,
          lemonSqueezyProductId: attrs.product_id,
          lemonSqueezyVariantId: attrs.variant_id,
          lemonSqueezyCustomerId: attrs.customer_id,
          currentPeriodStart: new Date(attrs.created_at),
          currentPeriodEnd: new Date(attrs.renews_at),
          trialEndsAt: attrs.trial_ends_at ? new Date(attrs.trial_ends_at) : null,
        },
        update: {
          tier,
          status: mapStatus(attrs.status) as "ACTIVE",
          lemonSqueezyId: lsData.id,
          lemonSqueezyOrderId: attrs.order_id,
          lemonSqueezyProductId: attrs.product_id,
          lemonSqueezyVariantId: attrs.variant_id,
          lemonSqueezyCustomerId: attrs.customer_id,
          currentPeriodEnd: new Date(attrs.renews_at),
          cancelAtPeriodEnd: false,
        },
      });
      return { success: true, action: "subscription_created" };
    }

    case "subscription_updated": {
      await prisma.subscription.updateMany({
        where: {
          lemonSqueezyId: lsData.id,
        },
        data: {
          tier,
          status: mapStatus(attrs.status) as "ACTIVE",
          lemonSqueezyVariantId: attrs.variant_id,
          currentPeriodEnd: new Date(attrs.renews_at),
          cancelAtPeriodEnd: false,
        },
      });
      return { success: true, action: "subscription_updated" };
    }

    case "subscription_cancelled": {
      await prisma.subscription.updateMany({
        where: { lemonSqueezyId: lsData.id },
        data: {
          cancelAtPeriodEnd: true,
          status: "CANCELED",
        },
      });
      return { success: true, action: "subscription_cancelled" };
    }

    case "subscription_expired": {
      await prisma.subscription.updateMany({
        where: { lemonSqueezyId: lsData.id },
        data: {
          status: "EXPIRED",
          tier: "FREE",
        },
      });
      return { success: true, action: "subscription_expired" };
    }

    case "subscription_payment_failed": {
      await prisma.subscription.updateMany({
        where: { lemonSqueezyId: lsData.id },
        data: { status: "PAST_DUE" },
      });
      return { success: true, action: "subscription_payment_failed" };
    }

    case "subscription_payment_recovered": {
      await prisma.subscription.updateMany({
        where: { lemonSqueezyId: lsData.id },
        data: { status: "ACTIVE" },
      });
      return { success: true, action: "subscription_payment_recovered" };
    }

    case "subscription_paused": {
      // Keep the tier but note the pause
      await prisma.subscription.updateMany({
        where: { lemonSqueezyId: lsData.id },
        data: { status: "PAST_DUE" },
      });
      return { success: true, action: "subscription_paused" };
    }

    case "subscription_resumed": {
      await prisma.subscription.updateMany({
        where: { lemonSqueezyId: lsData.id },
        data: { status: "ACTIVE" },
      });
      return { success: true, action: "subscription_resumed" };
    }

    default:
      return { success: false, action: "unknown_event" };
  }
}

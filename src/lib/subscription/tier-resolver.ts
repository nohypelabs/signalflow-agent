/**
 * Effective tier resolution.
 * Determines the actual subscription tier accounting for trials, grace periods, and cancellation.
 */

import { getPrismaClient } from "@/lib/db/client";
import type { SubscriptionTier } from "@/lib/api-auth/context";
import { TIER_CONFIGS } from "@/lib/api-v1/tier-limits";

const GRACE_PERIOD_DAYS = 3;

export interface TierResolution {
  tier: SubscriptionTier;
  gracePeriod: boolean;
}

/** Resolve the effective subscription tier for a wallet profile. */
export async function resolveEffectiveTier(
  walletProfileId: string,
): Promise<TierResolution> {
  const prisma = getPrismaClient();

  const subscription = await prisma.subscription.findUnique({
    where: { walletProfileId },
    select: {
      tier: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  // No subscription record → FREE
  if (!subscription) {
    return { tier: "FREE", gracePeriod: false };
  }

  const now = new Date();

  // Explicitly expired → FREE
  if (subscription.status === "EXPIRED") {
    return { tier: "FREE", gracePeriod: false };
  }

  // Active or trial → check period dates
  if (subscription.status === "ACTIVE" || subscription.status === "TRIAL") {
    // Trial still valid
    if (
      subscription.status === "TRIAL" &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt > now
    ) {
      return { tier: subscription.tier as SubscriptionTier, gracePeriod: false };
    }

    // Period still valid
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
      return { tier: subscription.tier as SubscriptionTier, gracePeriod: false };
    }

    // Period ended but status not yet updated — grace period
    return { tier: subscription.tier as SubscriptionTier, gracePeriod: true };
  }

  // Canceled but period not ended yet
  if (subscription.status === "CANCELED" && subscription.cancelAtPeriodEnd) {
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
      return { tier: subscription.tier as SubscriptionTier, gracePeriod: false };
    }
    return { tier: "FREE", gracePeriod: false };
  }

  // Past due — check grace period
  if (subscription.status === "PAST_DUE") {
    const periodEnd = subscription.currentPeriodEnd ?? new Date(0);
    const graceDeadline = new Date(
      periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    if (now < graceDeadline) {
      return { tier: subscription.tier as SubscriptionTier, gracePeriod: true };
    }

    // Grace period expired → downgrade to FREE
    await prisma.subscription.update({
      where: { walletProfileId },
      data: { status: "EXPIRED" },
    });

    return { tier: "FREE", gracePeriod: false };
  }

  // Default fallback
  return { tier: "FREE", gracePeriod: false };
}

/** Get the tier config for a wallet profile (convenience wrapper). */
export async function resolveTierConfig(walletProfileId: string): Promise<{
  tier: SubscriptionTier;
  tierConfig: (typeof TIER_CONFIGS)[SubscriptionTier];
  gracePeriod: boolean;
}> {
  const { tier, gracePeriod } = await resolveEffectiveTier(walletProfileId);
  return { tier, tierConfig: TIER_CONFIGS[tier], gracePeriod };
}

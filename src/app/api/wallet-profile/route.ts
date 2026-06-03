import { z } from "zod";
import { jsonNoCache } from "@/lib/api/no-cache";
import { upsertWalletProfile } from "@/lib/db/wallet-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const walletProfileRequest = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
});

export async function POST(req: Request) {
  const parsed = walletProfileRequest.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return jsonNoCache(
      {
        error: "Invalid wallet profile request",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const profile = await upsertWalletProfile(parsed.data.address);

    return jsonNoCache({
      profile: {
        id: profile.id,
        walletAddress: profile.walletAddress,
        normalizedWallet: profile.normalizedWallet,
        lastSeenAt: profile.lastSeenAt?.toISOString() ?? null,
        paperAccountId: profile.paperAccount?.id ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet profile sync failed";
    const missingDb = message.includes("DATABASE_URL");

    return jsonNoCache(
      {
        error: missingDb ? "Database is not configured" : "Wallet profile sync failed",
        detail: missingDb ? "Set DATABASE_URL before using wallet profile persistence." : message,
      },
      { status: missingDb ? 503 : 500 },
    );
  }
}

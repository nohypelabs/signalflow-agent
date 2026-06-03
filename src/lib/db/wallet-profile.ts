import { getPrismaClient } from "./client";

export function normalizeWalletAddress(address: string) {
  return address.trim().toLowerCase();
}

export async function upsertWalletProfile(address: string) {
  const prisma = getPrismaClient();
  const walletAddress = address.trim();
  const normalizedWallet = normalizeWalletAddress(walletAddress);

  return prisma.walletProfile.upsert({
    where: { normalizedWallet },
    create: {
      walletAddress,
      normalizedWallet,
      lastSeenAt: new Date(),
      paperAccount: {
        create: {},
      },
    },
    update: {
      walletAddress,
      lastSeenAt: new Date(),
    },
    include: {
      paperAccount: true,
    },
  });
}

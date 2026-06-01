import { jsonNoCache } from "@/lib/api/no-cache";

export interface TradingAuthContext {
  authorized: false;
  userId: null;
  walletAddress: null;
}

export async function requireTradingAuthorization(
  req: Request,
): Promise<TradingAuthContext | Response> {
  void req;
  return jsonNoCache(
    {
      error:
        "Live trading is disabled until wallet-signature authentication and order ownership checks are implemented.",
    },
    { status: 403 },
  );
}

export function verifyOrderOwnership(
  auth: TradingAuthContext,
  orderId?: number,
): boolean {
  void auth;
  void orderId;
  return false;
}

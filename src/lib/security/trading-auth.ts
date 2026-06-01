import { apiError } from "@/lib/api/response";

export interface TradingAuthContext {
  authorized: false;
  userId: null;
  walletAddress: null;
}

export async function requireTradingAuthorization(
  req: Request,
): Promise<TradingAuthContext | Response> {
  void req;
  return apiError(
    "Live trading is disabled until wallet-signature authentication and order ownership checks are implemented.",
    403,
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

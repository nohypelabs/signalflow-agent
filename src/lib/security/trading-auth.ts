import { apiError } from "@/lib/api/response";

export interface TradingAuthContext {
  authorized: true;
  walletAddress: string;
  apiKeyName: string;
  apiKeyPrivate: string;
}

export async function requireTradingAuthorization(
  req: Request,
): Promise<TradingAuthContext | Response> {
  const walletAddress = req.headers.get("x-wallet-address")?.trim();
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return apiError("Valid wallet address required in x-wallet-address header.", 401);
  }

  const apiKeyName = process.env.SODEX_API_KEY_NAME;
  const apiKeyPrivate = process.env.SODEX_API_KEY_PRIVATE;
  if (!apiKeyName || !apiKeyPrivate) {
    return apiError("SoDEX API key not configured on server.", 503);
  }

  return { authorized: true, walletAddress, apiKeyName, apiKeyPrivate };
}

export function verifyOrderOwnership(
  auth: TradingAuthContext,
  orderOwner?: string,
): boolean {
  if (!orderOwner) return true;
  return auth.walletAddress.toLowerCase() === orderOwner.toLowerCase();
}

import type { TypedDataDefinition } from "viem";

export const SODEX_CHAIN_ID = 286623;

// ── Spot domain (legacy) ─────────────────────────────────

export const spotDomain = {
  name: "spot",
  version: "1",
  chainId: SODEX_CHAIN_ID,
  verifyingContract: "0x0000000000000000000000000000000000000000",
} as const;

export const spotOrderTypes = {
  NewOrder: [
    { name: "symbol", type: "string" },
    { name: "side", type: "string" },
    { name: "orderType", type: "string" },
    { name: "quantity", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
} as const;

export const spotOrderPrimaryType = "NewOrder";

export function buildOrderTypedData(order: {
  symbol: string;
  side: string;
  orderType: string;
  quantity: string;
  timestamp: number;
}): TypedDataDefinition<typeof spotOrderTypes, typeof spotOrderPrimaryType> {
  return {
    domain: spotDomain,
    types: spotOrderTypes,
    primaryType: spotOrderPrimaryType,
    message: {
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      quantity: order.quantity,
      timestamp: BigInt(order.timestamp),
    },
  };
}

// ── Perps domain (SoDEX futures) ─────────────────────────

export const perpsDomain = {
  name: "futures",
  version: "1",
  chainId: SODEX_CHAIN_ID,
  verifyingContract: "0x0000000000000000000000000000000000000000",
} as const;

export const exchangeActionTypes = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const exchangeActionPrimaryType = "ExchangeAction";

/**
 * Build EIP-712 typed data for SoDEX perps order signing.
 *
 * The payloadHash is keccak256 of the compact JSON {type, params}.
 * The API key's private key signs this; the signature goes in X-API-Sign.
 */
export function buildPerpsActionTypedData(payloadHash: `0x${string}`, nonce: number): TypedDataDefinition<
  typeof exchangeActionTypes,
  typeof exchangeActionPrimaryType
> {
  return {
    domain: perpsDomain,
    types: exchangeActionTypes,
    primaryType: exchangeActionPrimaryType,
    message: {
      payloadHash,
      nonce: BigInt(nonce),
    },
  };
}

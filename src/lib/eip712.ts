import type { TypedDataDefinition } from "viem";

export const SODEX_CHAIN_ID = 286623;

// TODO: verify domain fields + verifyingContract against SoDEX API docs
export const spotDomain = {
  name: "spot",
  version: "1",
  chainId: SODEX_CHAIN_ID,
  verifyingContract: "0x0000000000000000000000000000000000000000",
} as const;

// TODO: verify field names and ordering match SoDEX Go structs exactly
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

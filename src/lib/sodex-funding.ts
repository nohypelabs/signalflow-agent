import { keccak256, toBytes } from "viem";

export const SODEX_MAINNET_CHAIN_ID = 286623;
export const SODEX_TRANSFER_ACCOUNT_ID = 999;

export type FundingDirection = "deposit" | "withdraw";

export interface SoDEXFundingTransfer {
  id: number;
  fromAccountID: number;
  toAccountID: number;
  coinID: number;
  amount: string;
  type: 3 | 5;
}

export const exchangeActionTypes = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

export function fundingDomainName(direction: FundingDirection): "spot" | "futures" {
  return direction === "deposit" ? "spot" : "futures";
}

export function fundingTransferType(direction: FundingDirection): 3 | 5 {
  return direction === "deposit" ? 3 : 5;
}

export function fundingTypedDataDomain(direction: FundingDirection) {
  return {
    name: fundingDomainName(direction),
    version: "1",
    chainId: SODEX_MAINNET_CHAIN_ID,
    verifyingContract: "0x0000000000000000000000000000000000000000" as const,
  };
}

export function fundingPayloadHash(transfer: SoDEXFundingTransfer) {
  return keccak256(toBytes(JSON.stringify({ type: "transferAsset", params: transfer })));
}

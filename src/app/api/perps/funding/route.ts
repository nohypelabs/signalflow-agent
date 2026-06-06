import { NextRequest } from "next/server";
import { formatUnits, parseUnits, recoverTypedDataAddress } from "viem";
import { z } from "zod";
import { jsonNoCache } from "@/lib/api/no-cache";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  exchangeActionTypes,
  fundingPayloadHash,
  fundingTransferType,
  fundingTypedDataDomain,
  SODEX_MAINNET_CHAIN_ID,
  SODEX_TRANSFER_ACCOUNT_ID,
  type FundingDirection,
  type SoDEXFundingTransfer,
} from "@/lib/sodex-funding";

export const dynamic = "force-dynamic";

const SPOT_ENDPOINT = "https://mainnet-gw.sodex.dev/api/v1/spot";
const PERPS_ENDPOINT = "https://mainnet-gw.sodex.dev/api/v1/perps";
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const DECIMAL_AMOUNT = /^(0|[1-9]\d*)(\.\d+)?$/;

interface SoDEXEnvelope<T> {
  code?: number;
  error?: string;
  message?: string;
  data?: T;
}

interface SoDEXCoin {
  id: number;
  name: string;
  precision: number;
}

interface SoDEXBalance {
  id: number;
  coin: string;
  total: string;
  locked?: string;
}

interface SoDEXSpotBalanceCompact {
  i: number;
  a: string;
  t: string;
  l: string;
}

interface SoDEXPerpsBalanceCompact {
  i: number;
  a: string;
  wb: string;
  aw: string;
}

interface SoDEXAccountState {
  user?: string;
  aid?: number;
  accountID?: number;
  blockTime?: number;
  blockHeight?: number;
  balances?: SoDEXBalance[];
  B?: Array<SoDEXSpotBalanceCompact | SoDEXPerpsBalanceCompact>;
}

interface FundingAccount {
  accountID: number;
  coinID: number;
  coin: string;
  precision: number;
  total: string;
  available: string;
  blockTime?: number;
  blockHeight?: number;
}

interface FundingSnapshot {
  chainId: number;
  network: "mainnet";
  spot: FundingAccount;
  perps: FundingAccount;
}

const transferSchema = z.object({
  id: z.number().int().positive().safe(),
  fromAccountID: z.number().int().nonnegative().safe(),
  toAccountID: z.literal(SODEX_TRANSFER_ACCOUNT_ID),
  coinID: z.number().int().nonnegative().safe(),
  amount: z.string().trim().regex(DECIMAL_AMOUNT),
  type: z.union([z.literal(3), z.literal(5)]),
}).strict();

const fundingRequestSchema = z.object({
  address: z.string().trim().regex(EVM_ADDRESS),
  direction: z.enum(["deposit", "withdraw"]),
  nonce: z.number().int().positive().safe(),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
  transfer: transferSchema,
}).strict();

async function sodexRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  const body = await response.json().catch(() => null) as SoDEXEnvelope<T> | null;

  if (!response.ok || !body || body.code !== 0 || body.data === undefined) {
    throw new Error(body?.error || body?.message || `SoDEX ${response.status}`);
  }

  return body.data;
}

function accountID(state: SoDEXAccountState): number {
  const value = state.aid ?? state.accountID;
  if (!Number.isSafeInteger(value) || value === undefined || value < 0) {
    throw new Error("SoDEX account ID is unavailable for this wallet");
  }
  return value;
}

function isUsdc(coin: string) {
  return coin.toUpperCase().replace(/^V/, "") === "USDC";
}

function decimalLength(value: string) {
  return value.split(".")[1]?.length ?? 0;
}

function truncatePositiveDecimal(value: string, precision: number) {
  if (value.startsWith("-")) return "0";
  const [whole, fraction = ""] = value.split(".");
  const truncated = fraction.slice(0, precision).replace(/0+$/, "");
  const result = truncated ? `${whole}.${truncated}` : whole;
  return /^0(?:\.0+)?$/.test(result) ? "0" : result;
}

function subtractDecimals(total: string, locked: string, precision: number) {
  const scale = Math.max(decimalLength(total), decimalLength(locked));
  const available = parseUnits(total, scale) - parseUnits(locked, scale);
  return truncatePositiveDecimal(
    formatUnits(available > BigInt(0) ? available : BigInt(0), scale),
    precision,
  );
}

function toFundingAccount(
  state: SoDEXAccountState,
  coins: SoDEXCoin[],
  venue: "Spot" | "Perps",
): FundingAccount {
  const coin = coins.find((candidate) => isUsdc(candidate.name));
  if (!coin) throw new Error(`${venue} USDC market is unavailable`);

  const expandedBalance = state.balances?.find((candidate) => (
    candidate.id === coin.id || isUsdc(candidate.coin)
  ));
  const compactBalance = state.B?.find((candidate) => (
    candidate.i === coin.id || isUsdc(candidate.a)
  ));

  let total = expandedBalance?.total ?? "0";
  let available = total;
  if (venue === "Spot") {
    const spotBalance = compactBalance as SoDEXSpotBalanceCompact | undefined;
    total = expandedBalance?.total ?? spotBalance?.t ?? "0";
    const locked = expandedBalance?.locked ?? spotBalance?.l ?? "0";
    available = subtractDecimals(total, locked, coin.precision);
  } else {
    const perpsBalance = compactBalance as SoDEXPerpsBalanceCompact | undefined;
    total = expandedBalance?.total ?? perpsBalance?.wb ?? "0";
    available = truncatePositiveDecimal(perpsBalance?.aw ?? total, coin.precision);
  }

  return {
    accountID: accountID(state),
    coinID: coin.id,
    coin: coin.name,
    precision: coin.precision,
    total,
    available,
    blockTime: state.blockTime,
    blockHeight: state.blockHeight,
  };
}

async function getFundingSnapshot(address: string): Promise<FundingSnapshot> {
  const encodedAddress = encodeURIComponent(address);
  const [spotState, perpsState, spotCoins, perpsCoins] = await Promise.all([
    sodexRequest<SoDEXAccountState>(`${SPOT_ENDPOINT}/accounts/${encodedAddress}/state`),
    sodexRequest<SoDEXAccountState>(`${PERPS_ENDPOINT}/accounts/${encodedAddress}/state`),
    sodexRequest<SoDEXCoin[]>(`${SPOT_ENDPOINT}/markets/coins`),
    sodexRequest<SoDEXCoin[]>(`${PERPS_ENDPOINT}/markets/coins`),
  ]);

  if (
    spotState.user?.toLowerCase() !== address.toLowerCase()
    || perpsState.user?.toLowerCase() !== address.toLowerCase()
  ) {
    throw new Error("This wallet does not have an active SoDEX account");
  }

  return {
    chainId: SODEX_MAINNET_CHAIN_ID,
    network: "mainnet",
    spot: toFundingAccount(spotState, spotCoins, "Spot"),
    perps: toFundingAccount(perpsState, perpsCoins, "Perps"),
  };
}

function decimalPlaces(amount: string) {
  return amount.split(".")[1]?.length ?? 0;
}

function sourceAccount(snapshot: FundingSnapshot, direction: FundingDirection) {
  return direction === "deposit" ? snapshot.spot : snapshot.perps;
}

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address || !EVM_ADDRESS.test(address)) {
    return jsonNoCache({ error: "Valid wallet address is required" }, { status: 400 });
  }

  try {
    return jsonNoCache(await getFundingSnapshot(address));
  } catch (error) {
    return jsonNoCache(
      { error: error instanceof Error ? error.message : "SoDEX funding status unavailable" },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  try {
    const parsed = fundingRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return jsonNoCache(
        { error: "Invalid funding transfer", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { address, direction, nonce, signature, transfer } = parsed.data;
    const now = Date.now();
    if (Math.abs(now - nonce) > 5 * 60_000 || transfer.id !== nonce) {
      return jsonNoCache({ error: "Expired or mismatched transfer nonce" }, { status: 400 });
    }

    const snapshot = await getFundingSnapshot(address);
    const source = sourceAccount(snapshot, direction);
    if (
      transfer.fromAccountID !== source.accountID
      || transfer.coinID !== source.coinID
      || transfer.type !== fundingTransferType(direction)
    ) {
      return jsonNoCache({ error: "Transfer does not match the connected SoDEX account" }, { status: 400 });
    }

    if (decimalPlaces(transfer.amount) > source.precision || Number(transfer.amount) <= 0) {
      return jsonNoCache({ error: `Amount must be positive with at most ${source.precision} decimals` }, { status: 400 });
    }

    if (Number(transfer.amount) > Number(source.available)) {
      return jsonNoCache({ error: `Insufficient ${direction === "deposit" ? "Spot" : "Perps"} balance` }, { status: 400 });
    }

    const recoveredAddress = await recoverTypedDataAddress({
      domain: fundingTypedDataDomain(direction),
      types: exchangeActionTypes,
      primaryType: "ExchangeAction",
      message: {
        payloadHash: fundingPayloadHash(transfer as SoDEXFundingTransfer),
        nonce: BigInt(nonce),
      },
      signature: signature as `0x${string}`,
    });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return jsonNoCache({ error: "Funding signature does not match the connected wallet" }, { status: 401 });
    }

    const endpoint = direction === "deposit" ? SPOT_ENDPOINT : PERPS_ENDPOINT;
    const result = await sodexRequest<{ id: number }>(`${endpoint}/accounts/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Sign": `0x01${signature.slice(2)}`,
        "X-API-Nonce": String(nonce),
      },
      body: JSON.stringify(transfer),
    });

    return jsonNoCache({
      success: true,
      direction,
      amount: transfer.amount,
      source: direction === "deposit" ? "Spot" : "Perps",
      destination: direction === "deposit" ? "Perps" : "Spot",
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SoDEX funding transfer failed";
    console.error("[/api/perps/funding POST]", message);
    return jsonNoCache({ error: message }, { status: 502 });
  }
}

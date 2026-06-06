"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useChainId, useSignTypedData, useSwitchChain } from "wagmi";
import { parseApiResponse } from "@/lib/api/client";
import {
  exchangeActionTypes,
  fundingPayloadHash,
  fundingTransferType,
  fundingTypedDataDomain,
  SODEX_TRANSFER_ACCOUNT_ID,
  type FundingDirection,
  type SoDEXFundingTransfer,
} from "@/lib/sodex-funding";
import type { SoDEXPerpsPosition } from "@/lib/sodex-perps";
import { valuechain } from "@/lib/wallet-config";

interface PerpsAccountStatus {
  positions?: SoDEXPerpsPosition[];
  blockTime?: number;
  blockHeight?: number;
  source?: string;
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

interface Props {
  address?: string | null;
  isConnected: boolean;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatBalance(value?: string) {
  const amount = toNumber(value);
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatBlockTime(value?: number) {
  if (!value) return "Not synced";
  const ms = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function normalizeAmount(value: string, precision: number) {
  const trimmed = value.trim();
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a valid amount");
  }

  const [whole, rawFraction = ""] = trimmed.split(".");
  if (rawFraction.length > precision) {
    throw new Error(`Maximum ${precision} decimal places`);
  }

  const fraction = rawFraction.replace(/0+$/, "");
  const normalized = fraction ? `${whole}.${fraction}` : whole;
  if (Number(normalized) <= 0) throw new Error("Amount must be greater than zero");
  return normalized;
}

export default function FuturesFundingPanel({ address, isConnected }: Props) {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const [mode, setMode] = useState<FundingDirection>("deposit");
  const [amount, setAmount] = useState("");
  const [funding, setFunding] = useState<FundingSnapshot | null>(null);
  const [status, setStatus] = useState<PerpsAccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!address) {
      setFunding(null);
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fundingResponse = await fetch(
        `/api/perps/funding?address=${encodeURIComponent(address)}`,
        { cache: "no-store" },
      );
      setFunding(await parseApiResponse<FundingSnapshot>(fundingResponse));

      const positionsResponse = await fetch(
        `/api/perps/positions?address=${encodeURIComponent(address)}`,
        { cache: "no-store" },
      );
      setStatus(await parseApiResponse<PerpsAccountStatus>(positionsResponse));
    } catch (loadError) {
      setFunding(null);
      setStatus(null);
      setError(loadError instanceof Error ? loadError.message : "SoDEX funding status unavailable");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const positions = useMemo(() => status?.positions ?? [], [status]);
  const openPositions = useMemo(() => {
    return positions.filter((position) => {
      const qty = toNumber(position.quantity ?? position.size ?? position.positionAmt);
      return Math.abs(qty) > 0;
    });
  }, [positions]);

  const exposure = useMemo(() => {
    return openPositions.reduce((total, position) => {
      const qty = Math.abs(toNumber(position.quantity ?? position.size ?? position.positionAmt));
      const mark = toNumber(position.markPrice ?? position.entryPrice);
      return total + qty * mark;
    }, 0);
  }, [openPositions]);

  const source = mode === "deposit" ? funding?.spot : funding?.perps;
  const destination = mode === "deposit" ? funding?.perps : funding?.spot;
  const sourceLabel = mode === "deposit" ? "Spot" : "Perps";
  const destinationLabel = mode === "deposit" ? "Perps" : "Spot";
  const canSubmit = Boolean(
    isConnected
    && address
    && funding
    && source
    && toNumber(amount) > 0
    && !submitting,
  );

  const selectMode = (nextMode: FundingDirection) => {
    setMode(nextMode);
    setAmount("");
    setError(null);
    setSuccess(null);
  };

  const handleTransfer = async () => {
    if (!canSubmit || !address || !source) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedAmount = normalizeAmount(amount, source.precision);
      if (Number(normalizedAmount) > Number(source.available)) {
        throw new Error(`Insufficient ${sourceLabel} balance`);
      }

      if (chainId !== valuechain.id) {
        await switchChainAsync({ chainId: valuechain.id });
      }

      const nonce = Date.now();
      const transfer: SoDEXFundingTransfer = {
        id: nonce,
        fromAccountID: source.accountID,
        toAccountID: SODEX_TRANSFER_ACCOUNT_ID,
        coinID: source.coinID,
        amount: normalizedAmount,
        type: fundingTransferType(mode),
      };

      const signature = await signTypedDataAsync({
        account: address as `0x${string}`,
        domain: fundingTypedDataDomain(mode),
        types: exchangeActionTypes,
        primaryType: "ExchangeAction",
        message: {
          payloadHash: fundingPayloadHash(transfer),
          nonce: BigInt(nonce),
        },
      });

      const response = await fetch("/api/perps/funding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          direction: mode,
          nonce,
          signature,
          transfer,
        }),
      });
      await parseApiResponse(response);

      setAmount("");
      setSuccess(`${normalizedAmount} USDC transferred ${sourceLabel} → ${destinationLabel}`);
      await loadStatus();
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : "Funding transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-border-default bg-card px-3 py-3">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-txt-muted">Futures Funding</p>
          <p className="mt-0.5 text-[10px] text-txt-secondary">Native SoDEX Spot ↔ Perps transfer</p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={!address || loading || submitting}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-default bg-inset text-txt-muted transition-colors hover:border-hold/30 hover:text-hold disabled:cursor-not-allowed disabled:opacity-40"
          title="Refresh SoDEX balances"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-xl border border-border-default bg-inset p-1">
        <button
          type="button"
          onClick={() => selectMode("deposit")}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[10px] font-bold transition-all ${
            mode === "deposit"
              ? "border-buy/30 bg-buy/10 text-buy"
              : "border-transparent text-txt-muted hover:bg-elevated/40 hover:text-txt-primary"
          }`}
        >
          <ArrowDownToLine size={12} />
          Deposit to Perps
        </button>
        <button
          type="button"
          onClick={() => selectMode("withdraw")}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[10px] font-bold transition-all ${
            mode === "withdraw"
              ? "border-sell/30 bg-sell/10 text-sell"
              : "border-transparent text-txt-muted hover:bg-elevated/40 hover:text-txt-primary"
          }`}
        >
          <ArrowUpFromLine size={12} />
          Withdraw to Spot
        </button>
      </div>

      <div className="mb-2.5 flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-lg border border-border-default bg-inset px-2.5 py-2">
          <p className="text-[8px] uppercase tracking-wider text-txt-muted">{sourceLabel} Available</p>
          <p className="mt-1 truncate font-mono text-[11px] font-bold text-txt-primary">
            {formatBalance(source?.available)} USDC
          </p>
        </div>
        <ArrowRight size={13} className="shrink-0 text-hold" />
        <div className="min-w-0 flex-1 rounded-lg border border-border-default bg-inset px-2.5 py-2">
          <p className="text-[8px] uppercase tracking-wider text-txt-muted">{destinationLabel} Balance</p>
          <p className="mt-1 truncate font-mono text-[11px] font-bold text-txt-primary">
            {formatBalance(destination?.total)} USDC
          </p>
        </div>
      </div>

      <label className="mb-2.5 block">
        <span className="mb-1.5 flex items-center justify-between text-[9px] font-medium text-txt-secondary">
          Transfer amount
          <button
            type="button"
            onClick={() => setAmount(source?.available ?? "")}
            disabled={!source || toNumber(source.available) <= 0}
            className="cursor-pointer font-bold text-hold hover:text-hold/80 disabled:cursor-not-allowed disabled:text-txt-dim"
          >
            MAX
          </button>
        </span>
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-inset px-3 py-2 transition-all focus-within:border-hold/50 focus-within:ring-2 focus-within:ring-hold/10">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
              setSuccess(null);
            }}
            placeholder="0.00"
            className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold text-txt-primary outline-none placeholder:text-txt-dim"
          />
          <span className="text-[9px] font-semibold text-txt-muted">USDC</span>
        </div>
      </label>

      <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-hold/25 bg-hold/[0.06] px-2.5 py-2">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-hold" />
        <p className="text-[8px] leading-relaxed text-txt-secondary">
          No redirect and no private key upload. Your wallet signs the exact SoDEX transfer payload,
          then SignalFlow verifies the signer before forwarding it.
        </p>
      </div>

      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-border-default bg-inset px-2 py-2">
          <p className="text-[8px] uppercase tracking-wider text-txt-muted">Wallet</p>
          <p className="mt-1 truncate font-mono text-[10px] font-semibold text-txt-secondary">
            {address ? shortAddress(address) : "Disconnected"}
          </p>
        </div>
        <div className="rounded-lg border border-border-default bg-inset px-2 py-2">
          <p className="text-[8px] uppercase tracking-wider text-txt-muted">Positions</p>
          <p className="mt-1 font-mono text-[10px] font-bold text-txt-primary">{openPositions.length}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-inset px-2 py-2">
          <p className="text-[8px] uppercase tracking-wider text-txt-muted">Exposure</p>
          <p className="mt-1 truncate font-mono text-[10px] font-bold text-txt-primary">
            {exposure > 0 ? formatUsd(exposure) : "-"}
          </p>
        </div>
      </div>

      <div className="mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-border-default bg-elevated/15 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Wallet size={12} className={isConnected ? "text-buy" : "text-txt-dim"} />
          <span className="truncate text-[9px] text-txt-secondary">
            {`${status?.source ?? "SoDEX Perps"} sync ${formatBlockTime(status?.blockTime)}`}
          </span>
        </div>
        {status?.blockHeight && (
          <span className="shrink-0 font-mono text-[8px] text-txt-muted">#{status.blockHeight}</span>
        )}
      </div>

      {error && (
        <div className="mb-2.5 rounded-lg border border-sell/25 bg-sell/[0.06] px-2.5 py-2 text-[9px] leading-relaxed text-sell">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-buy/25 bg-buy/[0.06] px-2.5 py-2 text-[9px] text-buy">
          <CheckCircle2 size={12} />
          {success}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleTransfer()}
        disabled={!canSubmit}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
          canSubmit
            ? "cursor-pointer border-hold/35 bg-hold/10 text-hold hover:border-hold/50 hover:bg-hold/15 active:scale-[0.985]"
            : "cursor-not-allowed border-border-default bg-inset text-txt-dim"
        }`}
      >
        {submitting && <Loader2 size={13} className="animate-spin" />}
        {!isConnected
          ? "Connect Wallet for Funding"
          : submitting
            ? "Confirming SoDEX Transfer"
            : `Sign & ${mode === "deposit" ? "Deposit to Perps" : "Withdraw to Spot"}`}
      </button>
    </section>
  );
}

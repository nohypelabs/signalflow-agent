"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Wallet } from "lucide-react";
import { parseApiResponse } from "@/lib/api/client";
import type { SoDEXPerpsPosition } from "@/lib/sodex-perps";

type FundingMode = "deposit" | "withdraw";

interface PerpsAccountStatus {
  positions?: SoDEXPerpsPosition[];
  blockTime?: number;
  blockHeight?: number;
  source?: string;
  readOnly?: boolean;
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

function formatBlockTime(value?: number) {
  if (!value) return "Not synced";
  const ms = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function FuturesFundingPanel({ address, isConnected }: Props) {
  const [mode, setMode] = useState<FundingMode>("deposit");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PerpsAccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!address) {
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/perps/positions?address=${encodeURIComponent(address)}`, {
        cache: "no-store",
      });
      const data = await parseApiResponse<PerpsAccountStatus>(res);
      setStatus(data);
    } catch (loadError) {
      setStatus(null);
      setError(loadError instanceof Error ? loadError.message : "SoDEX perps status unavailable");
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

  const amountNum = toNumber(amount);
  const canAttempt = isConnected && Boolean(address) && amountNum > 0;
  const currentMode = mode === "deposit"
    ? {
        title: "Deposit",
        helper: "Move USDC margin into futures.",
        Icon: ArrowDownToLine,
        tone: "text-buy",
        border: "border-buy/25",
        bg: "bg-buy/[0.06]",
      }
    : {
        title: "Withdraw",
        helper: "Move free futures margin back.",
        Icon: ArrowUpFromLine,
        tone: "text-sell",
        border: "border-sell/25",
        bg: "bg-sell/[0.06]",
      };
  const ModeIcon = currentMode.Icon;

  const handleSubmit = () => {
    if (!canAttempt) return;
    setActionMessage(
      "SoDEX funding transfer is not wired in the local API helper yet. Account status is live; deposit/withdraw submit is gated.",
    );
  };

  return (
    <section className="border-t border-border-default bg-card px-3 py-3">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-txt-muted">Futures Funding</p>
          <p className="mt-0.5 text-[10px] text-txt-secondary">SoDEX Perps margin</p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={!address || loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-default bg-inset text-txt-muted transition-colors hover:border-hold/30 hover:text-hold disabled:cursor-not-allowed disabled:opacity-40"
          title="Refresh SoDEX perps status"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-xl border border-border-default bg-inset p-1">
        {(["deposit", "withdraw"] as const).map((item) => {
          const active = mode === item;
          const isDeposit = item === "deposit";
          const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setActionMessage(null);
              }}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[10px] font-bold transition-all ${
                active
                  ? isDeposit
                    ? "border-buy/30 bg-buy/10 text-buy"
                    : "border-sell/30 bg-sell/10 text-sell"
                  : "border-transparent text-txt-muted hover:bg-elevated/40 hover:text-txt-primary"
              }`}
            >
              <Icon size={12} />
              {isDeposit ? "Deposit" : "Withdraw"}
            </button>
          );
        })}
      </div>

      <div className={`mb-2.5 rounded-xl border ${currentMode.border} ${currentMode.bg} p-2.5`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ModeIcon size={14} className={currentMode.tone} />
            <div>
              <p className={`text-[10px] font-bold ${currentMode.tone}`}>{currentMode.title} USDC</p>
              <p className="text-[8px] text-txt-muted">{currentMode.helper}</p>
            </div>
          </div>
          <span className="rounded-md border border-border-default bg-inset px-1.5 py-0.5 font-mono text-[8px] text-txt-muted">
            account 0
          </span>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[9px] font-medium text-txt-secondary">Amount</span>
          <div className="flex items-center gap-2 rounded-lg border border-border-default bg-inset px-3 py-2 transition-all focus-within:border-hold/50 focus-within:ring-2 focus-within:ring-hold/10">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setActionMessage(null);
              }}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold text-txt-primary outline-none placeholder:text-txt-dim"
            />
            <span className="text-[9px] font-semibold text-txt-muted">USDC</span>
          </div>
        </label>

        <div className="mt-2 grid grid-cols-4 gap-1">
          {["25%", "50%", "75%", "100%"].map((item) => (
            <button
              key={item}
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-border-default bg-elevated/20 py-1 text-[8px] font-bold text-txt-dim"
              title="Requires a SoDEX futures free-balance endpoint"
            >
              {item}
            </button>
          ))}
        </div>
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
            {error ? error : `${status?.source ?? "SoDEX Perps"} sync ${formatBlockTime(status?.blockTime)}`}
          </span>
        </div>
        {status?.blockHeight && (
          <span className="shrink-0 font-mono text-[8px] text-txt-muted">#{status.blockHeight}</span>
        )}
      </div>

      {actionMessage && (
        <div className="mb-2.5 rounded-lg border border-hold/25 bg-hold/[0.06] px-2.5 py-2 text-[9px] leading-relaxed text-hold">
          {actionMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canAttempt}
        className={`w-full rounded-xl border py-2.5 text-xs font-bold transition-all ${
          canAttempt
            ? "cursor-pointer border-hold/35 bg-hold/10 text-hold hover:border-hold/50 hover:bg-hold/15 active:scale-[0.985]"
            : "cursor-not-allowed border-border-default bg-inset text-txt-dim"
        }`}
      >
        {!isConnected ? "Connect Wallet for Funding" : amountNum <= 0 ? `Enter ${currentMode.title} Amount` : `${currentMode.title} Request`}
      </button>
    </section>
  );
}

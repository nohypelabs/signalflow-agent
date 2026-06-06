"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { parseApiResponse } from "@/lib/api/client";
import type { SoDEXPerpsPosition } from "@/lib/sodex-perps";

const SODEX_PORTFOLIO_URL = "https://sodex.com/portfolio";

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
  const [status, setStatus] = useState<PerpsAccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="border-t border-border-default bg-card px-3 py-3">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-txt-muted">Funding Gateway</p>
          <p className="mt-0.5 text-[10px] text-txt-secondary">Official SoDEX deposit & withdrawal</p>
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

      <div className="mb-2.5 grid grid-cols-2 gap-2">
        <a
          href={SODEX_PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-xl border border-buy/25 bg-buy/[0.06] p-2.5 transition-all hover:border-buy/45 hover:bg-buy/10"
        >
          <div className="flex items-center justify-between">
            <ArrowDownToLine size={15} className="text-buy" />
            <ExternalLink size={11} className="text-txt-dim transition-colors group-hover:text-buy" />
          </div>
          <p className="mt-2 text-[10px] font-bold text-buy">Deposit</p>
          <p className="mt-0.5 text-[8px] leading-relaxed text-txt-muted">
            Select asset & network, then send from your wallet.
          </p>
        </a>

        <a
          href={SODEX_PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-xl border border-sell/25 bg-sell/[0.06] p-2.5 transition-all hover:border-sell/45 hover:bg-sell/10"
        >
          <div className="flex items-center justify-between">
            <ArrowUpFromLine size={15} className="text-sell" />
            <ExternalLink size={11} className="text-txt-dim transition-colors group-hover:text-sell" />
          </div>
          <p className="mt-2 text-[10px] font-bold text-sell">Withdraw</p>
          <p className="mt-0.5 text-[8px] leading-relaxed text-txt-muted">
            Set destination, amount, network, and confirm fees.
          </p>
        </a>
      </div>

      <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-hold/25 bg-hold/[0.06] px-2.5 py-2">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-hold" />
        <p className="text-[8px] leading-relaxed text-txt-secondary">
          Opens the verified SoDEX Portfolio. Use the same wallet; SoDEX handles deposit addresses,
          transfer signing, fees, minimums, and compliance checks.
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
            {error ? error : `${status?.source ?? "SoDEX Perps"} sync ${formatBlockTime(status?.blockTime)}`}
          </span>
        </div>
        {status?.blockHeight && (
          <span className="shrink-0 font-mono text-[8px] text-txt-muted">#{status.blockHeight}</span>
        )}
      </div>

      <a
        href={SODEX_PORTFOLIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-hold/35 bg-hold/10 py-2.5 text-xs font-bold text-hold transition-all hover:border-hold/50 hover:bg-hold/15 active:scale-[0.985]"
      >
        {isConnected ? "Open SoDEX Funding" : "Connect Wallet on SoDEX"}
        <ExternalLink size={12} />
      </a>
    </section>
  );
}

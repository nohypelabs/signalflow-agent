"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/hooks/useWallet";
import { useSwitchChain } from "wagmi";
import { valuechain } from "@/lib/wallet-config";
import type { SoDEXBalance } from "@/lib/sodex-types";
import StatusDot from "@/components/ui/StatusDot";

function formatAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatFullAddr(addr: string) {
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

const EXPLORER_URL = "https://explorer.valuechain.xyz";

interface Props {
  onClose: () => void;
}

export default function WalletDropdown({ onClose }: Props) {
  const router = useRouter();
  const { address, isConnected, chainId, disconnect } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const panelRef = useRef<HTMLDivElement>(null);

  const [balances, setBalances] = useState<SoDEXBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState(false);

  const correctChain = chainId === valuechain.id;

  // Fetch balances on mount
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    async function fetchBalances() {
      setBalanceLoading(true);
      try {
        const res = await fetch(`/api/balance?address=${encodeURIComponent(address!)}`, { cache: "no-store" });
        if (cancelled) return;
        const json = await res.json();
        if (!cancelled) setBalances(json.balances || []);
      } catch {
        if (!cancelled) setBalances([]);
      } finally {
        if (!cancelled) setBalanceLoading(false);
      }
    }
    fetchBalances();
    return () => { cancelled = true; };
  }, [address]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshBalance = async () => {
    if (!address) return;
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/balance?address=${encodeURIComponent(address)}`, { cache: "no-store" });
      const json = await res.json();
      setBalances(json.balances || []);
    } catch {
      // keep existing balances
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setSwitching(true);
    try {
      await switchChainAsync({ chainId: valuechain.id });
    } catch {
      // user rejected
    } finally {
      setSwitching(false);
    }
  };

  const handleDisconnect = async () => {
    onClose();
    await disconnect();
  };

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  if (!isConnected || !address) return null;

  const usdcBalance = balances.find((b) => b.asset === "USDC" || b.asset === "vUSDC");
  const otherBalances = balances.filter((b) => b.asset !== "USDC" && b.asset !== "vUSDC");

  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-2 w-72 bg-card border border-border-default rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in"
    >
      {/* ── Address + Network ── */}
      <div className="p-3 border-b border-border-default">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <StatusDot status="live" pulse size="sm" />
            <span className="text-[11px] font-semibold text-txt-primary">
              {correctChain ? valuechain.name : "Wrong Network"}
            </span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
            correctChain
              ? "bg-buy-muted text-buy border border-buy-dim"
              : "bg-sell-muted text-sell border border-sell-dim"
          }`}>
            {correctChain ? "Connected" : "Switch Required"}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#ffffff04] rounded-lg px-2.5 py-2">
          <span className="text-[11px] text-txt-primary font-mono flex-1 truncate">{formatFullAddr(address)}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 text-[10px] font-medium text-accent hover:text-accent/80 transition-colors min-w-[40px]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Quick actions row */}
        <div className="flex items-center gap-1 mt-2">
          <a
            href={`${EXPLORER_URL}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-txt-muted hover:text-txt-secondary bg-[#ffffff04] hover:bg-[#ffffff08] rounded-md transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Explorer
          </a>
          {!correctChain && (
            <button
              onClick={handleSwitchNetwork}
              disabled={switching}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-hold bg-hold-muted hover:bg-hold-muted/80 border border-hold-dim rounded-md transition-colors disabled:opacity-50"
            >
              {switching ? "Switching..." : "Switch Network"}
            </button>
          )}
        </div>
      </div>

      {/* ── Balances ── */}
      <div className="p-3 border-b border-border-default">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider font-semibold">Balances</span>
          <button
            onClick={handleRefreshBalance}
            disabled={balanceLoading}
            className="text-[10px] text-txt-muted hover:text-accent transition-colors disabled:opacity-50"
            title="Refresh balances"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={balanceLoading ? "animate-spin" : ""}
            >
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        {balanceLoading && balances.length === 0 && (
          <div className="space-y-1.5">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-10 bg-[#ffffff08] rounded animate-pulse" />
                <div className="h-3 w-16 bg-[#ffffff08] rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!balanceLoading && balances.length === 0 && (
          <p className="text-[10px] text-txt-dim py-1">No balances found</p>
        )}

        {/* USDC highlighted */}
        {usdcBalance && (
          <div className="flex items-center justify-between py-1.5 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#2775ca] flex items-center justify-center text-[8px] font-bold text-white">$</span>
              <span className="text-[11px] font-semibold text-txt-primary">USDC</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-txt-primary font-mono font-semibold tabular-nums">
                {parseFloat(usdcBalance.free).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              {parseFloat(usdcBalance.locked) > 0 && (
                <span className="text-[9px] text-warning">
                  {parseFloat(usdcBalance.locked).toLocaleString(undefined, { maximumFractionDigits: 2 })} locked
                </span>
              )}
            </div>
          </div>
        )}

        {/* Other balances */}
        {otherBalances.length > 0 && (
          <div className="space-y-0.5">
            {otherBalances.slice(0, 4).map((b) => {
              const free = parseFloat(String(b.free));
              const locked = parseFloat(String(b.locked));
              if (free === 0 && locked === 0) return null;
              return (
                <div key={b.asset} className="flex items-center justify-between py-1">
                  <span className="text-[11px] text-txt-secondary">{b.asset}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-txt-primary font-mono tabular-nums">
                      {free.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                    {locked > 0 && (
                      <span className="text-[9px] text-warning">
                        {locked.toLocaleString(undefined, { maximumFractionDigits: 4 })} locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick Navigation ── */}
      <div className="p-2 border-b border-border-default">
        <button
          onClick={() => navigateTo("/trading")}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] text-txt-muted hover:text-txt-secondary hover:bg-[#ffffff04] rounded-md transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Open Orders
          <svg className="ml-auto w-3 h-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <button
          onClick={() => navigateTo("/trade-history")}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] text-txt-muted hover:text-txt-secondary hover:bg-[#ffffff04] rounded-md transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Trade History
          <svg className="ml-auto w-3 h-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <button
          onClick={() => navigateTo("/settings")}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] text-txt-muted hover:text-txt-secondary hover:bg-[#ffffff04] rounded-md transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Wallet Settings
          <svg className="ml-auto w-3 h-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* ── Disconnect ── */}
      <div className="p-2">
        <button
          onClick={handleDisconnect}
          className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-medium text-error bg-sell-muted hover:bg-sell-muted/80 border border-sell-dim rounded-lg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Disconnect
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/lib/use-wallet";
import { useSwitchChain } from "wagmi";
import { valuechain } from "@/lib/wallet-config";
import type { SoDEXBalance } from "@/lib/sodex-types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";

function formatAddr(addr: string) {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function WalletButton() {
  const { address, shortAddress, isConnected, chainId, connect, disconnect } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const [balances, setBalances] = useState<SoDEXBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const correctChain = chainId === valuechain.id;

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen || !address) return;
    let cancelled = false;
    async function fetchBalances() {
      setBalanceLoading(true);
      try {
        const res = await fetch(`/api/balance?address=${encodeURIComponent(address!)}`);
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
  }, [panelOpen, address]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection rejected");
    } finally {
      setConnecting(false);
    }
  };

  const handleSwitch = async () => {
    try {
      await switchChainAsync({ chainId: valuechain.id });
    } catch {
      // user rejected
    }
  };

  const handleDisconnect = async () => {
    setPanelOpen(false);
    await disconnect();
    setBalances([]);
  };

  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address);
  };

  // ── Disconnected ──
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={handleConnect} loading={connecting}>
          Connect Wallet
        </Button>
        {error && (
          <span className="text-[10px] text-error">{error}</span>
        )}
      </div>
    );
  }

  // ── Wrong network ──
  if (!correctChain) {
    return (
      <div className="flex flex-col gap-1.5">
        <Badge variant="error" size="md">Wrong Network</Badge>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSwitch}
            className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-hold text-white hover:opacity-90 whitespace-nowrap"
          >
            Switch
          </button>
          <Button variant="danger" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  // ── Connected ──
  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setPanelOpen(!panelOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-inset border border-border-default hover:border-accent-dim"
      >
        <StatusDot status="live" size="sm" />
        <span className="text-xs text-txt-primary font-mono">{shortAddress}</span>
        <svg className="w-3 h-3 text-txt-muted" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {panelOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-72 bg-card border border-border-default rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="p-4 border-b border-border-default">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StatusDot status="live" size="sm" />
                <span className="text-sm font-semibold text-txt-primary">Wallet</span>
              </div>
              <Badge variant="live" size="sm">ValueChain</Badge>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <span className="text-xs text-txt-primary font-mono flex-1 break-all">{address}</span>
              <button
                onClick={copyAddress}
                className="shrink-0 text-[10px] text-accent hover:text-[#9b4fff]"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Balances */}
          <div className="p-4 border-b border-border-default">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-txt-muted font-semibold uppercase tracking-wider">Balances</span>
              {balanceLoading && (
                <span className="text-[10px] text-warning animate-pulse">Loading...</span>
              )}
            </div>
            {!balanceLoading && balances.length === 0 && (
              <p className="text-[10px] text-txt-dim">No balances found</p>
            )}
            {balances.length > 0 && (
              <div className="space-y-1">
                {balances.map((b) => (
                  <div key={b.asset} className="flex items-center justify-between text-xs">
                    <span className="text-txt-secondary">{b.asset}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-txt-primary font-mono">
                        {parseFloat(String(b.free)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                      {parseFloat(String(b.locked)) > 0 && (
                        <span className="text-[10px] text-warning">
                          ({parseFloat(String(b.locked)).toLocaleString(undefined, { maximumFractionDigits: 4 })})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4">
            <Button variant="danger" size="sm" className="w-full" onClick={handleDisconnect}>
              Disconnect Wallet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

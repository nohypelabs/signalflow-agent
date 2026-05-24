"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/lib/use-wallet";
import { useSwitchChain } from "wagmi";
import { valuechain } from "@/lib/wallet-config";
import type { SoDEXBalance } from "@/lib/sodex-types";

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

  // Balance
  const [balances, setBalances] = useState<SoDEXBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const correctChain = chainId === valuechain.id;

  // Close panel on outside click
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

  // Fetch balance when panel opens
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
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#7b2fff] text-white hover:bg-[#6a1fee] disabled:opacity-50 transition-colors"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && (
          <span className="text-[10px] text-[#ff4444]">{error}</span>
        )}
      </div>
    );
  }

  // ── Wrong network ──
  if (!correctChain) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff444420] text-[#ff4444] border border-[#ff444430] self-start">
          Wrong Network
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSwitch}
            className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-[#ff8800] text-white hover:bg-[#e67a00] transition-colors whitespace-nowrap"
          >
            Switch
          </button>
          <button
            onClick={handleDisconnect}
            className="px-2 py-1 text-[10px] rounded-lg bg-[#ff444415] text-[#ff4444] border border-[#ff444430] hover:bg-[#ff444425] transition-colors whitespace-nowrap"
          >
            Disconnect
          </button>
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d0d1a] border border-[#1a1a2e] hover:border-[#7b2fff50] transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-glow" />
        <span className="text-xs text-white font-mono">{shortAddress}</span>
        <svg className="w-3 h-3 text-[#666677]" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-72 bg-[#12122a] border border-[#1a1a2e] rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#1a1a2e]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00ff88]" />
                <span className="text-sm font-semibold text-white">Wallet</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830]">
                ValueChain
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#0a0a14] rounded-lg px-3 py-2">
              <span className="text-xs text-white font-mono flex-1 break-all">{address}</span>
              <button
                onClick={copyAddress}
                className="shrink-0 text-[10px] text-[#7b2fff] hover:text-[#9b4fff] transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Balances */}
          <div className="p-4 border-b border-[#1a1a2e]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#666677] font-semibold uppercase tracking-wider">Balances</span>
              {balanceLoading && (
                <span className="text-[10px] text-[#ff8800] animate-pulse">Loading...</span>
              )}
            </div>
            {!balanceLoading && balances.length === 0 && (
              <p className="text-[10px] text-[#444455]">No balances found</p>
            )}
            {balances.length > 0 && (
              <div className="space-y-1">
                {balances.map((b) => (
                  <div key={b.asset} className="flex items-center justify-between text-xs">
                    <span className="text-[#aaaaaa]">{b.asset}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">
                        {parseFloat(String(b.free)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                      {parseFloat(String(b.locked)) > 0 && (
                        <span className="text-[10px] text-[#ff8800]">
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
          <div className="p-4 space-y-2">
            <button
              onClick={handleDisconnect}
              className="w-full py-2 text-xs font-semibold rounded-lg bg-[#ff444415] text-[#ff4444] border border-[#ff444430] hover:bg-[#ff444425] transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

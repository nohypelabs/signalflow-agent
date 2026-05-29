"use client";

import { useState } from "react";
import { useWallet } from "@/lib/hooks/useWallet";
import { useSwitchChain } from "wagmi";
import { valuechain } from "@/lib/wallet-config";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import WalletDropdown from "@/components/layout/WalletDropdown";

export default function WalletButton() {
  const { shortAddress, isConnected, chainId, connect, disconnect } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const correctChain = chainId === valuechain.id;

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
      <div className="flex items-center gap-1.5">
        <Badge variant="error" size="sm">Wrong Network</Badge>
        <button
          onClick={handleSwitch}
          className="px-2 py-1 text-[10px] font-semibold rounded-md bg-elevated border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-muted whitespace-nowrap transition-colors"
        >
          Switch
        </button>
        <Button variant="ghost" size="sm" onClick={() => disconnect()}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </Button>
      </div>
    );
  }

  // ── Connected ──
  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-elevated border border-border-default hover:bg-elevated/80 hover:border-border-muted transition-colors"
      >
        <StatusDot status="live" size="sm" />
        <span className="text-[11px] text-txt-primary font-mono font-medium">{shortAddress}</span>
        <svg
          className={`w-3 h-3 text-txt-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {dropdownOpen && (
        <WalletDropdown onClose={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}

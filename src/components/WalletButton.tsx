"use client";

import { useState } from "react";
import { useWallet } from "@/lib/hooks/useWallet";
import { useSwitchChain } from "wagmi";
import type { Connector } from "wagmi";
import { valuechain } from "@/lib/wallet-config";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import WalletDropdown from "@/components/layout/WalletDropdown";
import WalletConnectModal from "@/components/WalletConnectModal";

export default function WalletButton() {
  const {
    shortAddress,
    isConnected,
    chainId,
    connect,
    disconnect,
  } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const correctChain = chainId === valuechain.id;

  const handleConnectClick = () => {
    setError(null);
    setModalOpen(true);
  };

  const handleSelectWallet = async (connector: Connector) => {
    setConnecting(true);
    setError(null);
    try {
      await connect(connector);
      setModalOpen(false);
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
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={handleConnectClick}
            disabled={connecting}
            className="cursor-pointer px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            <span className="hidden sm:inline">{connecting ? "Connecting..." : "Connect Wallet"}</span>
            <span className="sm:hidden">{connecting ? "..." : "Connect"}</span>
          </button>
        </div>

        <WalletConnectModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setError(null); }}
          onConnect={handleSelectWallet}
          connecting={connecting}
          error={error}
        />
      </>
    );
  }

  // ── Wrong network ──
  if (!correctChain) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="error" size="sm">Wrong Network</Badge>
        <button
          onClick={handleSwitch}
          className="cursor-pointer px-2 py-1 text-[10px] font-semibold rounded-md bg-elevated border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-muted whitespace-nowrap transition-colors"
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
        className="flex cursor-pointer items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-inset border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-muted transition-colors"
      >
        <StatusDot status="live" size="sm" />
        <span className="text-[11px] font-mono font-medium hidden sm:inline">{shortAddress}</span>
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

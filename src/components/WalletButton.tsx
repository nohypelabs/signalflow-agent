"use client";

import { useWallet } from "@/lib/use-wallet";
import { useSwitchChain } from "wagmi";
import { valuechain } from "@/lib/wallet-config";
import { useState } from "react";

export default function WalletButton() {
  const { address, shortAddress, isConnected, chainId, connect, disconnect } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#7b2fff] text-white hover:bg-[#6a1fee] disabled:opacity-50 transition-colors"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && (
          <span className="text-[10px] text-[#ff4444]">{error}</span>
        )}
      </div>
    );
  }

  if (!correctChain) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff444420] text-[#ff4444] border border-[#ff444430]">
          Wrong Network
        </span>
        <button
          onClick={handleSwitch}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#ff8800] text-white hover:bg-[#e67a00] transition-colors"
        >
          Switch to ValueChain
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d0d1a] border border-[#1a1a2e]">
        <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
        <span className="text-xs text-white font-mono">{shortAddress}</span>
      </div>
      <button
        onClick={disconnect}
        className="text-[10px] text-[#666677] hover:text-[#ff4444] transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}

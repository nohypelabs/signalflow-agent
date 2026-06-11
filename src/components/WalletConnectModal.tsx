'use client';

import { useEffect, useState } from 'react';
import { useConnectors } from 'wagmi';
import type { Connector } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (connector: Connector) => void;
  connecting: boolean;
  error: string | null;
}

function getWalletIcon(connector: Connector): string | null {
  // wagmi v3 stores icon on connector for EIP-6963 wallets
  const icon = (connector as unknown as { icon?: string }).icon;
  if (icon) return icon;

  // Fallback: known wallet icons by ID
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();

  if (id.includes('metamask') || name.includes('metamask')) {
    return 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg';
  }
  if (id.includes('okx') || name.includes('okx')) {
    return 'https://static.okx.com/cdn/assets/imgs/247/58E63FEA47BBF9E3.png';
  }
  if (id.includes('phantom') || name.includes('phantom')) {
    return 'https://phantom.app/favicon.ico';
  }
  if (id.includes('brave') || name.includes('brave')) {
    return 'https://brave.com/static-assets/images/brave-favicon.png';
  }
  if (id.includes('walletconnect') || name.includes('walletconnect')) {
    return 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg';
  }
  if (id.includes('coinbase') || name.includes('coinbase')) {
    return 'https://www.coinbase.com/favicon.ico';
  }

  return null;
}

function getWalletDescription(connector: Connector): string {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();

  if (id.includes('walletconnect') || name.includes('walletconnect')) {
    return 'Scan QR or use mobile wallet';
  }
  if (id.includes('injected') && !name.includes('metamask')) {
    return 'Browser extension';
  }
  return 'Browser extension';
}

export default function WalletConnectModal({ isOpen, onClose, onConnect, connecting, error }: Props) {
  const connectors = useConnectors();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deduplicate by rdns (EIP-6963) or id, keeping only unique wallets
  const uniqueConnectors = connectors.reduce<Connector[]>((acc, c) => {
    const rdns = (c as unknown as { rdns?: string }).rdns;
    // If this wallet has an rdns and we already have one with the same rdns, skip
    if (rdns && acc.some((existing) => (existing as unknown as { rdns?: string }).rdns === rdns)) {
      return acc;
    }
    // If same id already exists, skip (unless it's injected which we want to keep as fallback)
    if (acc.some((existing) => existing.id === c.id && c.id !== 'injected')) {
      return acc;
    }
    acc.push(c);
    return acc;
  }, []);

  // Sort: EIP-6963 wallets first (have rdns), then injected fallback, then WalletConnect
  const sortedConnectors = [...uniqueConnectors].sort((a, b) => {
    const aRdns = (a as unknown as { rdns?: string }).rdns;
    const bRdns = (b as unknown as { rdns?: string }).rdns;
    const aWc = a.id.toLowerCase().includes('walletconnect');
    const bWc = b.id.toLowerCase().includes('walletconnect');

    // WalletConnect last
    if (aWc !== bWc) return aWc ? 1 : -1;
    // EIP-6963 wallets (have rdns) before generic injected
    if (aRdns && !bRdns) return -1;
    if (!aRdns && bRdns) return 1;
    return 0;
  });

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSelect = (connector: Connector) => {
    setSelectedId(connector.id);
    onConnect(connector);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-[101] w-[380px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-default bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
              <div>
                <h2 className="text-sm font-semibold text-txt-primary">Connect Wallet</h2>
                <p className="text-[11px] text-txt-dim mt-0.5">Choose a wallet to connect to SignalFlow</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-elevated text-txt-dim hover:text-txt-secondary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            {/* Wallet list */}
            <div className="p-3 max-h-[400px] overflow-y-auto">
              {sortedConnectors.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-txt-dim">No wallets detected.</p>
                  <p className="text-[10px] text-txt-faint mt-1">Install MetaMask, OKX, Phantom, or another wallet extension.</p>
                </div>
              )}

              {sortedConnectors.map((connector) => {
                const icon = getWalletIcon(connector);
                const isSelected = selectedId === connector.id && connecting;
                const rdns = (connector as unknown as { rdns?: string }).rdns;

                return (
                  <button
                    key={`${connector.id}-${rdns ?? 'no-rdns'}`}
                    onClick={() => handleSelect(connector)}
                    disabled={connecting}
                    className="flex w-full items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-elevated/50 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {/* Wallet icon */}
                    <div className="h-10 w-10 rounded-xl bg-inset border border-border-default flex items-center justify-center overflow-hidden shrink-0">
                      {icon ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={icon}
                          alt={connector.name}
                          width={28}
                          height={28}
                          className="rounded-lg object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-dim">
                          <rect x="2" y="6" width="20" height="14" rx="2" />
                          <path d="M2 10h20" />
                        </svg>
                      )}
                    </div>

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-[12px] font-semibold text-txt-primary group-hover:text-accent transition-colors">
                        {connector.name}
                      </span>
                      <span className="block text-[10px] text-txt-dim">
                        {getWalletDescription(connector)}
                      </span>
                    </div>

                    {/* Loading indicator */}
                    {isSelected && (
                      <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="px-5 pb-4">
                <div className="rounded-lg bg-sell-muted border border-sell-dim px-3 py-2 text-[11px] text-sell">
                  {error}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border-default bg-inset/30">
              <p className="text-[10px] text-txt-faint text-center">
                By connecting, you agree to SignalFlow&apos;s terms. Powered by ValueChain.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

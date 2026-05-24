"use client";

import { useState, useEffect, useCallback } from "react";
import { useSignTypedData } from "wagmi";
import type { Signal } from "@/lib/mock-data";
import type { SoDEXTicker, SoDEXNewOrderRequest, SoDEXBalance } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { buildOrderTypedData } from "@/lib/eip712";

interface Props {
  signal: Signal | null;
  ticker: SoDEXTicker | null;
  walletConnected: boolean;
  walletAddress?: string;
  onExecute: (order: SoDEXNewOrderRequest) => Promise<void>;
  onClose: () => void;
}

function formatPrice(p: number) {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

const PCT_OPTIONS = [25, 50, 75, 100] as const;

export default function TradeForm({ signal, ticker, walletConnected, walletAddress, onExecute, onClose }: Props) {
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signTypedDataAsync } = useSignTypedData();

  // Balance state
  const [balances, setBalances] = useState<SoDEXBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const res = await fetch(`/api/balance?address=${encodeURIComponent(walletAddress)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setBalances(json.balances || []);
    } catch (e) {
      setBalanceError(e instanceof Error ? e.message : "Balance fetch failed");
    } finally {
      setBalanceLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchBalances();
    } else {
      setBalances([]);
      setBalanceError(null);
    }
  }, [walletConnected, walletAddress, fetchBalances]);

  if (!signal) return null;

  const price = ticker ? parseFloat(ticker.lastPx) : signal.price;
  const baseCoin = signal.pair.split("/")[0];
  const quoteCoin = signal.pair.split("/")[1] || "USDC";
  const sodSymbol = pairToSodexSymbol(signal.pair) || signal.pair;
  const notional = quantity ? parseFloat(quantity) * price : 0;
  const fee = notional * 0.001;
  const side = signal.action === "SELL" ? "SELL" : "BUY";

  // Find relevant balance
  const balanceAsset = side === "BUY" ? quoteCoin : baseCoin;
  const balance = balances.find(
    (b) => b.asset.toUpperCase() === balanceAsset.toUpperCase(),
  );
  const freeBalance = balance ? parseFloat(String(balance.free)) : 0;
  const lockedBalance = balance ? parseFloat(String(balance.locked)) : 0;

  // Max quantity based on balance and side
  const maxQty =
    side === "BUY"
      ? price > 0 ? freeBalance / price : 0
      : freeBalance;

  const handlePercent = (pct: number) => {
    if (maxQty <= 0) return;
    const qty = (maxQty * pct) / 100;
    if (price >= 1000) setQuantity(qty.toFixed(4));
    else if (price >= 1) setQuantity(qty.toFixed(2));
    else setQuantity(qty.toFixed(4));
  };

  const handleExecute = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a valid quantity");
      return;
    }

    if (qty > maxQty) {
      setError(`Insufficient ${balanceAsset} balance`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const typedData = buildOrderTypedData({
        symbol: sodSymbol,
        side,
        orderType: "MARKET",
        quantity: String(qty),
        timestamp: Date.now(),
      });

      const signature = await signTypedDataAsync(typedData);

      const order: SoDEXNewOrderRequest = {
        symbol: sodSymbol,
        side,
        type: "MARKET",
        quantity: String(qty),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, signature }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || "Order failed");
      }

      await onExecute(order);
      setSuccess(`Order placed: ${qty} ${baseCoin} @ $${formatPrice(price)}`);
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">Execute Trade</h3>
          <button onClick={onClose} className="text-[#666677] hover:text-white text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Signal info */}
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3 mb-4 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#666677]">Pair</span>
            <span className="text-white font-semibold">{signal.pair}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#666677]">Action</span>
            <span className={`font-bold ${side === "BUY" ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
              {side}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#666677]">Price</span>
            <span className="text-white font-mono">${formatPrice(price)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#666677]">Confidence</span>
            <span className="text-[#00ff88]">{signal.confidence}%</span>
          </div>
        </div>

        {/* Wallet Balance */}
        {walletConnected && (
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3 mb-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#666677]">Wallet Balance</span>
              {balanceLoading && (
                <span className="text-[10px] text-[#ff8800] animate-pulse">Loading...</span>
              )}
              {balanceError && (
                <span className="text-[10px] text-[#ff4444]">{balanceError}</span>
              )}
              {!balanceLoading && !balanceError && balances.length === 0 && (
                <span className="text-[10px] text-[#666677]">No balances found</span>
              )}
              <button
                onClick={fetchBalances}
                className="text-[10px] text-[#7b2fff] hover:text-[#9b4fff] transition-colors"
              >
                Refresh
              </button>
            </div>

            {balances.length > 0 && (
              <div className="space-y-1">
                {balances.map((b) => {
                  const isRelevant = b.asset.toUpperCase() === balanceAsset.toUpperCase();
                  return (
                    <div
                      key={b.asset}
                      className={`flex justify-between text-xs rounded p-1.5 ${
                        isRelevant ? "bg-[#7b2fff15] border border-[#7b2fff20]" : ""
                      }`}
                    >
                      <span className={isRelevant ? "text-white font-semibold" : "text-[#888888]"}>
                        {b.asset}
                      </span>
                      <div className="flex gap-3">
                        <span className={isRelevant ? "text-white font-mono" : "text-[#666677] font-mono"}>
                          {parseFloat(String(b.free)).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </span>
                        {parseFloat(String(b.locked)) > 0 && (
                          <span className="text-[#ff8800] text-[10px]">
                            ({parseFloat(String(b.locked)).toLocaleString(undefined, { maximumFractionDigits: 4 })} locked)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available for this trade */}
            {freeBalance > 0 && (
              <div className="pt-1.5 mt-1 border-t border-[#1a1a2e] flex justify-between">
                <span className="text-[10px] text-[#666677]">
                  Available ({side === "BUY" ? quoteCoin : baseCoin})
                </span>
                <span className="text-[10px] text-white font-mono font-semibold">
                  {freeBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {balanceAsset}
                  {side === "BUY" && price > 0 && (
                    <span className="text-[#666677] ml-1">
                      (~{(freeBalance / price).toFixed(6)} {baseCoin})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quantity input */}
        <div className="mb-4">
          <label className="text-xs text-[#666677] mb-1.5 block">Quantity ({baseCoin})</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            step={price >= 1000 ? "0.0001" : price >= 1 ? "0.01" : "0.1"}
            min={0}
            className="w-full bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#7b2fff] transition-colors"
          />

          {/* Percentage quick buttons */}
          {maxQty > 0 && (
            <div className="flex gap-2 mt-2">
              {PCT_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercent(pct)}
                  className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg bg-[#0d0d1a] border border-[#1a1a2e] text-[#7b2fff] hover:bg-[#7b2fff15] hover:border-[#7b2fff40] transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Order summary */}
        {quantity && (
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2.5 mb-4 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#666677]">Est. Cost</span>
              <span className="text-white font-mono">
                ${formatPrice(notional)}{" "}
                <span className="text-[#666677]">{quoteCoin}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666677]">Est. Fee (0.1%)</span>
              <span className="text-[#666677] font-mono">
                ${formatPrice(fee)} {quoteCoin}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666677]">Balance After</span>
              <span className={`font-mono ${notional > freeBalance ? "text-[#ff4444]" : "text-[#aaaaaa]"}`}>
                ${formatPrice(Math.max(0, freeBalance - notional))} {quoteCoin}
              </span>
            </div>
            {!walletConnected && (
              <p className="text-[10px] text-[#ff8800] mt-1">Connect wallet to execute trades</p>
            )}
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-[#ff444415] border border-[#ff444430] text-xs text-[#ff4444]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-2.5 rounded-lg bg-[#00ff8815] border border-[#00ff8830] text-xs text-[#00ff88]">
            {success}
          </div>
        )}

        {/* Execute button */}
        <button
          onClick={handleExecute}
          disabled={!walletConnected || !quantity || submitting}
          className="w-full py-2.5 text-sm font-bold rounded-lg bg-[#7b2fff] text-white hover:bg-[#6a1fee] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting
            ? "Signing..."
            : !walletConnected
              ? "Connect Wallet to Execute"
              : "Sign & Submit"}
        </button>

        <p className="text-center text-[10px] text-[#444455] mt-3">
          SoDEX Mainnet — EIP-712 signing required
        </p>
      </div>
    </div>
  );
}

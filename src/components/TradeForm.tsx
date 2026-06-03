"use client";

import { useState, useEffect, useCallback } from "react";
import { useSignTypedData } from "wagmi";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker, SoDEXNewOrderRequest, SoDEXBalance } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { buildOrderTypedData } from "@/lib/eip712";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { parseApiResponse } from "@/lib/api/client";

interface PaperTradeInput {
  pair: string;
  side: 'LONG' | 'SHORT';
  leverage: number;
  margin: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
}

interface Props {
  signal: Signal | null;
  ticker: SoDEXTicker | null;
  walletConnected: boolean;
  walletAddress?: string;
  onExecute: (order: SoDEXNewOrderRequest) => Promise<void>;
  onClose: () => void;
  // Paper trading props
  paperMode?: boolean;
  paperBalance?: number;
  paperAvailable?: number;
  onPaperTrade?: (trade: PaperTradeInput) => void;
}

function formatPrice(p: number) {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

const PCT_OPTIONS = [25, 50, 75, 100] as const;

export default function TradeForm({ signal, ticker, walletConnected, walletAddress, onExecute, onClose, paperMode, paperBalance, paperAvailable, onPaperTrade }: Props) {
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signTypedDataAsync } = useSignTypedData();

  const [balances, setBalances] = useState<SoDEXBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const res = await fetch(`/api/balance?address=${encodeURIComponent(walletAddress)}`, { cache: "no-store" });
      const json = await parseApiResponse<{ balances?: SoDEXBalance[] }>(res);
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
  const side = signal.action === "SHORT" ? "SELL" : "BUY";

  const balanceAsset = side === "BUY" ? quoteCoin : baseCoin;
  const balance = balances.find(
    (b) => b.asset.toUpperCase() === balanceAsset.toUpperCase(),
  );
  const liveFreeBalance = balance ? parseFloat(String(balance.free)) : 0;
  const freeBalance = paperMode ? (paperAvailable ?? 0) : liveFreeBalance;

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
      // Paper trading mode
      if (paperMode && onPaperTrade) {
        const margin = side === "BUY" ? qty * price : qty * price;
        const leverage = 1;
        onPaperTrade({
          pair: signal.pair,
          side: side === "BUY" ? "LONG" : "SHORT",
          leverage,
          margin,
          entryPrice: price,
          takeProfit: signal.execution?.takeProfit ?? price * (side === "BUY" ? 1.05 : 0.95),
          stopLoss: signal.execution?.stopLoss ?? price * (side === "BUY" ? 0.97 : 1.03),
        });
        setSuccess(`Paper trade opened: ${qty} ${baseCoin} @ $${formatPrice(price)}`);
        setTimeout(() => onClose(), 1500);
        return;
      }

      // Live trading mode
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

      const clientOrderId = `sf-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, signature, clientOrderId }),
      });

      await parseApiResponse(res);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <Card
        padding="lg"
        className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base text-txt-primary">Execute Trade</h3>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Signal info */}
        <Card variant="inset" padding="md" className="mb-4 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Pair</span>
            <span className="text-txt-primary font-semibold">{signal.pair}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Action</span>
            <Badge variant={side === "BUY" ? "buy" : "sell"} size="sm">{side}</Badge>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Price</span>
            <span className="text-txt-primary font-mono">${formatPrice(price)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Confidence</span>
            <span className="text-buy font-semibold">{signal.confidence}%</span>
          </div>
        </Card>

        {/* Balance */}
        <Card variant="inset" padding="md" className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-txt-muted">
              {paperMode ? "Paper Balance" : "Wallet Balance"}
            </span>
            {paperMode ? (
              <span className="text-[10px] text-accent font-semibold">PAPER</span>
            ) : (
              <>
                {balanceLoading && (
                  <span className="text-[10px] text-warning animate-pulse">Loading...</span>
                )}
                {balanceError && (
                  <span className="text-[10px] text-error">{balanceError}</span>
                )}
                {!balanceLoading && !balanceError && balances.length === 0 && (
                  <span className="text-[10px] text-txt-muted">No balances found</span>
                )}
                <button
                  onClick={fetchBalances}
                  className="text-[10px] text-accent hover:opacity-80"
                >
                  Refresh
                </button>
              </>
            )}
          </div>

          {paperMode ? (
            <div className="pt-1.5 mt-1 border-t border-border-default flex justify-between">
              <span className="text-[10px] text-txt-muted">
                Available (USDC)
              </span>
              <span className="text-[10px] text-txt-primary font-mono font-semibold">
                ${(paperAvailable ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          ) : (
            <>
              {balances.length > 0 && (
                <div className="space-y-1">
                  {balances.map((b) => {
                    const isRelevant = b.asset.toUpperCase() === balanceAsset.toUpperCase();
                    return (
                      <div
                        key={b.asset}
                        className={`flex justify-between text-xs rounded p-1.5 ${
                          isRelevant ? "bg-accent-muted border border-accent-dim" : ""
                        }`}
                      >
                        <span className={isRelevant ? "text-txt-primary font-semibold" : "text-txt-tertiary"}>
                          {b.asset}
                        </span>
                        <div className="flex gap-3">
                          <span className={isRelevant ? "text-txt-primary font-mono" : "text-txt-muted font-mono"}>
                            {parseFloat(String(b.free)).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          </span>
                          {parseFloat(String(b.locked)) > 0 && (
                            <span className="text-warning text-[10px]">
                              ({parseFloat(String(b.locked)).toLocaleString(undefined, { maximumFractionDigits: 4 })} locked)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {freeBalance > 0 && (
                <div className="pt-1.5 mt-1 border-t border-border-default flex justify-between">
                  <span className="text-[10px] text-txt-muted">
                    Available ({side === "BUY" ? quoteCoin : baseCoin})
                  </span>
                  <span className="text-[10px] text-txt-primary font-mono font-semibold">
                    {freeBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {balanceAsset}
                    {side === "BUY" && price > 0 && (
                      <span className="text-txt-muted ml-1">
                        (~{(freeBalance / price).toFixed(6)} {baseCoin})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Quantity input */}
        <div className="mb-4">
          <label className="text-xs text-txt-muted mb-1.5 block">Quantity ({baseCoin})</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            step={price >= 1000 ? "0.0001" : price >= 1 ? "0.01" : "0.1"}
            min={0}
            className="w-full bg-inset border border-border-default rounded-lg px-3 py-2 text-sm text-txt-primary font-mono focus:outline-none focus:border-accent"
          />

          {maxQty > 0 && (
            <div className="flex gap-2 mt-2">
              {PCT_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercent(pct)}
                  className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg bg-inset border border-border-default text-accent hover:bg-accent-muted hover:border-accent-dim"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Order summary */}
        {quantity && (
          <Card variant="inset" padding="sm" className="mb-4 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-txt-muted">Est. Cost</span>
              <span className="text-txt-primary font-mono">
                ${formatPrice(notional)} <span className="text-txt-muted">{quoteCoin}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-muted">Est. Fee (0.1%)</span>
              <span className="text-txt-muted font-mono">
                ${formatPrice(fee)} {quoteCoin}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-muted">Balance After</span>
              <span className={`font-mono ${notional > freeBalance ? "text-error" : "text-txt-secondary"}`}>
                ${formatPrice(Math.max(0, freeBalance - notional))} {quoteCoin}
              </span>
            </div>
            {!walletConnected && (
              <p className="text-[10px] text-warning mt-1">Connect wallet to execute trades</p>
            )}
          </Card>
        )}

        {/* Error / Success */}
        {error && (
          <Card variant="inset" padding="sm" className="mb-3 bg-sell-muted border-sell-dim">
            <p className="text-xs text-error">{error}</p>
          </Card>
        )}
        {success && (
          <Card variant="inset" padding="sm" className="mb-3 bg-buy-muted border-buy-dim">
            <p className="text-xs text-buy">{success}</p>
          </Card>
        )}

        {/* Execute button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleExecute}
          disabled={(!paperMode && !walletConnected) || !quantity || submitting}
          loading={submitting}
        >
          {paperMode
            ? "Open Paper Trade"
            : !walletConnected
              ? "Connect Wallet to Execute"
              : "Sign & Submit"}
        </Button>

        <p className="text-center text-[10px] text-txt-faint mt-3">
          {paperMode ? "Paper Trading — No real funds at risk" : "SoDEX Mainnet — EIP-712 signing required"}
        </p>
      </Card>
    </div>
  );
}

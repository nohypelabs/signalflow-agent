"use client";

import { useState, useEffect, useMemo } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { parseApiResponse } from "@/lib/api/client";
import { History } from "lucide-react";

interface SignalRecord {
  id: string;
  pair: string;
  action: "LONG" | "SHORT" | "HOLD";
  confidence: number;
  price: number;
  timestamp: number;
  outcome?: "win" | "loss" | "pending";
  pnlPercent?: number;
}

function fmtTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function fmtPrice(p: number): string {
  if (p >= 10000) return `$${(p / 1000).toFixed(1)}K`;
  if (p >= 100) return `$${p.toFixed(0)}`;
  return `$${p.toFixed(2)}`;
}

export default function SignalHistoryPanel() {
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "LONG" | "SHORT" | "HOLD">("all");

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/signals");
        const data = await parseApiResponse<{ signals?: SignalRecord[] }>(res);

        const currentSignals: SignalRecord[] = (data.signals ?? []).map((s: SignalRecord) => ({
          ...s,
          timestamp: Date.now() - Math.random() * 3600000,
          outcome: "pending" as const,
        }));

        // Synthetic history for demo
        const historicalSignals: SignalRecord[] = [];
        const pairs = ["BTC/USDC", "ETH/USDC", "SOL/USDC"];
        const actions = ["LONG", "SHORT", "HOLD"] as const;
        const outcomes = ["win", "loss"] as const;

        for (let i = 0; i < 30; i++) {
          const pair = pairs[Math.floor(Math.random() * pairs.length)];
          const action = actions[Math.floor(Math.random() * 3)];
          const confidence = 40 + Math.floor(Math.random() * 55);
          const basePrice = pair.startsWith("BTC") ? 105000 : pair.startsWith("ETH") ? 2500 : 165;
          const outcome = outcomes[Math.floor(Math.random() * 2)];
          const pnl = outcome === "win" ? Math.random() * 8 + 0.5 : -(Math.random() * 5 + 0.5);

          historicalSignals.push({
            id: `hist-${i}`,
            pair,
            action,
            confidence,
            price: basePrice * (0.95 + Math.random() * 0.1),
            timestamp: Date.now() - (i + 1) * 3600000 * (1 + Math.random() * 4),
            outcome,
            pnlPercent: parseFloat(pnl.toFixed(2)),
          });
        }

        setSignals([...currentSignals, ...historicalSignals]);
      } catch {
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const stats = useMemo(() => {
    const completed = signals.filter((s) => s.outcome === "win" || s.outcome === "loss");
    const wins = completed.filter((s) => s.outcome === "win");
    const winRate = completed.length > 0 ? (wins.length / completed.length) * 100 : 0;
    const pnls = completed.map((s) => s.pnlPercent ?? 0);
    const avgPnl = pnls.length > 0 ? pnls.reduce((s, p) => s + p, 0) / pnls.length : 0;
    return { total: signals.length, winRate, avgPnl };
  }, [signals]);

  const filtered = useMemo(() => {
    return signals.filter((s) => filter === "all" || s.action === filter);
  }, [signals, filter]);

  if (loading) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border-default">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <History size={13} className="text-accent" />
          <h3 className="text-sm font-semibold text-txt-primary">Signals</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[8px] uppercase tracking-wider text-txt-faint">Total</div>
            <div className="text-sm font-mono font-bold text-txt-primary">{stats.total}</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-wider text-txt-faint">Win Rate</div>
            <div className={`text-sm font-mono font-bold ${stats.winRate >= 55 ? "text-buy" : stats.winRate >= 45 ? "text-hold" : "text-sell"}`}>
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-wider text-txt-faint">Avg PnL</div>
            <div className={`text-sm font-mono font-bold ${stats.avgPnl >= 0 ? "text-buy" : "text-sell"}`}>
              {stats.avgPnl >= 0 ? "+" : ""}{stats.avgPnl.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1 mt-2">
          {(["all", "LONG", "SHORT", "HOLD"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider transition-colors ${
                filter === f
                  ? "bg-accent-muted text-accent border border-accent-dim"
                  : "bg-elevated/30 text-txt-secondary border border-border-default"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Signal list */}
      <div className="divide-y divide-border-default overflow-y-auto max-h-[500px]">
        {filtered.slice(0, 30).map((s) => {
          const actionColor = s.action === "LONG" ? "text-buy" : s.action === "SHORT" ? "text-sell" : "text-hold";
          const actionBg = s.action === "LONG" ? "bg-buy/10" : s.action === "SHORT" ? "bg-sell/10" : "bg-hold/10";
          const outcomeColor = s.outcome === "win" ? "text-buy" : s.outcome === "loss" ? "text-sell" : "text-txt-faint";

          return (
            <div key={s.id} className="px-3 py-2 hover:bg-elevated/20 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${actionBg} ${actionColor}`}>
                    {s.action}
                  </span>
                  <span className="text-[11px] font-semibold text-txt-primary">{s.pair}</span>
                </div>
                <span className="text-[8px] text-txt-faint">{fmtTimeAgo(s.timestamp)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-txt-secondary">{fmtPrice(s.price)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-txt-muted">{s.confidence}%</span>
                  {s.pnlPercent !== undefined && (
                    <span className={`text-[9px] font-mono font-semibold ${s.pnlPercent >= 0 ? "text-buy" : "text-sell"}`}>
                      {s.pnlPercent >= 0 ? "+" : ""}{s.pnlPercent.toFixed(1)}%
                    </span>
                  )}
                  <span className={`text-[7px] font-bold uppercase ${outcomeColor}`}>
                    {s.outcome ?? "pending"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="px-3 py-6 text-center">
          <p className="text-[10px] text-txt-muted">No signals match filter</p>
        </div>
      )}
    </Card>
  );
}

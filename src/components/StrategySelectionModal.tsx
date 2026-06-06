"use client";

import React, { useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { StrategyEngineName } from "@/lib/strategy/config";
import { loadStrategyConfig, serializeStrategyConfig } from "@/lib/strategy/config";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

interface GenerationSession {
  id: string;
  strategy: StrategyEngineName;
  status: "running" | "success" | "error";
  logs: string[];
  result?: any;
  error?: string;
  startedAt: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  coin: string;
  onGenerateComplete?: (strategy: StrategyEngineName, result: any) => void;
}

export default function StrategySelectionModal({ open, onClose, coin, onGenerateComplete }: Props) {
  const d = useDashboard();
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyEngineName | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [sessions, setSessions] = useState<Record<string, GenerationSession>>({});

  // Mock customization options
  const [customOptions, setCustomOptions] = useState({
    liquidityFlow: { minSpreadBps: 3, includeFunding: true },
    confluence: { minConfidence: 70 },
  });

  const strategies: { name: StrategyEngineName; label: string; description: string }[] = [
    {
      name: "liquidityFlow",
      label: "Liquidity Flow (legacy)",
      description: "Orderbook screening, orderflow (imbalance), funding rate, EMA 9 & 21, RSI, spread gate ≤3bps, etc.",
    },
    {
      name: "confluence",
      label: "Confluence V3",
      description: "Unified 8-factor (5 TA + Order Flow / Depth / Funding micro), regime-aware, multi-TF, policy gated. AI optional enrichment only.",
    },
  ];

  const selectStrategy = (name: StrategyEngineName) => {
    // Single selection only: clicking the selected one deselects it.
    // Selecting one automatically "disables" the other visually.
    setSelectedStrategy((prev) => (prev === name ? null : name));
  };

  const startGeneration = async (strategy: StrategyEngineName) => {
    const sessionId = `${strategy}-${Date.now()}`;
    const newSession: GenerationSession = {
      id: sessionId,
      strategy,
      status: "running",
      logs: [`[${new Date().toLocaleTimeString()}] Starting ${strategy === 'confluence' ? 'Confluence V3' : 'Liquidity Flow (legacy)'} generation for ${coin}`],
      startedAt: Date.now(),
    };

    setSessions((prev) => ({ ...prev, [sessionId]: newSession }));

    // Simulate live logs based on strategy
    const logSteps = strategy === "liquidityFlow"
      ? [
          "Fetching orderbook & klines...",
          "Analyzing orderbook imbalance & spread...",
          "Computing EMA 9 / EMA 21...",
          "Checking funding rate & RSI alignment...",
          "Running liquidity gates (spread ≤3bps, imbalance)...",
          "Generating base signal...",
          "Optional AI thesis enrichment...",
        ]
      : [
          "Fetching multi-timeframe klines + microstructure (orderbook, trades, funding)...",
          "Computing factors (Trend/Momentum/Vol/Volume/Structure + OrderFlow/Depth/Funding)...",
          "Regime detection (TRENDING_UP/DOWN, RANGING, VOLATILE, BREAKOUT)...",
          "Multi-TF confluence agreement scoring...",
          "Volatility-adjusted TP/SL (ATR × regime × type)...",
          "Classify + apply min-confluence / policy filters...",
        ];

    let logIndex = 0;
    const interval = setInterval(() => {
      if (logIndex < logSteps.length) {
        setSessions((prev) => {
          const sess = prev[sessionId];
          if (!sess) return prev;
          return {
            ...prev,
            [sessionId]: {
              ...sess,
              logs: [...sess.logs, `[${new Date().toLocaleTimeString()}] ${logSteps[logIndex]}`],
            },
          };
        });
        logIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    try {
      // Call the real generate with specific strategy
      const currentCfg = loadStrategyConfig();
      const forcedCfg = { ...currentCfg, engine: strategy };
      const serialized = serializeStrategyConfig(forcedCfg);

      const result = await d.generate(coin, true, serialized);

      setSessions((prev) => {
        const sess = prev[sessionId];
        if (!sess) return prev;
        return {
          ...prev,
          [sessionId]: {
            ...sess,
            status: "success",
            result,
            logs: [...sess.logs, `[${new Date().toLocaleTimeString()}] Generation completed successfully.`],
          },
        };
      });

      onGenerateComplete?.(strategy, result);

      toast.success(`Signal ${strategy} successfully generated`, {
        description: "Signal has been successfully generated. Please return to the Live Decision Score panel to view the results.",
        action: {
          label: "Close Modal",
          onClick: onClose,
        },
      });
    } catch (err: any) {
      setSessions((prev) => {
        const sess = prev[sessionId];
        if (!sess) return prev;
        return {
          ...prev,
          [sessionId]: {
            ...sess,
            status: "error",
            error: err?.message || "Generation failed",
            logs: [...sess.logs, `[${new Date().toLocaleTimeString()}] ERROR: ${err?.message || "Unknown error"}`],
          },
        };
      });
    }
  };

  const handleGenerateSelected = () => {
    if (selectedStrategy) {
      startGeneration(selectedStrategy);
    }
    // Keep modal open so user can see logs (or minimize)
  };

  const toggleMinimize = () => {
    setMinimized(!minimized);
  };

  if (minimized) {
    const hasSuccess = Object.values(sessions).some(s => s.status === "success");
    const hasRunning = Object.values(sessions).some(s => s.status === "running");
    return (
      <div className="fixed bottom-4 right-4 z-[100] bg-[#0B1020] border border-border-default rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-2">
        {hasSuccess && !hasRunning ? (
          <span className="text-emerald-500">✅ Generation complete</span>
        ) : (
          <span className="text-txt-secondary">Generating signals...</span>
        )}
        <button onClick={toggleMinimize} className="text-accent hover:underline">Expand</button>
        <button onClick={onClose} className="text-txt-muted hover:text-white">×</button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-xl border border-border-default bg-[#0B1020] p-4 text-sm mt-[-800px]"
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 30 }}
            transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.7 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">Generate Signal — Choose Strategy</div>
                <div className="text-[10px] text-txt-muted">Transparency mode for judges & users</div>
              </div>
              <div className="flex gap-2">
                <button onClick={toggleMinimize} className="text-xs px-2 py-1 border border-border-default rounded hover:bg-inset active:scale-[0.98] transition-all cursor-pointer">Minimize</button>
                <button 
                  onClick={() => setCustomizeOpen(!customizeOpen)} 
                  disabled={!selectedStrategy}
                  className="text-xs px-2 py-1 border border-border-default rounded hover:bg-inset active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Customize
                </button>
                <button onClick={onClose} className="text-xs px-2 py-1 text-txt-muted hover:text-white active:scale-[0.98] transition-all cursor-pointer">Close</button>
              </div>
            </div>

            {/* Strategy selection - single choice only */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {strategies.map((s) => {
                const isSelected = selectedStrategy === s.name;
                const otherSelected = selectedStrategy && selectedStrategy !== s.name;
                return (
                  <div
                    key={s.name}
                    onClick={() => selectStrategy(s.name)}
                    className={`rounded-lg border p-3 transition-all ${otherSelected ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:scale-[1.015] active:scale-[0.985]'} ${isSelected ? "border-accent bg-accent/5" : "border-border-default hover:border-accent/50"}`}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {/* Radio-style indicator instead of checkbox for single choice */}
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-accent bg-accent' : 'border-border-default'}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#0B1020]" />}
                      </div>
                      {s.label}
                    </div>
                    <div className="text-[11px] text-txt-secondary mt-1">{s.description}</div>
                    {otherSelected && (
                      <div className="text-[10px] text-txt-muted mt-1">Disabled while other strategy is selected</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Customize section - only for the selected strategy */}
            {customizeOpen && selectedStrategy && (
              <div className="mb-4 rounded border border-border-default p-3 bg-inset/30 text-xs">
                <div className="font-medium mb-2">Customize Parameters</div>
                {selectedStrategy === "liquidityFlow" && (
                  <div>
                    <div className="text-txt-muted mb-1">Liquidity Flow (legacy)</div>
                    <label className="block">Min Spread (bps): <input type="number" value={customOptions.liquidityFlow.minSpreadBps} onChange={e => setCustomOptions(p => ({...p, liquidityFlow: {...p.liquidityFlow, minSpreadBps: parseFloat(e.target.value)}}))} className="bg-[#111827] w-16 px-1 rounded" /></label>
                    <label className="flex items-center gap-1 mt-1"><input type="checkbox" checked={customOptions.liquidityFlow.includeFunding} onChange={e => setCustomOptions(p => ({...p, liquidityFlow: {...p.liquidityFlow, includeFunding: e.target.checked}}))} /> Include Funding Rate</label>
                  </div>
                )}
                {selectedStrategy === "confluence" && (
                  <div>
                    <div className="text-txt-muted mb-1">Confluence V3</div>
                    <label>Min Confidence: <input type="number" value={customOptions.confluence.minConfidence} onChange={e => setCustomOptions(p => ({...p, confluence: {...p.confluence, minConfidence: parseInt(e.target.value)}}))} className="bg-[#111827] w-16 px-1 rounded" /></label>
                  </div>
                )}
              </div>
            )}

            {/* Active generations / logs */}
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wider text-txt-muted mb-1">Live Generation Logs</div>
              {Object.keys(sessions).length === 0 && (
                <div className="text-xs text-txt-secondary italic">Select a strategy above and click Generate to start. Logs will appear here in real time.</div>
              )}
              {Object.values(sessions).map((sess) => (
                <div key={sess.id} className="mb-2 border border-border-default rounded p-2 bg-black/30">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{sess.strategy === 'confluence' ? 'Confluence V3' : 'Liquidity Flow (legacy)'} — {sess.status}</span>
                    <span className="text-txt-muted">{((Date.now() - sess.startedAt) / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="max-h-32 overflow-auto text-[10px] font-mono bg-inset/40 p-1 rounded">
                    {sess.logs.map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap">{log}</div>
                    ))}
                    {sess.status === "running" && <div className="text-accent animate-pulse">...</div>}
                  </div>
                  {sess.error && <div className="text-rose-500 text-xs mt-1">Error: {sess.error}</div>}

                  {sess.status === "success" && (
                    <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg">
                      <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm">
                        ✅ Signal successfully generated!
                      </div>
                      <div className="text-[11px] text-txt-secondary mt-1 mb-2">
                        Signal has been successfully generated. Please return to the Live Decision Score panel to view the results.
                      </div>
                      <button
                        onClick={onClose}
                        className="w-full rounded bg-emerald-500 hover:bg-emerald-600 text-black py-1.5 text-sm font-medium transition-all duration-150 hover:scale-[1.01] active:scale-[0.985] cursor-pointer"
                      >
                        Back to Live Decision Score
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleGenerateSelected}
                disabled={!selectedStrategy}
                className="rounded bg-accent text-black px-3 py-1 text-sm font-medium disabled:opacity-50 hover:bg-emerald-400 active:scale-[0.985] transition-all duration-150 cursor-pointer"
              >
                Generate Signal
              </button>
              <button onClick={onClose} className="rounded border border-border-default px-3 py-1 text-sm hover:bg-inset active:scale-[0.985] transition-all duration-150 cursor-pointer">Close</button>
            </div>

            <div className="mt-3 text-[10px] text-txt-muted">
              Each strategy runs its own screening pipeline. After success, click the button in the success banner to return to the main panel.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

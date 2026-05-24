"use client";

import { useState } from "react";
import type { Signal } from "./mock-data";

export function useAISignal() {
  const [aiSignal, setAiSignal] = useState<Signal | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(coin: string) {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/signals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const signal: Signal = {
        id: `ai-${Date.now()}`,
        pair: json.pair || `${coin}/USDC`,
        action: json.action,
        confidence: json.confidence,
        price: json.price ?? 0,
        change24h: json.change24h ?? 0,
        reasoning: json.reasoning,
        dimensions: {
          etfFlow: json.dimensions.etfFlow.score,
          sentiment: json.dimensions.sentiment.score,
          macro: json.dimensions.macro.score,
          momentum: json.dimensions.momentum.score,
          treasury: json.dimensions.treasury.score,
        },
        dimensionDetails: {
          etfFlow: { score: json.dimensions.etfFlow.score, detail: json.dimensions.etfFlow.detail },
          sentiment: { score: json.dimensions.sentiment.score, detail: json.dimensions.sentiment.detail },
          macro: { score: json.dimensions.macro.score, detail: json.dimensions.macro.detail },
          momentum: { score: json.dimensions.momentum.score, detail: json.dimensions.momentum.detail },
          treasury: { score: json.dimensions.treasury.score, detail: json.dimensions.treasury.detail },
        },
        execution: {
          orderType: json.execution.orderType,
          entry: json.execution.entry,
          takeProfit: json.execution.takeProfit ?? 0,
          stopLoss: json.execution.stopLoss ?? 0,
          positionSize: json.execution.positionSize,
          riskReward: json.execution.riskReward,
        },
        sources: json.sources ?? [],
        timeAgo: "just now",
      };
      setAiSignal(signal);
      return signal;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI analysis failed";
      setError(msg);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }

  return { aiSignal, analyzing, error, generate, clear: () => setAiSignal(null) };
}

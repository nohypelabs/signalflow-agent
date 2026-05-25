"use client";

import { useState } from "react";
import type { Signal } from "../types/signal";
import type { AIConfig } from "../types/datasource";
import { getProvider } from "../ai-providers";
import { fetchAISignal } from "../api/signals";

export function useAISignal(aiConfig?: AIConfig) {
  const [aiSignal, setAiSignal] = useState<Signal | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(coin: string) {
    setAnalyzing(true);
    setError(null);
    try {
      let opts: { provider?: string; model?: string; apiKey?: string } = {};
      if (aiConfig?.apiKey) {
        const provider = getProvider(aiConfig.providerId);
        if (provider) {
          opts = {
            provider: provider.baseUrl,
            model: aiConfig.model || provider.defaultModel,
            apiKey: aiConfig.apiKey,
          };
        }
      }

      const json = await fetchAISignal(coin, opts);
      const dims = json.dimensions as Record<string, { score: number; detail: string }>;
      const exec = json.execution as Record<string, unknown>;

      const signal: Signal = {
        id: `ai-${Date.now()}`,
        pair: (json.pair as string) || `${coin}/USDC`,
        action: json.action as Signal["action"],
        confidence: json.confidence as number,
        price: (json.price as number) ?? 0,
        change24h: (json.change24h as number) ?? 0,
        reasoning: json.reasoning as string,
        dimensions: {
          etfFlow: dims.etfFlow.score,
          sentiment: dims.sentiment.score,
          macro: dims.macro.score,
          momentum: dims.momentum.score,
          treasury: dims.treasury.score,
        },
        dimensionDetails: {
          etfFlow: { score: dims.etfFlow.score, detail: dims.etfFlow.detail },
          sentiment: { score: dims.sentiment.score, detail: dims.sentiment.detail },
          macro: { score: dims.macro.score, detail: dims.macro.detail },
          momentum: { score: dims.momentum.score, detail: dims.momentum.detail },
          treasury: { score: dims.treasury.score, detail: dims.treasury.detail },
        },
        execution: {
          orderType: exec.orderType as string,
          entry: (exec.entry as number) ?? 0,
          takeProfit: (exec.takeProfit as number) ?? 0,
          stopLoss: (exec.stopLoss as number) ?? 0,
          positionSize: (exec.positionSize as string) ?? "",
          riskReward: (exec.riskReward as string) ?? "",
        },
        sources: (json.sources as string[]) ?? [],
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

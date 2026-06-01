"use client";

import { useState } from "react";
import type { Signal } from "../types/signal";
import type { AIConfig } from "../types/datasource";
import type { Provider } from "../ai-providers";
import { getAllowedProvider } from "../ai-providers";
import { fetchAISignal } from "../api/signals";

export function useAISignal(aiConfig?: AIConfig) {
  const [aiSignal, setAiSignal] = useState<Signal | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(coin: string) {
    setAnalyzing(true);
    setError(null);
    try {
      let opts: { provider?: Provider; model?: string; apiKey?: string } = {};
      if (aiConfig?.apiKey) {
        const provider = getAllowedProvider(aiConfig.providerId);
        if (provider) {
          opts = {
            provider: provider.id as Provider,
            model: aiConfig.model || provider.defaultModel,
            apiKey: aiConfig.apiKey,
          };
        }
      }

      const result = await fetchAISignal(coin, { ...opts, includeAI: true });

      // Use baseSignal from the new API response
      const signal: Signal = {
        ...result.baseSignal,
        id: `ai-${Date.now()}`,
        timeAgo: "just now",
      };

      // If AI thesis is available, enrich the signal
      if (result.aiThesis) {
        signal.reasoning = result.aiThesis.reasoning;
        signal.dimensionDetails = result.aiThesis.dimensionDetails;
        signal.execution = result.aiThesis.execution;
      }

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

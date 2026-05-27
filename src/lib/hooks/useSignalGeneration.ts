"use client";

import { useState } from "react";
import type { Signal, SignalGenerationResult, SignalDimensionDetails, SignalExecution } from "../types/signal";
import type { AIConfig } from "../types/datasource";
import type { AIError } from "../ai/providerErrors";
import { getProvider } from "../ai-providers";
import { fetchAISignal } from "../api/signals";
import { mapAIError } from "../ai/providerErrors";

export type SignalPhase =
  | "idle"
  | "fetching_market_data"
  | "computing_signal"
  | "generating_ai_thesis"
  | "success"
  | "partial_success"
  | "error";

export interface AIThesis {
  reasoning: string;
  dimensionDetails: SignalDimensionDetails;
  execution: SignalExecution;
}

export function useSignalGeneration(aiConfig?: AIConfig) {
  const [phase, setPhase] = useState<SignalPhase>("idle");
  const [baseSignal, setBaseSignal] = useState<Signal | null>(null);
  const [aiThesis, setAiThesis] = useState<AIThesis | null>(null);
  const [aiError, setAiError] = useState<AIError | null>(null);

  const analyzing = phase === "fetching_market_data" || phase === "computing_signal" || phase === "generating_ai_thesis";

  async function generate(coin: string, includeAI: boolean) {
    setPhase("fetching_market_data");
    setAiError(null);
    setAiThesis(null);

    try {
      // Build provider opts if user has configured AI
      let opts: { provider?: string; model?: string; apiKey?: string; includeAI?: boolean } = { includeAI };
      if (includeAI && aiConfig?.apiKey) {
        const provider = getProvider(aiConfig.providerId);
        if (provider) {
          opts = {
            provider: provider.baseUrl,
            model: aiConfig.model || provider.defaultModel,
            apiKey: aiConfig.apiKey,
            includeAI,
          };
          console.log(`[SignalGen] Using user provider: ${provider.name} (${provider.baseUrl}) model=${opts.model}`);
        }
      } else {
        console.log(`[SignalGen] No user API key, using server default. includeAI=${includeAI} hasKey=${!!aiConfig?.apiKey}`);
      }

      setPhase(includeAI ? "generating_ai_thesis" : "computing_signal");

      const result: SignalGenerationResult = await fetchAISignal(coin, opts);

      setBaseSignal(result.baseSignal);

      if (result.aiThesis) {
        setAiThesis(result.aiThesis);
        setPhase("success");
      } else if (result.aiError) {
        setAiError(result.aiError as AIError);
        setPhase("partial_success");
      } else {
        // includeAI was false — base signal only
        setPhase("success");
      }

      return result.baseSignal;
    } catch (err) {
      // Network/fetch error — no base signal available
      const mapped = mapAIError(err);
      setAiError(mapped);
      setPhase("error");
      return null;
    }
  }

  function clear() {
    setPhase("idle");
    setBaseSignal(null);
    setAiThesis(null);
    setAiError(null);
  }

  return {
    phase,
    baseSignal,
    aiThesis,
    aiError,
    analyzing,
    generate,
    clear,
  };
}

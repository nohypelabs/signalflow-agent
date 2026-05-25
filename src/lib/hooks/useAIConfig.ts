"use client";

import { useState, useEffect, useCallback } from "react";
import type { AIConfig } from "../types/datasource";
import { getProvider } from "../ai-providers";

const STORAGE_KEY = "signalflow-ai-config";

function load(): AIConfig {
  if (typeof window === "undefined") {
    return { providerId: "deepseek", apiKey: "", model: "deepseek-chat" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.providerId && typeof parsed.apiKey === "string") {
        return {
          providerId: parsed.providerId,
          apiKey: parsed.apiKey,
          model: parsed.model || getProvider(parsed.providerId)?.defaultModel || "",
        };
      }
    }
  } catch {
    // corrupted
  }
  return { providerId: "deepseek", apiKey: "", model: "deepseek-chat" };
}

function save(config: AIConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // quota exceeded
  }
}

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>(load);

  useEffect(() => {
    setConfig(load());
  }, []);

  const update = useCallback((patch: Partial<AIConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.providerId && patch.providerId !== prev.providerId) {
        const provider = getProvider(patch.providerId);
        next.model = provider?.defaultModel || "";
        next.apiKey = "";
      }
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    const empty: AIConfig = { providerId: "deepseek", apiKey: "", model: "deepseek-chat" };
    setConfig(empty);
    save(empty);
  }, []);

  const hasKey = config.apiKey.length > 0;

  return { config, update, clear, hasKey };
}

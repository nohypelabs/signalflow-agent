"use client";

import { useState } from "react";
import { useStatus } from "@/lib/hooks/useStatus";
import { AI_PROVIDERS, getProvider, type AIConfig } from "@/lib/ai-providers";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

/* ── Provider metadata ── */

const PROVIDER_META: Record<string, { color: string; tagline: string }> = {
  deepseek: { color: "#0066FF", tagline: "Cost-effective reasoning" },
  openai: { color: "#10A37F", tagline: "GPT-4o, o3 reasoning" },
  anthropic: { color: "#D4A574", tagline: "Claude via OpenRouter recommended" },
  google: { color: "#4285F4", tagline: "Gemini multimodal" },
  openrouter: { color: "#8B5CF6", tagline: "Multi-provider gateway" },
  xiaomi: { color: "#FF6900", tagline: "MiMo — fast & efficient" },
  zhipu: { color: "#2563EB", tagline: "GLM Chinese LLM" },
  qwen: { color: "#7C3AED", tagline: "Alibaba Qwen series" },
  mistral: { color: "#F97316", tagline: "European open models" },
  groq: { color: "#F55036", tagline: "Ultra-fast inference" },
  xai: { color: "#1DA1F2", tagline: "Grok — real-time reasoning" },
};

/* ── Props ── */

interface Props {
  walletConnected: boolean;
  aiConfig: AIConfig;
  onAIConfigChange: (patch: Partial<AIConfig>) => void;
}

const statusVariant: Record<string, string> = {
  connected: "live",
  error: "error",
  no_key: "warning",
};

export default function SettingsPage({ walletConnected, aiConfig, onAIConfigChange }: Props) {
  const { services, loading, error } = useStatus({
    providerId: aiConfig.providerId,
    model: aiConfig.model,
    apiKey: aiConfig.apiKey,
  });
  const selectedProvider = getProvider(aiConfig.providerId);
  const meta = PROVIDER_META[aiConfig.providerId];
  const [showKey, setShowKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const handleSaveKey = () => {
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-txt-primary tracking-tight">Settings</h2>
        <p className="text-xs text-txt-muted mt-0.5">Configure your AI agent, API connections, and preferences.</p>
      </div>

      {/* ── AI Agent Configuration ── */}
      <div>
        <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">AI Agent Configuration</h3>

        {/* Provider grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {AI_PROVIDERS.map((p) => {
            const pm = PROVIDER_META[p.id];
            const isSelected = aiConfig.providerId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onAIConfigChange({ providerId: p.id, model: p.defaultModel })}
                className={`
                  relative p-3 rounded-xl border text-left transition-all cursor-pointer
                  ${isSelected
                    ? "border-accent bg-accent/5 shadow-sm shadow-accent/10"
                    : "border-border-default bg-card hover:border-border-muted hover:bg-elevated/50"
                  }
                `}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pm?.color ?? "#64748B" }}
                  />
                  <span className="text-xs font-semibold text-txt-primary truncate">{p.name}</span>
                </div>
                <p className="text-[9px] text-txt-dim leading-tight">{pm?.tagline ?? p.baseUrl}</p>
              </button>
            );
          })}
        </div>

        {/* Selected provider details */}
        {selectedProvider && (
          <Card padding="lg" className="space-y-4" accent={meta?.color}>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta?.color ?? "#64748B" }} />
                <h4 className="truncate text-sm font-bold text-txt-primary">{selectedProvider.name}</h4>
              </div>
              <span className="min-w-0 truncate text-[10px] text-txt-dim font-mono sm:max-w-[42%]">{selectedProvider.baseUrl}</span>
            </div>

            {/* Model selector */}
            <div>
              <label className="text-[10px] text-txt-muted uppercase tracking-wider mb-1.5 block">Model</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {selectedProvider.models.map((m) => {
                  const isActive = aiConfig.model === m;
                  return (
                    <button
                      key={m}
                      onClick={() => onAIConfigChange({ model: m })}
                      className={`
                        px-3 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer text-left
                        ${isActive
                          ? "border-accent bg-accent/10 text-accent font-semibold"
                          : "border-border-default bg-inset text-txt-secondary hover:border-border-muted hover:text-txt-primary"
                        }
                      `}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="text-[10px] text-txt-muted uppercase tracking-wider mb-1.5 block">
                API Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={aiConfig.apiKey}
                    onChange={(e) => onAIConfigChange({ apiKey: e.target.value })}
                    placeholder={walletConnected ? `Enter your ${selectedProvider.name} API key...` : "Connect wallet first"}
                    disabled={!walletConnected}
                    className="w-full bg-inset border border-border-default rounded-lg px-3 py-2 pr-16 text-sm text-txt-primary font-mono focus:outline-none focus:border-accent disabled:opacity-40"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-txt-dim hover:text-txt-secondary px-2 py-0.5 rounded bg-elevated/60"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                {aiConfig.apiKey && (
                  <button
                    onClick={handleSaveKey}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      apiKeySaved
                        ? "bg-buy/20 text-buy border border-buy/30"
                        : "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
                    }`}
                  >
                    {apiKeySaved ? "Saved" : "Save"}
                  </button>
                )}
              </div>

              {aiConfig.apiKey && (
                <p className="text-[10px] text-buy mt-1.5 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Using your own {selectedProvider.name} key — requests billed to your account
                </p>
              )}
              {!aiConfig.apiKey && walletConnected && (
                <p className="text-[10px] text-txt-dim mt-1.5">
                  Leave blank to use server default (DeepSeek)
                </p>
              )}
            </div>

            {/* Active config summary */}
            <div className="flex items-center gap-3 pt-2 border-t border-border-default">
              <span className="text-[10px] text-txt-dim">Active:</span>
              <Badge variant="accent" size="sm">{selectedProvider.name}</Badge>
              <span className="text-[10px] text-txt-muted font-mono">{aiConfig.model || selectedProvider.defaultModel}</span>
              <span className="text-[10px] text-txt-dim">·</span>
              <Badge variant={aiConfig.apiKey ? "live" : "muted"} size="sm">
                {aiConfig.apiKey ? "Custom Key" : "Server Default"}
              </Badge>
            </div>
          </Card>
        )}
      </div>

      {/* ── API Connections ── */}
      <div>
        <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">API Connections</h3>
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              <Skeleton variant="table-row" />
              <Skeleton variant="table-row" />
              <Skeleton variant="table-row" />
            </div>
          ) : error ? (
            <div className="p-4">
              <p className="text-xs text-sell">Status check failed: {error}</p>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {services.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-elevated/30 transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      s.status === "connected" ? "bg-buy" : s.status === "no_key" ? "bg-hold" : "bg-sell"
                    }`} />
                    <span className="truncate text-xs text-txt-primary font-medium">{s.name}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="hidden truncate text-[10px] text-txt-dim font-mono sm:inline">{s.detail}</span>
                    {s.latencyMs > 0 && (
                      <span className="text-[10px] text-txt-faint font-mono">{s.latencyMs}ms</span>
                    )}
                    <Badge variant={statusVariant[s.status] || "muted"} size="sm">
                      {s.status === "connected" ? "Connected" : s.status === "no_key" ? "No Key" : "Error"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── General Settings ── */}
      <div>
        <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">General</h3>
        <Card padding="none" className="overflow-hidden divide-y divide-border-default">
          {[
            { label: "AI Model", value: selectedProvider ? `${selectedProvider.name} / ${aiConfig.model || selectedProvider.defaultModel}` : "DeepSeek Chat", badge: aiConfig.apiKey ? "Custom" : "Server" },
            { label: "Signal Refresh", value: "60 seconds", badge: null },
            { label: "SoDEX Network", value: "Mainnet", badge: null },
            { label: "Wallet", value: walletConnected ? "Connected" : "Not connected", badge: walletConnected ? "Active" : null },
            { label: "Version", value: "v0.1.0", badge: null },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-elevated/30 transition-colors">
              <span className="shrink-0 text-xs text-txt-tertiary">{item.label}</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-right text-xs text-txt-primary font-mono">{item.value}</span>
                {item.badge && (
                  <Badge variant={item.badge === "Custom" ? "accent" : item.badge === "Active" ? "live" : "muted"} size="sm">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useStatus } from "@/lib/hooks/useStatus";
import { AI_PROVIDERS, getProvider, type AIConfig } from "@/lib/ai-providers";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import ProgressBar from "@/components/ui/ProgressBar";

/* ── Agent profiles metadata ── */

const AGENT_PROFILES: Record<
  string,
  {
    color: string;
    tagline: string;
    specialty: string;
    speed: string;
    speedPct: number;
    cost: "Low" | "Medium" | "High";
    focus: string;
    bgGradient: string;
  }
> = {
  deepseek: {
    color: "#0066FF",
    tagline: "DeepSeek Reasoning",
    specialty: "Reasoning & Logic",
    speed: "Moderate (~2.5s)",
    speedPct: 60,
    cost: "Low",
    focus: "Swing & Position thesis generation",
    bgGradient: "from-[#0066FF]/10 to-transparent",
  },
  openai: {
    color: "#10A37F",
    tagline: "GPT-4o Precision",
    specialty: "High Precision",
    speed: "Fast (~1.2s)",
    speedPct: 85,
    cost: "Medium",
    focus: "Intraday & General market sentiment",
    bgGradient: "from-[#10A37F]/10 to-transparent",
  },
  anthropic: {
    color: "#D4A574",
    tagline: "Claude Deep Intel",
    specialty: "Complex Analysis",
    speed: "Thoughtful (~3.5s)",
    speedPct: 45,
    cost: "High",
    focus: "Long-term trend & multi-factor research",
    bgGradient: "from-[#D4A574]/10 to-transparent",
  },
  google: {
    color: "#4285F4",
    tagline: "Gemini Multimodal",
    specialty: "Data Fusion",
    speed: "Fast (~1.5s)",
    speedPct: 80,
    cost: "Low",
    focus: "ETF flows & macro calendar events",
    bgGradient: "from-[#4285F4]/10 to-transparent",
  },
  openrouter: {
    color: "#8B5CF6",
    tagline: "OpenRouter Hub",
    specialty: "Model Aggregation",
    speed: "Network Dependent",
    speedPct: 50,
    cost: "Medium",
    focus: "Accessing custom experimental models",
    bgGradient: "from-[#8B5CF6]/10 to-transparent",
  },
  xiaomi: {
    color: "#FF6900",
    tagline: "MiMo Assistant",
    specialty: "Lightweight Processing",
    speed: "Blazing Fast (~0.5s)",
    speedPct: 95,
    cost: "Low",
    focus: "Scalping & quick-fire volatility signals",
    bgGradient: "from-[#FF6900]/10 to-transparent",
  },
  zhipu: {
    color: "#2563EB",
    tagline: "GLM Structuralist",
    specialty: "Pattern Matching",
    speed: "Fast (~1.4s)",
    speedPct: 82,
    cost: "Low",
    focus: "Order flow and structure breakdown",
    bgGradient: "from-[#2563EB]/10 to-transparent",
  },
  qwen: {
    color: "#7C3AED",
    tagline: "Qwen Specialist",
    specialty: "Macro Analysis",
    speed: "Fast (~1.3s)",
    speedPct: 84,
    cost: "Low",
    focus: "Cross-asset correlation analytics",
    bgGradient: "from-[#7C3AED]/10 to-transparent",
  },
  mistral: {
    color: "#F97316",
    tagline: "Mistral Reasoning",
    specialty: "Technical Analysis",
    speed: "Moderate (~2.0s)",
    speedPct: 70,
    cost: "Medium",
    focus: "Indicator confluence evaluations",
    bgGradient: "from-[#F97316]/10 to-transparent",
  },
  groq: {
    color: "#F55036",
    tagline: "Groq Instant Execution",
    specialty: "Low Latency Scalper",
    speed: "Sub-second (~0.15s)",
    speedPct: 100,
    cost: "Low",
    focus: "High-frequency micro-volatility scalping",
    bgGradient: "from-[#F55036]/10 to-transparent",
  },
  xai: {
    color: "#1DA1F2",
    tagline: "Grok Social Intel",
    specialty: "Sentiment Discovery",
    speed: "Fast (~1.1s)",
    speedPct: 88,
    cost: "High",
    focus: "Real-time news & social catalyst scans",
    bgGradient: "from-[#1DA1F2]/10 to-transparent",
  },
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
  const [showKey, setShowKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const handleSaveKey = () => {
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Settings</h2>
          <p className="text-xs text-txt-muted mt-0.5">Configure your AI agent, API connections, and preferences.</p>
        </div>

        {/* Developer mode connection banner */}
        {walletConnected ? (
          <div className="rounded-xl border border-buy/30 bg-buy/5 px-3 py-2 flex items-center gap-2.5 shadow-[0_0_15px_rgba(0,229,168,0.06)] animate-pulse-slow">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-buy opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-buy"></span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-buy uppercase tracking-wider">Dev Test Mode: Active</p>
              <p className="text-[9px] text-txt-dim leading-none mt-0.5">Custom agent credential overrides unlocked.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-hold/30 bg-hold/5 px-3 py-2 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-hold shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-hold uppercase tracking-wider">Locked: Read-Only Mode</p>
              <p className="text-[9px] text-txt-dim leading-none mt-0.5">Connect wallet to unlock credential overrides.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── AI Agent Configuration ── */}
      <div data-tour="settings-agent" className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">AI Agent Selection</h3>
          <p className="text-[11px] text-txt-dim mt-0.5">Choose which intelligence engine backbones the strategy generator.</p>
        </div>

        {/* Provider grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {AI_PROVIDERS.map((p) => {
            const ap = AGENT_PROFILES[p.id] || {
              color: "#64748B",
              tagline: p.name,
              specialty: "General Purpose",
              speed: "N/A",
              speedPct: 50,
              cost: "Medium",
              focus: "General analysis",
              bgGradient: "from-slate-500/10 to-transparent",
            };
            const isSelected = aiConfig.providerId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onAIConfigChange({ providerId: p.id, model: p.defaultModel })}
                className={`
                  relative p-4 rounded-2xl text-left transition-all cursor-pointer overflow-hidden group
                  neu-card hover:bg-elevated/20
                  ${isSelected
                    ? "ring-2 ring-accent"
                    : ""
                  }
                `}
                style={{
                  boxShadow: isSelected ? "0 0 20px rgba(0, 229, 168, 0.1), inset 0 0 12px rgba(0, 229, 168, 0.02)" : undefined,
                }}
              >
                {/* Background glow gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${ap.bgGradient} opacity-30 transition-opacity group-hover:opacity-50`} />

                {/* Selected check indicator */}
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[#070A12] shadow-sm">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ap.color, boxShadow: `0 0 8px ${ap.color}` }}
                    />
                    <span className="text-xs font-bold text-txt-primary truncate">{p.name}</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-txt-secondary font-medium truncate">{ap.tagline}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-[#ffffff05] text-txt-dim border border-white/5">{ap.specialty}</span>
                      <span className={`text-[8px] font-mono px-1 py-0.5 rounded border ${
                        ap.cost === "Low" ? "bg-buy/15 text-buy border-buy/10" :
                        ap.cost === "Medium" ? "bg-hold/15 text-hold border-hold/10" : "bg-sell/15 text-sell border-sell/10"
                      }`}>{ap.cost} Cost</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected agent profile details */}
        {selectedProvider && (() => {
          const ap = AGENT_PROFILES[aiConfig.providerId] || {
            color: "#64748B",
            tagline: selectedProvider.name,
            specialty: "General Purpose",
            speed: "N/A",
            speedPct: 50,
            cost: "Medium",
            focus: "General analysis",
            bgGradient: "from-slate-500/10 to-transparent",
          };
          return (
            <Card data-tour="settings-profile" padding="lg" className="space-y-5 relative overflow-hidden" accent={ap.color}>
              {/* Background blur highlight */}
              <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: ap.color }} />

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-default pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: ap.color, boxShadow: `0 0 12px ${ap.color}` }} />
                  <div>
                    <h4 className="truncate text-sm font-bold text-txt-primary">{selectedProvider.name} Agent</h4>
                    <p className="text-[10px] text-txt-muted">{ap.tagline}</p>
                  </div>
                </div>
                <span className="min-w-0 truncate text-[9px] text-txt-dim font-mono bg-inset px-2.5 py-1 rounded-[35px] border border-border-default self-start sm:self-center">
                  {selectedProvider.baseUrl}
                </span>
              </div>

              {/* Specialty Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Focus */}
                <div className="space-y-1">
                  <span className="text-[9px] text-txt-muted uppercase tracking-wider block">Suggested Focus</span>
                  <p className="text-xs text-txt-secondary font-medium leading-relaxed">{ap.focus}</p>
                </div>

                {/* Speedometer */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-txt-muted uppercase tracking-wider block">Execution Latency</span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-txt-dim">{ap.speed}</span>
                      <span className="text-txt-secondary font-bold">{ap.speedPct}%</span>
                    </div>
                    <ProgressBar value={ap.speedPct} color={ap.color} height="sm" />
                  </div>
                </div>

                {/* Cost/Efficiency */}
                <div className="space-y-1">
                  <span className="text-[9px] text-txt-muted uppercase tracking-wider block">Token Cost Grade</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold font-mono ${
                      ap.cost === "Low" ? "text-buy" : ap.cost === "Medium" ? "text-hold" : "text-sell"
                    }`}>{ap.cost}</span>
                    <span className="text-[10px] text-txt-dim">
                      ({ap.cost === "Low" ? "Highly scalable for frequent calls" : ap.cost === "Medium" ? "Balanced pricing model" : "Premium token pricing"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Model Selector & Key Block */}
              <div className="space-y-4 pt-3 border-t border-border-default">
                {/* Model selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-txt-muted uppercase tracking-wider block">Model Variant</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProvider.models.map((m) => {
                      const isActive = aiConfig.model === m;
                      return (
                        <button
                          key={m}
                          onClick={() => onAIConfigChange({ model: m })}
                          className={`
                            px-3 py-1.5 rounded-lg border text-[11px] font-mono transition-all cursor-pointer
                            ${isActive
                              ? "border-accent bg-accent/10 text-accent font-semibold shadow-sm"
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
                <div className="space-y-1.5">
                  <label className="text-[9px] text-txt-muted uppercase tracking-wider block">
                    Custom API Key Override
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? "text" : "password"}
                        value={aiConfig.apiKey}
                        onChange={(e) => onAIConfigChange({ apiKey: e.target.value })}
                        placeholder={walletConnected ? `Enter your custom ${selectedProvider.name} API key...` : "Connect wallet to override keys"}
                        disabled={!walletConnected}
                        className="w-full bg-inset border border-border-default rounded-xl px-3 py-2 pr-16 text-xs text-txt-primary font-mono focus:outline-none focus:border-accent disabled:opacity-40"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-txt-dim hover:text-txt-secondary px-2 py-0.5 rounded bg-elevated/60 cursor-pointer"
                      >
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    {aiConfig.apiKey && walletConnected && (
                      <button
                        onClick={handleSaveKey}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                          apiKeySaved
                            ? "bg-buy/20 text-buy border border-buy/30"
                            : "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
                        }`}
                      >
                        {apiKeySaved ? "Saved" : "Save"}
                      </button>
                    )}
                  </div>

                  {aiConfig.apiKey && walletConnected && (
                    <p className="text-[10px] text-buy mt-1 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Using custom key — billing will route directly to your account.
                    </p>
                  )}
                  {!aiConfig.apiKey && walletConnected && (
                    <p className="text-[10px] text-txt-dim mt-1">
                      Leave blank to route requests through the default server-managed key (DeepSeek).
                    </p>
                  )}
                  {!walletConnected && (
                    <p className="text-[10px] text-hold mt-1 flex items-center gap-1 font-semibold">
                      ⚠️ Input locked. Please connect your wallet in the top bar to enable custom credentials.
                    </p>
                  )}
                </div>
              </div>

              {/* Active config summary */}
              <div className="flex items-center gap-3 pt-3 border-t border-border-default">
                <span className="text-[9px] text-txt-dim uppercase tracking-wider font-mono">Status:</span>
                <Badge variant="accent" size="sm">{selectedProvider.name}</Badge>
                <span className="text-[10px] text-txt-muted font-mono">{aiConfig.model || selectedProvider.defaultModel}</span>
                <span className="text-[10px] text-txt-dim">·</span>
                <Badge variant={aiConfig.apiKey && walletConnected ? "live" : "muted"} size="sm">
                  {aiConfig.apiKey && walletConnected ? "Custom Key Active" : "Server Managed Default"}
                </Badge>
              </div>
            </Card>
          );
        })()}
      </div>

      {/* ── API Connections ── */}
      <div data-tour="settings-connections">
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
      <div data-tour="settings-general">
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

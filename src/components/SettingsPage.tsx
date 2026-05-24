"use client";

import { useState } from "react";
import { useStatus } from "@/lib/use-status";
import { AI_PROVIDERS, getProvider, type AIConfig } from "@/lib/ai-providers";

interface Props {
  walletConnected: boolean;
  aiConfig: AIConfig;
  onAIConfigChange: (patch: Partial<AIConfig>) => void;
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  connected: { bg: "bg-[#00ff8815]", text: "text-[#00ff88]", border: "border-[#00ff8830]" },
  error: { bg: "bg-[#ff444415]", text: "text-[#ff4444]", border: "border-[#ff444430]" },
  no_key: { bg: "bg-[#ff880015]", text: "text-[#ff8800]", border: "border-[#ff880030]" },
};

export default function SettingsPage({ walletConnected, aiConfig, onAIConfigChange }: Props) {
  const { services, loading, error } = useStatus();
  const selectedProvider = getProvider(aiConfig.providerId);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Settings</h2>

      {/* AI Agent Configuration */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">AI Agent</h3>
          {!walletConnected && (
            <span className="text-[10px] text-[#ff8800]">— Connect wallet to configure</span>
          )}
        </div>

        {/* Provider selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-[#666677]">Provider</label>
          <select
            value={aiConfig.providerId}
            onChange={(e) => onAIConfigChange({ providerId: e.target.value })}
            disabled={!walletConnected}
            className="w-full bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7b2fff] transition-colors disabled:opacity-40"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Model selector */}
        {selectedProvider && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#666677]">Model</label>
            <select
              value={aiConfig.model}
              onChange={(e) => onAIConfigChange({ model: e.target.value })}
              disabled={!walletConnected}
              className="w-full bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7b2fff] transition-colors disabled:opacity-40"
            >
              {selectedProvider.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* API Key input */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-[#666677]">
            API Key {selectedProvider ? `(${selectedProvider.name})` : ""}
          </label>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={aiConfig.apiKey}
              onChange={(e) => onAIConfigChange({ apiKey: e.target.value })}
              placeholder={walletConnected ? "sk-..." : "Connect wallet first"}
              disabled={!walletConnected}
              className="flex-1 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#7b2fff] transition-colors disabled:opacity-40"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 text-[10px] rounded-lg bg-[#0d0d1a] border border-[#1a1a2e] text-[#666677] hover:text-white transition-colors"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          {aiConfig.apiKey && (
            <p className="text-[10px] text-[#00ff88]">
              Using your own {selectedProvider?.name} API key — requests billed to your account
            </p>
          )}
          {!aiConfig.apiKey && walletConnected && (
            <p className="text-[10px] text-[#666677]">
              Leave blank to use server default (Deepseek)
            </p>
          )}
        </div>
      </div>

      {/* API Connections */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">API Connections</h3>
        {loading ? (
          <p className="text-xs text-[#666677]">Checking connections...</p>
        ) : error ? (
          <p className="text-xs text-[#ff4444]">Status check failed: {error}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((s) => {
              const style = statusStyles[s.status];
              return (
                <div key={s.name} className="flex justify-between items-center bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
                  <span className="text-xs text-[#888888]">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#aaaaaa]">{s.detail}</span>
                    {s.latencyMs > 0 && (
                      <span className="text-[10px] text-[#666677]">{s.latencyMs}ms</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
                      {s.status === "connected" ? "Connected" : s.status === "no_key" ? "No Key" : "Error"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">General</h3>
        {[
          { label: "AI Model", value: selectedProvider ? `${selectedProvider.name} / ${aiConfig.model || selectedProvider.defaultModel}` : "Deepseek Chat", status: aiConfig.apiKey ? "Custom" : "Server" },
          { label: "Refresh Interval", value: "60 seconds", status: "" },
          { label: "Notifications", value: "Coming soon", status: "" },
          { label: "SoDEX Network", value: "Mainnet", status: "" },
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
            <span className="text-xs text-[#888888]">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white font-mono">{item.value}</span>
              {item.status && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  item.status === "Custom"
                    ? "bg-[#7b2fff15] text-[#7b2fff] border-[#7b2fff30]"
                    : "bg-[#00ff8815] text-[#00ff88] border-[#00ff8830]"
                }`}>
                  {item.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

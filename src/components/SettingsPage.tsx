"use client";

import { useState } from "react";
import { useStatus } from "@/lib/use-status";
import { AI_PROVIDERS, getProvider, type AIConfig } from "@/lib/ai-providers";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/ui/PageHeader";

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
  const { services, loading, error } = useStatus();
  const selectedProvider = getProvider(aiConfig.providerId);
  const [showKey, setShowKey] = useState(false);

  const inputCls = "w-full bg-inset border border-border-default rounded-lg px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-accent disabled:opacity-40";

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />

      {/* AI Agent Configuration */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">AI Agent</h3>
          {!walletConnected && (
            <span className="text-[10px] text-warning">— Connect wallet to configure</span>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-txt-muted">Provider</label>
          <select
            value={aiConfig.providerId}
            onChange={(e) => onAIConfigChange({ providerId: e.target.value })}
            disabled={!walletConnected}
            className={inputCls}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedProvider && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-txt-muted">Model</label>
            <select
              value={aiConfig.model}
              onChange={(e) => onAIConfigChange({ model: e.target.value })}
              disabled={!walletConnected}
              className={inputCls}
            >
              {selectedProvider.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-txt-muted">
            API Key {selectedProvider ? `(${selectedProvider.name})` : ""}
          </label>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={aiConfig.apiKey}
              onChange={(e) => onAIConfigChange({ apiKey: e.target.value })}
              placeholder={walletConnected ? "sk-..." : "Connect wallet first"}
              disabled={!walletConnected}
              className={`${inputCls} font-mono flex-1`}
            />
            <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
              {showKey ? "Hide" : "Show"}
            </Button>
          </div>
          {aiConfig.apiKey && (
            <p className="text-[10px] text-buy">
              Using your own {selectedProvider?.name} API key — requests billed to your account
            </p>
          )}
          {!aiConfig.apiKey && walletConnected && (
            <p className="text-[10px] text-txt-muted">
              Leave blank to use server default (Deepseek)
            </p>
          )}
        </div>
      </Card>

      {/* API Connections */}
      <Card padding="lg" className="space-y-4">
        <h3 className="font-semibold text-sm">API Connections</h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton variant="table-row" />
            <Skeleton variant="table-row" />
            <Skeleton variant="table-row" />
          </div>
        ) : error ? (
          <p className="text-xs text-error">Status check failed: {error}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((s) => (
              <Card key={s.name} variant="inset" padding="sm" className="flex justify-between items-center">
                <span className="text-xs text-txt-tertiary">{s.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-txt-secondary">{s.detail}</span>
                  {s.latencyMs > 0 && (
                    <span className="text-[10px] text-txt-muted">{s.latencyMs}ms</span>
                  )}
                  <Badge variant={statusVariant[s.status] || "muted"} size="sm">
                    {s.status === "connected" ? "Connected" : s.status === "no_key" ? "No Key" : "Error"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* General Settings */}
      <Card padding="lg" className="space-y-4">
        <h3 className="font-semibold text-sm">General</h3>
        {[
          { label: "AI Model", value: selectedProvider ? `${selectedProvider.name} / ${aiConfig.model || selectedProvider.defaultModel}` : "Deepseek Chat", status: aiConfig.apiKey ? "Custom" : "Server" },
          { label: "Refresh Interval", value: "60 seconds", status: "" },
          { label: "Notifications", value: "Coming soon", status: "" },
          { label: "SoDEX Network", value: "Mainnet", status: "" },
        ].map((item) => (
          <Card key={item.label} variant="inset" padding="sm" className="flex justify-between items-center">
            <span className="text-xs text-txt-tertiary">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-txt-primary font-mono">{item.value}</span>
              {item.status && (
                <Badge variant={item.status === "Custom" ? "accent" : "live"} size="sm">
                  {item.status}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </Card>
    </div>
  );
}

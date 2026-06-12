"use client";

import { useState, useCallback, useEffect } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { SubscriptionTier } from "@/lib/api-auth/context";

/* ── Types ── */

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPreview: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

/* ── Tier Badge ── */

function TierBadge({ tier }: { tier: SubscriptionTier }) {
  const colors: Record<SubscriptionTier, string> = {
    FREE: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    PRO: "bg-accent/20 text-accent border-accent/30",
    WHALE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[tier]}`}>
      {tier === "WHALE" && "🐋"}
      {tier === "PRO" && "⭐"}
      {tier === "FREE" && "🆓"}
      {tier}
    </span>
  );
}

/* ── Main Page ── */

export default function ApiKeysPage() {
  const d = useDashboard();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier] = useState<SubscriptionTier>("FREE");

  const fetchKeys = useCallback(async () => {
    if (!d.isConnected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/keys", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch keys");
      const data = await res.json();
      if (data.success) {
        setKeys(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [d.isConnected]);

  // Fetch keys on mount and when wallet connects
  useEffect(() => {
    if (d.isConnected) fetchKeys();
  }, [d.isConnected, fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message ?? data.error?.code ?? "Failed to create key");
      }

      if (data.success) {
        setNewKeySecret(data.data.key);
        setNewKeyName("");
        fetchKeys();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Failed to revoke key");
      }
    } catch {
      setError("Failed to revoke key — please try again");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  if (!d.isConnected) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-lg font-bold text-txt-primary mb-2">Connect Wallet</h2>
            <p className="text-sm text-txt-muted">
              Connect your wallet to manage API keys and access the paid API.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">API Keys</h2>
          <p className="text-xs text-txt-muted mt-0.5">
            Generate API keys to access the SignalFlow REST API programmatically.
          </p>
        </div>
        <TierBadge tier={tier} />
      </div>

      {/* Documentation Link */}
      <Card>
        <div className="flex items-center gap-3 p-4">
          <div className="text-2xl">📖</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-txt-primary">API Documentation</h3>
            <p className="text-xs text-txt-muted mt-0.5">
              Base URL: <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">https://signalflow.agent/api/v1</code>
            </p>
          </div>
          <a
            href="/docs"
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            View Docs →
          </a>
        </div>
      </Card>

      {/* Create New Key */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-txt-primary">Create New Key</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., my-trading-bot)"
              className="flex-1 bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-accent/50"
              maxLength={50}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 bg-accent text-bg-base font-semibold text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Creating..." : "Generate"}
            </button>
          </div>
        </div>
      </Card>

      {/* New Key Display (shown once) */}
      {newKeySecret && (
        <Card>
          <div className="p-4 space-y-3 border border-accent/30 bg-accent/5">
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg">⚠️</span>
              <h3 className="text-sm font-bold text-accent">
                Save your API key now — it won&apos;t be shown again!
              </h3>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 bg-bg-base px-3 py-2 rounded-lg text-xs text-txt-primary font-mono break-all">
                {newKeySecret}
              </code>
              <button
                onClick={() => copyToClipboard(newKeySecret)}
                className="px-3 py-2 bg-accent/20 text-accent text-xs font-semibold rounded-lg hover:bg-accent/30 transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setNewKeySecret(null)}
              className="text-xs text-txt-muted hover:text-txt-secondary transition-colors"
            >
              I&apos;ve saved my key — dismiss
            </button>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        </Card>
      )}

      {/* Keys List */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-txt-primary mb-3">Your API Keys</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-bg-base rounded-lg animate-pulse" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">🔑</div>
              <p className="text-sm text-txt-muted">No API keys yet. Create one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-3 p-3 bg-bg-base rounded-lg border border-border-default"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-txt-primary">{key.name}</span>
                      <Badge variant={key.status === "ACTIVE" ? "live" : "error"}>
                        {key.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-txt-muted">
                      <code className="font-mono">{key.keyPreview}</code>
                      <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && (
                        <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

"use client";

import { Signal } from "@/lib/mock-data";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";

const actionColors: Record<string, string> = {
  buy: "#00ff88",
  sell: "#ff4444",
  hold: "#ff8800",
};

interface Props {
  aiConfig: any;
  aiProviderLabel: string;
  aiCoin: string;
  onCoinChange: (coin: string) => void;
  analyzing: boolean;
  aiSignal: Signal | null;
  aiError: string | null;
  onGenerate: () => void;
  onPinSignal: () => void;
  onExecuteSignal: () => void;
}

export default function AISignalGenerator({
  aiConfig,
  aiProviderLabel,
  aiCoin,
  onCoinChange,
  analyzing,
  aiSignal,
  aiError,
  onGenerate,
  onPinSignal,
  onExecuteSignal,
}: Props) {
  const accentColor = aiSignal ? (actionColors[aiSignal.action.toLowerCase()] ?? "#00E5A8") : "#00E5A8";

  return (
    <Card padding="none" className="overflow-hidden" style={{ borderLeft: `3px solid ${accentColor}` }}>
      {/* Header row */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap border-b border-border-default">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H14c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
            <line x1="10" y1="18" x2="14" y2="18" /><line x1="10" y1="22" x2="14" y2="22" />
          </svg>
          <span className="text-sm font-semibold text-txt-primary">AI Signal Generator</span>
        </div>
        <Badge variant="accent" size="sm">
          {aiProviderLabel} {aiConfig.model ? `/ ${aiConfig.model}` : ""}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={aiCoin}
            onChange={(e) => onCoinChange(e.target.value)}
            className="bg-inset border border-border-default rounded-lg px-3 py-1.5 text-xs text-txt-primary focus:border-accent outline-none cursor-pointer"
          >
            {["BTC", "ETH", "SOL", "AVAX", "LINK"].map((c) => (
              <option key={c} value={c}>{c}/USDC</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            loading={analyzing}
            onClick={onGenerate}
          >
            {analyzing ? "Analyzing..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Result row */}
      {aiSignal && (
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap bg-inset/30">
          <ConfidenceGauge value={aiSignal.confidence} size="sm" />
          <Badge variant={aiSignal.action.toLowerCase()} size="md">{aiSignal.action}</Badge>
          <span className="text-xs text-txt-secondary font-medium">{aiSignal.pair}</span>
          <span className="text-xs text-txt-muted">
            @ ${aiSignal.price.toLocaleString()}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="success" size="sm" onClick={onPinSignal}>
              Pin
            </Button>
            <Button variant="secondary" size="sm" onClick={onExecuteSignal}>
              Execute
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {aiError && (
        <div className="px-4 py-2.5 bg-sell-muted/30 border-t border-sell-dim">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-sell)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-xs text-error">{aiError}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

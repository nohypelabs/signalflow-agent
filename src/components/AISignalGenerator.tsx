"use client";

import { Signal } from "@/lib/mock-data";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";

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
  return (
    <Card padding="md" className="border-l-2 border-l-accent">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-txt-primary">AI Signal Generator</span>
        <Badge variant="accent" size="sm">
          {aiProviderLabel} {aiConfig.model ? `/ ${aiConfig.model}` : ""}
        </Badge>
        <select
          value={aiCoin}
          onChange={(e) => onCoinChange(e.target.value)}
          className="bg-inset border border-border-default rounded-lg px-3 py-1.5 text-xs text-txt-primary focus:border-accent outline-none"
        >
          {["BTC", "ETH", "SOL"].map((c) => (
            <option key={c} value={c}>{c}/USDC</option>
          ))}
        </select>
        <Button
          variant="primary"
          size="sm"
          loading={analyzing}
          onClick={onGenerate}
        >
          Generate Signal
        </Button>
        {aiSignal && (
          <>
            <Button
              variant="success"
              size="sm"
              onClick={onPinSignal}
            >
              Pin to Compare
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onExecuteSignal}
            >
              Execute Trade
            </Button>
          </>
        )}
      </div>

      {aiSignal && (
        <div className="mt-3 flex items-center gap-3">
          <ConfidenceGauge value={aiSignal.confidence} size="sm" />
          <Badge variant={aiSignal.action.toLowerCase()}>{aiSignal.action}</Badge>
          <span className="text-xs text-buy">
            AI signal ready: {aiSignal.action} {aiSignal.pair} @ {aiSignal.confidence}% confidence
          </span>
        </div>
      )}

      {aiError && (
        <Card variant="inset" padding="sm" className="mt-2">
          <p className="text-error text-xs">{aiError}</p>
        </Card>
      )}
    </Card>
  );
}

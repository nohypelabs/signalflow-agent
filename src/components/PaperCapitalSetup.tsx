"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { PAPER_CAPITAL_MAX, PAPER_CAPITAL_MIN } from "@/lib/hooks/usePaperTrading";

interface Props {
  onConfirm: (amount: number) => void;
  compact?: boolean;
}

const PRESETS = [100, 500, 1000, 5000, 10000];

function clampCapital(value: number): number {
  if (!Number.isFinite(value)) return PAPER_CAPITAL_MIN;
  return Math.min(PAPER_CAPITAL_MAX, Math.max(PAPER_CAPITAL_MIN, Math.round(value)));
}

export default function PaperCapitalSetup({ onConfirm, compact = false }: Props) {
  const [amount, setAmount] = useState(1000);
  const isValid = amount >= PAPER_CAPITAL_MIN && amount <= PAPER_CAPITAL_MAX;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(clampCapital(amount));
  };

  return (
    <section className={`rounded-xl border border-border-default bg-inset/70 ${compact ? "p-3" : "p-5"}`}>
      <div className={`flex flex-col gap-4 ${compact ? "" : "lg:flex-row lg:items-center lg:justify-between"}`}>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-secondary">Paper Capital</p>
            <Badge variant="warning" size="sm">SETUP</Badge>
          </div>
          <h2 className={`${compact ? "mt-2 text-base" : "mt-3 text-2xl"} font-bold leading-tight text-txt-primary`}>
            Choose paper trading capital
          </h2>
          <p className={`${compact ? "mt-1 text-xs" : "mt-2 max-w-2xl text-sm leading-6"} text-txt-secondary`}>
            Set the simulated USDC capital for paper trades. Range: $100 to $10,000.
          </p>
        </div>

        <div className={`${compact ? "" : "min-w-[340px]"} rounded-lg border border-border-default bg-panel/60 p-3`}>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="paper-capital" className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">
              Capital
            </label>
            <div className="font-mono text-xl font-bold text-txt-primary">
              ${amount.toLocaleString("en-US")}
            </div>
          </div>
          <input
            id="paper-capital"
            type="range"
            min={PAPER_CAPITAL_MIN}
            max={PAPER_CAPITAL_MAX}
            step={100}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="mt-3 w-full accent-warning"
          />
          <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-txt-faint">
            <span>$100</span>
            <span>$10,000</span>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`rounded-md border px-1.5 py-1 text-[9px] font-semibold transition-colors ${
                  amount === preset
                    ? "border-warning/50 bg-hold-muted text-warning"
                    : "border-border-default bg-inset text-txt-dim hover:text-txt-secondary"
                }`}
              >
                {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={PAPER_CAPITAL_MIN}
              max={PAPER_CAPITAL_MAX}
              step={100}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              onBlur={() => setAmount((value) => clampCapital(value))}
              className="min-w-0 flex-1 rounded-md border border-border-default bg-inset px-2 py-1.5 text-xs font-mono text-txt-primary outline-none focus:border-warning/40"
            />
            <button
              type="button"
              disabled={!isValid}
              onClick={handleConfirm}
              className="rounded-md bg-warning px-3 py-1.5 text-[10px] font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              Activate
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

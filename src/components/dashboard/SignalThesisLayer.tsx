"use client";

import type { ComponentProps } from "react";
import AISignalGenerator from "@/components/AISignalGenerator";
import AIReasoning from "@/components/AIReasoning";

type GeneratorProps = ComponentProps<typeof AISignalGenerator>;
type ReasoningProps = ComponentProps<typeof AIReasoning>;

interface Props {
  generator: GeneratorProps;
  reasoning: ReasoningProps;
}

export default function SignalThesisLayer({ generator, reasoning }: Props) {
  const signal = reasoning.signal ?? generator.baseSignal;
  const action = signal?.action ?? "";
  const accent = action === "LONG"
    ? "var(--color-buy)"
    : action === "SHORT"
      ? "var(--color-sell)"
      : "var(--color-hold)";
  const status = generator.analyzing
    ? "BUILDING THESIS"
    : signal
      ? "THESIS READY"
      : "WAITING SIGNAL";
  const statusTone = generator.analyzing ? "text-accent" : signal ? "text-buy" : "text-txt-secondary";

  const steps = [
    {
      label: "Technical Signal",
      meta: generator.baseSignal ? `${generator.baseSignal.confidence}% confidence` : "Waiting computation",
      active: Boolean(generator.baseSignal) || generator.analyzing,
    },
    {
      label: "AI Thesis",
      meta: generator.includeAI ? generator.aiProviderLabel : "Technical only",
      active: generator.includeAI && (Boolean(generator.aiThesis) || generator.analyzing),
    },
    {
      label: "Explain + Execute",
      meta: reasoning.signal ? `${reasoning.signal.pair} routed` : "Select or generate",
      active: Boolean(reasoning.signal),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-txt-secondary">
            Explain Layer
          </p>
          <h2 className="mt-1 text-base font-semibold text-txt-primary">
            AI thesis connected to the current SignalFlow decision
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider">
          <span className={statusTone}>{status}</span>
          {signal && (
            <span
              className="rounded px-2 py-1 text-txt-primary"
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)` }}
            >
              {signal.pair} / {signal.action}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={`rounded-lg border px-3 py-2 ${
              step.active
                ? "border-border-muted bg-elevated/55"
                : "border-border-default bg-card/70"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-primary">
                {String(index + 1).padStart(2, "0")} / {step.label}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${step.active ? "bg-buy" : "bg-border-muted"}`} />
            </div>
            <p className="mt-1 text-[11px] font-medium text-txt-secondary">{step.meta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="transition-all duration-300 xl:col-span-5">
          <AISignalGenerator {...generator} />
        </div>
        <div className="transition-all duration-300 xl:col-span-7">
          <AIReasoning {...reasoning} />
        </div>
      </div>
    </section>
  );
}

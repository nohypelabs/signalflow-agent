import type { Signal, LiveSignalDimensions } from "@/lib/types/signal";

// ---------------------------------------------------------------------------
// System prompt — scope-locked to signal/trading analysis
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are SignalFlow AI, a trading signal consultant embedded in a crypto dashboard.

## SCOPE (strict)
ONLY answer questions about:
- Crypto markets, trading signals, technical analysis
- The current signal data provided in CONTEXT
- Trading strategy interpretation and timing
- Explaining why the engine scored a signal a certain way

If the user asks about anything else (programming, general knowledge, personal advice,
unrelated topics), reply exactly: "Saya hanya bisa bantu seputar signal dan trading.
Ada pertanyaan tentang signal yang aktif?"

## BEHAVIOR
- NEVER generate buy/sell/hold recommendations independently.
  Instead interpret the engine's output: "Engine menunjukkan X karena..."
- Explain dimension scores in plain language
- Point out contradictions between data sources when relevant
- Suggest timing considerations based on regime and trading type
- Keep responses under 120 words. Shorter is better.
- Reply in the user's language (mirror their language).

## CONTEXT
{{CONTEXT}}`;

// ---------------------------------------------------------------------------
// Context builder — injects live signal data into the system prompt
// ---------------------------------------------------------------------------

interface SignalChatContext {
  signal: Signal | null;
  liveDims: LiveSignalDimensions | null;
  sourceFlags?: Record<string, boolean | number>;
  tradingType?: string;
  livePrice?: number | null;
}

export function buildSystemPrompt(ctx: SignalChatContext): string {
  if (!ctx.signal) {
    return SYSTEM_PROMPT.replace(
      "{{CONTEXT}}",
      "No active signal selected. Ask the user to select a signal first."
    );
  }

  const s = ctx.signal;
  const dims = Object.entries(s.dimensions)
    .map(([k, v]) => {
      const tone = v >= 65 ? "bullish" : v <= 40 ? "bearish" : "neutral";
      return `  - ${k}: ${v}/100 (${tone})`;
    })
    .join("\n");

  const details = s.dimensionDetails
    ? Object.entries(s.dimensionDetails)
        .map(([k, d]) => `  - ${k}: ${d.detail ?? "no detail"}`)
        .join("\n")
    : "  (none)";

  const context = `ACTIVE SIGNAL:
- Pair: ${s.pair}
- Direction: ${s.action}${s.actionV2 ? ` (${s.actionV2})` : ""}
- Confidence: ${s.confidence}%
- Regime: ${s.regime ?? "unknown"}
- Trading type: ${ctx.tradingType ?? s.tradingType ?? "not set"}
- Live price: ${ctx.livePrice ?? s.price}

DIMENSION SCORES:
${dims}

DIMENSION DETAILS:
${details}

SOURCE AVAILABILITY: ${JSON.stringify(ctx.sourceFlags ?? {})}

ENGINE REASONING: ${s.reasoning}`;

  return SYSTEM_PROMPT.replace("{{CONTEXT}}", context);
}

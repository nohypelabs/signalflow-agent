"use client";

import { useDashboard } from "@/lib/dashboard-context";
import SignalsPage from "@/components/SignalsPage";

export default function SignalsRoute() {
  const d = useDashboard();
  return (
    <div className="mx-auto max-w-6xl">
      <SignalsPage
        tickers={d.tickers}
        liveSignals={d.liveSignals}
        liveDims={d.signalsData?.dimensions}
        overallScores={d.signalsData?.overall}
        weights={d.signalsData?.weights}
        cappedDims={d.signalsData?.capped}
        activeStrategy={d.signalsData?.strategy}
      />
    </div>
  );
}

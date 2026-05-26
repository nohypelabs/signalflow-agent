"use client";

import { useDashboard } from "@/lib/dashboard-context";
import SignalsPage from "@/components/SignalsPage";

export default function SignalsRoute() {
  const d = useDashboard();
  return (
    <SignalsPage
      tickers={d.tickers}
      liveSignals={d.liveSignals}
      liveDims={d.signalsData?.dimensions}
      overallScores={d.signalsData?.overall}
      weights={d.signalsData?.weights}
      cappedDims={d.signalsData?.capped}
    />
  );
}

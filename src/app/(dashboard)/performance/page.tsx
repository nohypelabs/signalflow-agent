"use client";

import { useDashboard } from "@/lib/dashboard-context";
import PerformancePage from "@/components/PerformancePage";

export default function PerformanceRoute() {
  const d = useDashboard();
  return (
    <div className="mx-auto max-w-6xl">
      <PerformancePage
        signalHistory={d.history}
        signalStats={d.signalStats}
        historyHydrated={d.historyHydrated}
        calibration={d.calibration}
        equityCurve={d.equityCurve}
        drawdown={d.drawdown}
        streaks={d.streaks}
        perCoin={d.perCoin}
        frequency={d.frequency}
        resolutionWindow={d.resolutionWindow}
        setResolutionWindow={d.setResolutionWindow}
        exportCSV={d.exportCSV}
      />
    </div>
  );
}

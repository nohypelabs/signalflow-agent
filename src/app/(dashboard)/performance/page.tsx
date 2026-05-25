"use client";

import { useDashboard } from "@/lib/dashboard-context";
import PerformancePage from "@/components/PerformancePage";

export default function PerformanceRoute() {
  const d = useDashboard();
  return (
    <PerformancePage
      signalHistory={d.history}
      signalStats={d.signalStats}
      historyHydrated={d.historyHydrated}
    />
  );
}

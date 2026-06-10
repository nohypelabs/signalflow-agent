"use client";

import SignalIntelligenceDashboard from "@/components/dashboard/SignalIntelligenceDashboard";
import { useDashboard } from "@/lib/dashboard-context";

export default function DashboardPage() {
  const d = useDashboard();
  const pair = d.selectedPair ?? "BTC/USDC";
  
  return <SignalIntelligenceDashboard pair={pair} />;
}

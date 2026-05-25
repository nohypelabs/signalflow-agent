"use client";

import { useDashboard } from "@/lib/dashboard-context";
import SettingsPage from "@/components/SettingsPage";

export default function SettingsRoute() {
  const d = useDashboard();
  return (
    <SettingsPage
      walletConnected={d.isConnected}
      aiConfig={d.aiConfig}
      onAIConfigChange={d.updateAIConfig}
    />
  );
}

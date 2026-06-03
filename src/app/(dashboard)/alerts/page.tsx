"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { useAlerts } from "@/lib/hooks/useAlerts";
import AlertPanel from "@/components/AlertPanel";

export default function AlertsPage() {
  const d = useDashboard();
  const alerts = useAlerts(d.tickers);

  return (
    <div className="mx-auto max-w-6xl">
      <AlertPanel
        alerts={alerts.alerts}
        activeAlerts={alerts.activeAlerts}
        triggeredAlerts={alerts.triggeredAlerts}
        permission={alerts.permission}
        onRequestPermission={alerts.requestPermission}
        onAddPriceAlert={alerts.addPriceAlert}
        onAddSignalAlert={alerts.addSignalAlert}
        onRemove={alerts.removeAlert}
        onClearTriggered={alerts.clearTriggered}
        onClearAll={alerts.clearAll}
      />
    </div>
  );
}

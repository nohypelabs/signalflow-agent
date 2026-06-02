"use client";

import PageHeader from "@/components/ui/PageHeader";
import ScreenerTable from "@/components/ScreenerTable";
import CorrelationMatrix from "@/components/CorrelationMatrix";

export default function ScreenerPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Market Screener"
        badge={{ variant: "accent", label: "LIVE" }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        <CorrelationMatrix />
        <ScreenerTable />
      </div>
    </div>
  );
}

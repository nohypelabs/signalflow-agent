"use client";

import PageHeader from "@/components/ui/PageHeader";
import ScreenerTable from "@/components/ScreenerTable";
import PriceHeatmap from "@/components/PriceHeatmap";

export default function ScreenerPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Market Screener"
        badge={{ variant: "accent", label: "LIVE" }}
      />
      <PriceHeatmap />
      <ScreenerTable />
    </div>
  );
}

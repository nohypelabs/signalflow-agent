"use client";

import ScreenerTable from "@/components/ScreenerTable";
import CorrelationMatrix from "@/components/CorrelationMatrix";

export default function ScreenerPage() {
  return (
    <div className="space-y-4">
      <ScreenerTable />
      <CorrelationMatrix />
    </div>
  );
}

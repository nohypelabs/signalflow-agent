"use client";

import { Suspense } from "react";
import TradingPageContent from "@/components/TradingPageContent";

export default function TradingPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-txt-muted">Loading trading page...</div>}>
      <TradingPageContent />
    </Suspense>
  );
}

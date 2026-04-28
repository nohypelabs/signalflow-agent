"use client";

import { apiModules } from "@/lib/mock-data";

export default function DataSources() {
  const total = apiModules.reduce((sum, m) => sum + m.calls, 0);

  return (
    <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">SoSoValue API Modules</h3>
        <span className="text-xs text-[#666677]">{total.toLocaleString()} total calls</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {apiModules.map((m) => (
          <div
            key={m.name}
            className="flex items-center gap-3 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3"
          >
            <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ backgroundColor: m.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{m.name}</p>
              <p className="text-[10px] text-[#666677]">{m.calls} calls</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830]">
              active
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-[#0a0a14] border border-[#333355] rounded-lg px-3 py-2">
        <p className="text-[10px] text-[#666677] font-mono">
          Base URL: https://openapi.sosovalue.com/openapi/v1 | Auth: x-soso-api-key | 9/9 modules active
        </p>
      </div>
    </div>
  );
}

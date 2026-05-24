"use client";

import { useSources } from "@/lib/use-sources";

export default function DataSources() {
  const { modules, loading, error } = useSources();
  const activeCount = modules.filter((m) => m.status === "active").length;
  const totalCount = modules.length;

  if (loading) {
    return (
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
        <p className="text-xs text-[#666677]">Checking API module status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
        <p className="text-xs text-[#ff4444]">Failed to check modules: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">API Modules</h3>
        <span className="text-xs text-[#666677]">
          {activeCount}/{totalCount} active
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {modules.map((m) => (
          <div
            key={m.name}
            className="flex items-center gap-3 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3"
          >
            <div
              className={`w-2 h-2 rounded-full ${m.status === "active" ? "animate-pulse-glow" : ""}`}
              style={{ backgroundColor: m.status === "active" ? m.color : "#333355" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{m.name}</p>
              <p className="text-[10px] text-[#666677]">{m.detail}</p>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                m.status === "active"
                  ? "bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830]"
                  : "bg-[#ff444415] text-[#ff4444] border border-[#ff444430]"
              }`}
            >
              {m.status}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-[#0a0a14] border border-[#333355] rounded-lg px-3 py-2">
        <p className="text-[10px] text-[#666677] font-mono">
          SoSoValue: openapi.sosovalue.com | SoDEX: {process.env.NODE_ENV === "development" ? "sodex.dev" : "sodex.dev"} | Deepseek: api.deepseek.com | {activeCount}/{totalCount} modules healthy
        </p>
      </div>
    </div>
  );
}

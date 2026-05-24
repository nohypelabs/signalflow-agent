"use client";

import { useStatus } from "@/lib/use-status";

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  connected: { bg: "bg-[#00ff8815]", text: "text-[#00ff88]", border: "border-[#00ff8830]" },
  error: { bg: "bg-[#ff444415]", text: "text-[#ff4444]", border: "border-[#ff444430]" },
  no_key: { bg: "bg-[#ff880015]", text: "text-[#ff8800]", border: "border-[#ff880030]" },
};

export default function SettingsPage() {
  const { services, loading, error } = useStatus();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Settings</h2>

      {/* API Connections */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">API Connections</h3>
        {loading ? (
          <p className="text-xs text-[#666677]">Checking connections...</p>
        ) : error ? (
          <p className="text-xs text-[#ff4444]">Status check failed: {error}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((s) => {
              const style = statusStyles[s.status];
              return (
                <div key={s.name} className="flex justify-between items-center bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
                  <span className="text-xs text-[#888888]">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#aaaaaa]">{s.detail}</span>
                    {s.latencyMs > 0 && (
                      <span className="text-[10px] text-[#666677]">{s.latencyMs}ms</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
                      {s.status === "connected" ? "Connected" : s.status === "no_key" ? "No Key" : "Error"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">General</h3>
        {[
          { label: "AI Model", value: "Deepseek Chat", status: "Active" },
          { label: "Refresh Interval", value: "60 seconds", status: "" },
          { label: "Notifications", value: "Coming soon", status: "" },
          { label: "SoDEX Network", value: process.env.NEXT_PUBLIC_SODEX_NETWORK || "Mainnet", status: "" },
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3">
            <span className="text-xs text-[#888888]">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white font-mono">{item.value}</span>
              {item.status && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830]">
                  {item.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

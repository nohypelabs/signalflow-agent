"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import KPICards from "@/components/KPICards";
import PortfolioChart from "@/components/PortfolioChart";
import SignalList from "@/components/SignalList";
import AIReasoning from "@/components/AIReasoning";
import DataSources from "@/components/DataSources";
import SignalsPage from "@/components/SignalsPage";
import TradeHistory from "@/components/TradeHistory";
import StrategyConfig from "@/components/StrategyConfig";
import PerformancePage from "@/components/PerformancePage";
import { Signal, signals } from "@/lib/mock-data";

export default function Home() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(signals[0]);

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={activeMenu} onSelect={setActiveMenu} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {activeMenu === "Dashboard" && (
            <>
              <KPICards />
              <div className="flex flex-col lg:flex-row gap-4">
                <PortfolioChart />
                <SignalList
                  onSelect={setSelectedSignal}
                  selected={selectedSignal?.id ?? null}
                />
              </div>
              <AIReasoning signal={selectedSignal} />
              <DataSources />
            </>
          )}

          {activeMenu === "Signals" && <SignalsPage />}

          {activeMenu === "Trade History" && <TradeHistory />}

          {activeMenu === "Strategy Config" && <StrategyConfig />}

          {activeMenu === "Data Sources" && <DataSources />}

          {activeMenu === "Performance" && <PerformancePage />}

          {activeMenu === "Settings" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Settings</h2>
              <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
                {[
                  { label: "API Key", value: "soso_••••••••••••k7x9", status: "Connected" },
                  { label: "SoDEX Wallet", value: "0x7a3f...8b2c", status: "Linked" },
                  { label: "AI Model", value: "Claude Opus 4.6", status: "Active" },
                  { label: "Refresh Interval", value: "30 seconds", status: "" },
                  { label: "Notifications", value: "Telegram + Email", status: "Enabled" },
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
          )}

          <footer className="text-center text-[11px] text-[#333344] py-4">
            NoHype Labs — SignalFlow Agent — SoSoValue Buildathon 2026
          </footer>
        </main>
      </div>
    </div>
  );
}

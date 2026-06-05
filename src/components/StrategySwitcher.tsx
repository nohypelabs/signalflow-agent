"use client";

import { useState, useEffect } from "react";
import {
  loadStrategyConfig,
  saveStrategyConfig,
  PRESETS,
  PRESET_META,
  PRESET_ORDER,
  LIQUIDITY_FLOW_STRATEGY_CONFIG,
  DEFAULT_STRATEGY_CONFIG,
  getPresetName,
  type StrategyConfig,
  type StrategyPresetName,
} from "@/lib/strategy/config";
import { useDashboard } from "@/lib/dashboard-context";
import type { MarketRegime } from "@/lib/strategy/signal-engine-v2/types";
import { applyThinkingFramework } from "@/lib/strategy/config";

export default function StrategySwitcher({ compact = false }: { compact?: boolean }) {
  const d = useDashboard();
  const [current, setCurrent] = useState<StrategyConfig>(DEFAULT_STRATEGY_CONFIG);
  const [isCustom, setIsCustom] = useState(false);

  // Sync with global strategy (from localStorage + signalsData)
  useEffect(() => {
    const loaded = loadStrategyConfig();
    setCurrent(loaded);
    const preset = getPresetName(loaded);
    setIsCustom(!preset && loaded.engine === "confluence");
  }, [d.signalsData?.strategy]); // re-sync when signals update strategy

  const activePreset = getPresetName(current);

  const selectPreset = (name: StrategyPresetName) => {
    const preset = PRESETS[name];
    saveStrategyConfig(preset);
    setCurrent(preset);
    setIsCustom(false);
  };

  const selectLiquidity = () => {
    saveStrategyConfig(LIQUIDITY_FLOW_STRATEGY_CONFIG);
    setCurrent(LIQUIDITY_FLOW_STRATEGY_CONFIG);
    setIsCustom(false);
  };

  const selectCustom = () => {
    // Load whatever is saved in full Strategy Config (may include framework typeProfiles)
    const saved = loadStrategyConfig();
    saveStrategyConfig(saved); // ensure broadcast
    setCurrent(saved);
    setIsCustom(true);
  };

  const applyFrameworkHere = () => {
    // Use live regime if available from dashboard signals
    const btcSignal = d.liveSignals?.find((s) => s.pair.startsWith("BTC"));
    const regime = btcSignal?.regime as MarketRegime | undefined;

    const currentProfiles = current.typeProfiles || {};
    const application = applyThinkingFramework(currentProfiles, regime ? { regime } : undefined);

    const next: StrategyConfig = {
      ...current,
      typeProfiles: application.profiles,
    };

    saveStrategyConfig(next);
    setCurrent(next);
    setIsCustom(true);

    // Optional: toast or note
    console.log("[StrategySwitcher] Applied Thinking Framework live:", application.note);
  };

  const displayLabel = isCustom
    ? "Custom (Framework)"
    : activePreset
    ? PRESET_META[activePreset].label
    : current.engine === "liquidityFlow"
    ? "Liquidity Flow"
    : "Custom";

  return (
    <div className={`flex items-center gap-2 text-[10px] ${compact ? 'text-xs' : ''}`}>
      {!compact && <span className="text-txt-muted uppercase tracking-wider">Strategy</span>}

      <div className="relative">
        <select
          value={isCustom ? "custom" : activePreset || (current.engine === "liquidityFlow" ? "liquidity" : "balanced")}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "conservative" || val === "balanced" || val === "aggressive") {
              selectPreset(val as StrategyPresetName);
            } else if (val === "liquidity") {
              selectLiquidity();
            } else if (val === "custom") {
              selectCustom();
            }
          }}
          className="bg-inset border border-border-default rounded px-2 py-1 text-xs font-semibold text-txt-primary cursor-pointer hover:border-accent/60 focus:outline-none focus:border-accent"
          title="Quick switch strategy preset. Changes apply live to all signals & dashboard. Full editor in /strategy-config"
        >
          {PRESET_ORDER.map((name) => (
            <option key={name} value={name}>
              {PRESET_META[name].label}
            </option>
          ))}
          <option value="liquidity">Liquidity Flow</option>
          <option value="custom">Custom (from Strategy Config)</option>
        </select>
      </div>

      <button
        onClick={applyFrameworkHere}
        className="text-[9px] px-2 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        title="Apply the Thinking Framework (with live regime if detected) to current profiles. Immediate effect on signals."
      >
        {compact ? "FW" : "Apply Framework"}
      </button>

      {!compact && (
        <span className="text-[9px] text-txt-dim hidden md:inline">
          {displayLabel}
        </span>
      )}
    </div>
  );
}

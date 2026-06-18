"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import Card from "@/components/ui/Card";
import { Download } from "lucide-react";
import type { RecordedSignal } from "@/lib/types/signal";

export default function SignalHistoryPage() {
  const { history, exportCSV } = useDashboard();
  const [filter, setFilter] = useState<"all" | "LONG" | "SHORT">("all");

  const manualSignals = useMemo(
    () => (history || []).filter((s: RecordedSignal) => s.timestamp && (s.action === "LONG" || s.action === "SHORT")),
    [history],
  );

  const filtered = useMemo(
    () => (filter === "all" ? manualSignals : manualSignals.filter((s) => s.action === filter)),
    [filter, manualSignals],
  );

  const avgConfidence = useMemo(
    () => manualSignals.length
      ? Math.round(manualSignals.reduce((a, b) => a + (b.confidence || 0), 0) / manualSignals.length)
      : 0,
    [manualSignals],
  );

  const handleExport = () => {
    if (exportCSV) exportCSV();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Signal History</h1>
          <p className="text-sm text-txt-muted">Manually generated signals from &quot;Generate Signal&quot; button &bull; for evaluation &amp; audit</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!manualSignals.length}
          className="flex items-center gap-2 rounded-lg border border-border-default bg-elevated px-4 py-2 text-sm font-medium hover:bg-accent/10 disabled:opacity-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="flex gap-2">
        {(["all", "LONG", "SHORT"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded px-3 py-1 text-xs font-medium ${filter === f ? "bg-accent text-black" : "border border-border-default hover:bg-elevated"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wider text-txt-muted">
                <th className="p-3">Time</th>
                <th className="p-3">Pair</th>
                <th className="p-3">Action</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Price</th>
                <th className="p-3">Strategy</th>
                <th className="p-3">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-txt-muted">No manual signals yet. Use the Generate Signal button in the command center.</td>
                </tr>
              )}
              {filtered.slice(0, 100).map((s) => (
                <tr key={s.id ?? s.timestamp} className="border-b border-border-default/50 hover:bg-elevated/30">
                  <td className="p-3 font-mono text-xs text-txt-muted">{new Date(s.timestamp).toLocaleString()}</td>
                  <td className="p-3 font-semibold">{s.pair}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${s.action === "LONG" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {s.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{s.confidence}%</td>
                  <td className="p-3 font-mono">{s.price != null ? `$${s.price.toFixed(2)}` : "\u2014"}</td>
                  <td className="p-3 text-xs text-txt-muted">{s.strategy || "\u2014"}</td>
                  <td className="p-3 text-xs text-txt-secondary max-w-[300px] truncate" title={s.reasoning || s.setup?.thesis || ""}>{s.reasoning || s.setup?.thesis || "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-[10px] text-txt-muted border-t border-border-default">
          Showing manual generations only. Use Export CSV for full evaluation dataset. Total manual: {manualSignals.length}
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-xs text-txt-muted">Total Manual Signals</div>
          <div className="text-3xl font-semibold mt-1">{manualSignals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-txt-muted">Avg Confidence</div>
          <div className="text-3xl font-semibold mt-1">{avgConfidence}%</div>
        </Card>
      </div>
    </div>
  );
}


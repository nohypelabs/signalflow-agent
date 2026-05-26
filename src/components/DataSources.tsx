"use client";

import { useDataSources as useSources } from "@/lib/hooks/useDataSources";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import Skeleton from "@/components/ui/Skeleton";

export default function DataSources() {
  const { modules, loading, error } = useSources();
  const activeCount = modules.filter((m) => m.status === "active").length;
  const totalCount = modules.length;
  const totalCalls = modules.reduce((sum, m) => sum + m.count, 0);

  if (loading) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border-default">
          <Skeleton variant="text" className="w-32" />
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card-sm" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md" className="border-l-2 border-l-sell">
        <div className="flex items-center gap-2 mb-2">
          <StatusDot status="error" size="md" />
          <span className="text-sm font-semibold text-error">Connection Error</span>
        </div>
        <p className="text-xs text-txt-muted">{error}</p>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wider">API Modules</h3>
          <Badge variant={activeCount === totalCount ? "live" : "warning"} size="sm">
            {activeCount}/{totalCount}
          </Badge>
        </div>
        <span className="text-[10px] text-txt-dim font-mono">{totalCalls.toLocaleString()} total calls</span>
      </div>

      {/* Module grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {modules.map((m) => {
          const isActive = m.status === "active";
          return (
            <div
              key={m.name}
              className={`
                rounded-xl p-3 border transition-all
                ${isActive
                  ? "bg-card border-border-default hover:border-border-muted"
                  : "bg-card/50 border-border-default opacity-50"
                }
              `}
            >
              <div className="flex items-start gap-2.5">
                {/* Color indicator */}
                <div
                  className="w-1 h-8 rounded-full shrink-0 mt-0.5"
                  style={{ backgroundColor: isActive ? m.color : "#333" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-txt-primary truncate">{m.name}</p>
                    <StatusDot status={isActive ? "live" : "offline"} size="sm" pulse={isActive} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-txt-dim truncate">{m.detail}</p>
                    {isActive && (
                      <span className="text-[10px] text-txt-muted font-mono shrink-0 ml-2">
                        {m.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-border-default bg-inset/30">
        <p className="text-[10px] text-txt-dim font-mono">
          SoSoValue: openapi.sosovalue.com · SoDEX: sodex.dev · {activeCount}/{totalCount} modules healthy
        </p>
      </div>
    </Card>
  );
}

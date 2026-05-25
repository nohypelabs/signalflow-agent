"use client";

import { useSources } from "@/lib/use-sources";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import Skeleton from "@/components/ui/Skeleton";

export default function DataSources() {
  const { modules, loading, error } = useSources();
  const activeCount = modules.filter((m) => m.status === "active").length;
  const totalCount = modules.length;

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex flex-col gap-2">
          <Skeleton variant="card-sm" />
          <Skeleton variant="card-sm" />
          <Skeleton variant="card-sm" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md">
        <Card variant="inset" padding="md">
          <p className="text-error text-xs">Failed to check modules: {error}</p>
        </Card>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">API Modules</h3>
        <span className="text-xs text-txt-muted">
          {activeCount}/{totalCount} active
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {modules.map((m) => (
          <Card
            key={m.name}
            variant="inset"
            padding="sm"
            className={`flex items-center gap-3 ${m.status !== "active" ? "opacity-60" : ""}`}
          >
            {m.status === "active" ? (
              <div className="flex items-center gap-2" style={{ borderLeftColor: m.color, borderLeftWidth: "2px", paddingLeft: "8px" }}>
                <StatusDot status="live" size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-txt-primary truncate">{m.name}</p>
                  <p className="text-[10px] text-txt-muted">{m.detail}</p>
                </div>
                <Badge variant="live" size="sm">{m.status}</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-[10px]">
                <StatusDot status="offline" size="sm" pulse={false} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-txt-primary truncate">{m.name}</p>
                  <p className="text-[10px] text-txt-muted">{m.detail}</p>
                </div>
                <Badge variant="error" size="sm">{m.status}</Badge>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Card variant="ghost" padding="sm" className="mt-3 bg-background border border-border-strong">
        <p className="text-[10px] text-txt-muted font-mono">
          SoSoValue: openapi.sosovalue.com | SoDEX: {process.env.NODE_ENV === "development" ? "sodex.dev" : "sodex.dev"} | Deepseek: api.deepseek.com | {activeCount}/{totalCount} modules healthy
        </p>
      </Card>
    </Card>
  );
}

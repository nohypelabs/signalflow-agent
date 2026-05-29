"use client";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-elevated/60 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border-default rounded-lg p-4 bg-card">
            <Pulse className="h-3 w-20 mb-3" />
            <Pulse className="h-7 w-28 mb-2" />
            <Pulse className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 border border-border-default rounded-lg bg-card p-3">
          <Pulse className="h-[420px] w-full" />
        </div>
        <div className="xl:col-span-4 border border-border-default rounded-lg bg-card p-3">
          <Pulse className="h-[420px] w-full" />
        </div>
      </div>
    </div>
  );
}

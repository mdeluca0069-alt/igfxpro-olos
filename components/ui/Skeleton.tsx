import clsx from "clsx";

interface SkeletonProps {
  className?: string;
  rounded?:   "sm" | "md" | "lg" | "full";
}

export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "animate-pulse bg-slate-800",
        rounded === "sm"   && "rounded",
        rounded === "md"   && "rounded-md",
        rounded === "lg"   && "rounded-lg",
        rounded === "full" && "rounded-full",
        className
      )}
    />
  );
}

export function MetricSkeleton() {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#08111f] p-4" aria-label="Loading metric">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4" rounded="sm" />
      </div>
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/78 p-4" aria-label="Loading panel">
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-t border-slate-800" aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 pr-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 420 }: { height?: number }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-slate-800 bg-[#05070d]"
      style={{ height }}
      aria-label="Loading chart"
    >
      {[25, 50, 75].map((pct) => (
        <div key={pct} className="absolute left-0 right-0 border-t border-slate-800/50" style={{ top: `${pct}%` }} />
      ))}
      <div className="absolute bottom-0 left-8 right-4 flex items-end gap-1">
        {Array.from({ length: 40 }).map((_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 0.8)) * 60;
          return (
            <div key={i} className="animate-pulse flex-1 rounded-t bg-slate-800" style={{ height: `${h}%` }} />
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/50 border-t-cyan-400" />
          Loading chart…
        </div>
      </div>
    </div>
  );
}

export function SignalCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/78 p-4" aria-label="Loading signal">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-7 w-16" rounded="full" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5 p-5" role="status" aria-label="Loading page">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)}
      </div>
      <PanelSkeleton rows={3} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSkeleton rows={5} />
        <PanelSkeleton rows={5} />
      </div>
    </div>
  );
}

export default Skeleton;

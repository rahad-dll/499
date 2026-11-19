import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Stat-card row placeholder, matching the portals' metric cards. */
export function StatCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 xl:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-2 h-3.5 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Card-grid placeholder for lists of lots, cameras or incidents. */
export function CardGridSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2.5 h-3 w-48 max-w-full" />
          <Skeleton className="mt-5 h-16 w-full rounded-xl" />
          <Skeleton className="mt-4 h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Table-row placeholder. */
export function RowsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="hidden h-3.5 w-20 sm:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Whole-page placeholder shown inside a portal shell while the account loads. */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label="Loading your workspace…" className={cn("px-0", className)}>
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="mt-2.5 h-4 w-80 max-w-full" />
      <StatCardsSkeleton className="mt-6" />
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-3.5 w-64 max-w-full" />
        <CardGridSkeleton className="mt-5" />
      </div>
    </LoadingRegion>
  );
}

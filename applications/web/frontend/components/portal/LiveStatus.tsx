"use client";

import { RefreshCcw } from "lucide-react";
import { formatSeconds, formatTime } from "@/lib/format/datetime";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/**
 * How fresh live data is: "Updated 12 s ago · next in 18 s", ticking every
 * second, with a refresh button. Polling pauses in hidden tabs and backs off
 * after failures; `nextRefreshAt` (from the query store) already accounts
 * for both.
 */
export function LiveStatus({
  updatedAt,
  nextRefreshAt,
  loading,
  error,
  onRefresh,
  className,
}: {
  updatedAt: number | null;
  nextRefreshAt: number | null;
  loading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}) {
  const ticking = useNow();
  const now = ticking || updatedAt || 0;

  let text: string;
  let tone = "text-muted-foreground";
  if (!updatedAt) {
    text = loading ? "Loading live data…" : error ? "Live data unavailable" : "Waiting for live data";
    if (error) tone = "text-destructive";
  } else {
    const age = `Updated ${formatSeconds((now - updatedAt) / 1000)} ago`;
    if (error) {
      text = `${age} · last refresh failed, retrying`;
      tone = "text-amber-600 dark:text-amber-400";
    } else if (nextRefreshAt && nextRefreshAt > now) {
      text = `${age} · next in ${formatSeconds((nextRefreshAt - now) / 1000)}`;
    } else {
      text = `${age} · refreshing…`;
    }
  }

  const refreshing = loading || (!!updatedAt && !!nextRefreshAt && nextRefreshAt <= now);

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12.5px]", tone, className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          !updatedAt ? "bg-muted-foreground/50" : error ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      <span title={updatedAt ? `Last updated at ${formatTime(updatedAt)} (Dhaka time)` : undefined}>{text}</span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh live data now"
          title="Refresh now"
          className="ml-0.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCcw className={cn("size-3.5", refreshing && "animate-spin motion-reduce:animate-none")} />
        </button>
      )}
    </span>
  );
}

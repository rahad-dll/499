import * as React from "react";

import { cn } from "@/lib/utils";

/** Grey placeholder block shown where content is still loading. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-foreground/[0.08] motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

/** Announces "Loading…" once to screen readers for a group of skeletons. */
function LoadingRegion({
  label = "Loading…",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { LoadingRegion, Skeleton };

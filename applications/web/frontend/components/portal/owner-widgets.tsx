"use client";

import { Badge } from "@/components/ui/badge";
import { spaceStatus } from "@/lib/insights/metrics";
import type { CameraStatus, ParkingSpace, SlotStatusInfo } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";

const LOT_STATUS = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending approval", variant: "warning" },
  inactive: { label: "Inactive", variant: "secondary" },
} as const;

/** Lot status from the API (`status`), replacing the old always-"Active" badge. */
export function LotStatusBadge({ space }: { space: Pick<ParkingSpace, "status" | "is_active"> }) {
  const meta = LOT_STATUS[spaceStatus(space)];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const CAMERA_STATUS: Record<CameraStatus, { label: string; variant: "success" | "destructive" | "warning" }> = {
  active: { label: "Online", variant: "success" },
  offline: { label: "Offline", variant: "destructive" },
  setup: { label: "Setting up", variant: "warning" },
};

export function CameraStatusBadge({ status }: { status: CameraStatus }) {
  const meta = CAMERA_STATUS[status] ?? CAMERA_STATUS.setup;
  return (
    <Badge variant={meta.variant}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}

const SLOT_TONE = {
  available: "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  not_available: "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300",
  unknown: "border-border bg-muted text-muted-foreground",
} as const;

/** One tile per slot, colored by the AI's latest classification. */
export function SlotGrid({ slots, className }: { slots: SlotStatusInfo[]; className?: string }) {
  if (slots.length === 0) {
    return <p className={cn("text-xs text-muted-foreground", className)}>No AI-monitored slots yet.</p>;
  }
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {slots.map((slot, index) => (
        <span
          key={slot.slot_id}
          title={`Slot ${index + 1}: ${slot.label} (${Math.round(slot.confidence * 100)}% confidence)${slot.is_booked ? " · booked" : ""}`}
          className={cn(
            "relative flex size-8 items-center justify-center rounded-md border text-[11px] font-bold",
            SLOT_TONE[slot.status] ?? SLOT_TONE.unknown,
          )}
        >
          {index + 1}
          {slot.is_booked && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand ring-2 ring-card" />}
        </span>
      ))}
    </div>
  );
}

export function SlotLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" />Free</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-500" />Occupied</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-slate-400" />Unknown</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand" />Booked</span>
    </div>
  );
}

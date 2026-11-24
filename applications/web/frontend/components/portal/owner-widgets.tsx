"use client";

import { Check, CircleHelp, X, type LucideIcon } from "lucide-react";
import { InfoTip } from "@/components/InfoTip";
import { Badge } from "@/components/ui/badge";
import { spaceStatus } from "@/lib/insights/metrics";
import type { CameraStatus, ParkingSpace, SlotStatusInfo } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";

/** The lot's approval state as owners see it (`status` is set by CityPulse admins). */
export const LOT_STATUS = {
  active: {
    label: "Approved · bookable",
    variant: "success",
    detail: "Approved by CityPulse. Drivers can find it in the app and book it.",
  },
  pending: {
    label: "Pending approval",
    variant: "warning",
    detail: "Waiting for a CityPulse admin to approve it. Drivers can't book it until then.",
  },
  inactive: {
    label: "Suspended",
    variant: "secondary",
    detail: "Suspended by a CityPulse admin. Drivers can't open or book it.",
  },
} as const;

/** Lot status from the API (`status`), replacing the old always-"Active" badge. */
export function LotStatusBadge({ space }: { space: Pick<ParkingSpace, "status" | "is_active"> }) {
  const meta = LOT_STATUS[spaceStatus(space)];
  return (
    <Badge variant={meta.variant}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
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

/* Each status has its own icon and label as well as a color, so slots can be
   told apart without relying on red vs green. */
const SLOT_META: Record<"available" | "not_available" | "unknown", { tone: string; icon: LucideIcon; label: string }> = {
  available: {
    tone: "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    icon: Check,
    label: "Free",
  },
  not_available: {
    tone: "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300",
    icon: X,
    label: "Occupied",
  },
  unknown: {
    tone: "border-border bg-muted text-muted-foreground",
    icon: CircleHelp,
    label: "Unknown",
  },
};

/** One tile per slot: number, status icon and color from the AI's latest reading. */
export function SlotGrid({ slots, className }: { slots: SlotStatusInfo[]; className?: string }) {
  if (slots.length === 0) {
    return <p className={cn("text-xs text-muted-foreground", className)}>No AI-monitored slots yet.</p>;
  }
  return (
    <div role="list" aria-label="Slot status" className={cn("flex flex-wrap gap-1.5", className)}>
      {slots.map((slot, index) => {
        const meta = SLOT_META[slot.status] ?? SLOT_META.unknown;
        const description = `Slot ${index + 1}: ${meta.label.toLowerCase()}${slot.is_booked ? ", booked" : ""} (AI ${Math.round(slot.confidence * 100)}% confident)`;
        return (
          <span
            key={slot.slot_id}
            role="listitem"
            aria-label={description}
            title={description}
            className={cn(
              "relative inline-flex h-8 min-w-10 items-center justify-center gap-0.5 rounded-md border px-1.5 text-[11px] font-bold",
              meta.tone,
            )}
          >
            {index + 1}
            <meta.icon aria-hidden className="size-3" strokeWidth={3} />
            {slot.is_booked && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand ring-2 ring-card" />}
          </span>
        );
      })}
    </div>
  );
}

export function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {Object.entries(SLOT_META).map(([key, meta]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={cn("inline-flex size-4 items-center justify-center rounded-sm border", meta.tone)}>
            <meta.icon aria-hidden className="size-2.5" strokeWidth={3} />
          </span>
          {meta.label}
          {key === "unknown" && <InfoTip term="unknown" className="-ml-1 size-5" />}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand" />Booked</span>
    </div>
  );
}

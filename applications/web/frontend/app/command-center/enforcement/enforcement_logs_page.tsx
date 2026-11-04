"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  ParkingSquare,
  RotateCcw,
  ScanEye,
  Ticket,
} from "lucide-react";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deriveIncidents, timeAgo, type Incident } from "@/lib/insights/metrics";
import { useLiveSpaces } from "@/lib/spaces/use-live-spaces";
import { cn } from "@/lib/utils";

/* ---------------- incident card ---------------- */

function IncidentCard({
  inc,
  now,
  resolved,
  onToggle,
}: {
  inc: Incident;
  now: number;
  resolved: boolean;
  onToggle: () => void;
}) {
  const confidence = Math.round(inc.slot.confidence * 100);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-extrabold" title={inc.slot.slot_id}>
          {inc.space.name} · Slot {inc.slotNumber}
        </span>
        <Badge variant={resolved ? "success" : "warning"}>
          <span className="size-1.5 rounded-full bg-current" />
          {resolved ? "Resolved" : "Unbooked"}
        </Badge>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        Detected {timeAgo(inc.slot.last_updated, now)}
        {inc.slot.last_updated && <> · {new Date(inc.slot.last_updated).toLocaleString()}</>}
      </div>

      <div className="mt-3.5 border-t border-border pt-3.5">
        <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{inc.space.address ?? inc.space.name}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ScanEye className="size-4" />
            AI Confidence
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${confidence}%` }} />
          </div>
          <span className="font-extrabold text-foreground">{confidence}%</span>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <ParkingSquare className="size-4" />
          </span>
          <span>
            <div className="text-[13.5px] font-bold">Occupied with no booking</div>
            <div className="text-xs text-muted-foreground">
              AI label “{inc.slot.label}”{inc.space.is_stale && " · camera data is stale"}
            </div>
          </span>
        </div>
      </div>

      <Button variant={resolved ? "outline" : "brand"} className="mt-4 w-full" onClick={onToggle}>
        {resolved ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
        {resolved ? "Reopen" : "Mark Resolved"}
      </Button>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function EnforcementLogsPage() {
  const { spaces, loading, error, updatedAt } = useLiveSpaces();
  const incidents = useMemo(() => deriveIncidents(spaces), [spaces]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const now = updatedAt ?? 0;

  const active = incidents.filter((i) => !resolvedIds.has(i.id));
  const resolved = incidents.filter((i) => resolvedIds.has(i.id));
  const list = tab === "active" ? active : resolved;
  const lotsAffected = new Set(active.map((i) => i.space.id)).size;
  const avgConfidence = incidents.length
    ? Math.round((incidents.reduce((t, i) => t + i.slot.confidence, 0) / incidents.length) * 100)
    : 0;

  function toggle(id: string) {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AuthorityShell active="enforcement">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          Enforcement Logs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Slots the AI sees as occupied without a booking — possible unpaid parking.
        </p>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-brand" />
          Incidents are generated live from AI camera data. Tickets, evidence images, and warden
          dispatch need the enforcement API, which the backend doesn’t provide yet — resolutions are
          kept in this browser tab only.
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Ticket className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{active.length}</div>
              <div className="text-[13px] text-muted-foreground">Active Incidents</div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <MapPin className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{lotsAffected}</div>
              <div className="text-[13px] text-muted-foreground">Lots Affected</div>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:col-span-1">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ScanEye className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{avgConfidence}%</div>
              <div className="text-[13px] text-muted-foreground">Avg AI Confidence</div>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === "active" ? "bg-brand/10 text-teal-600 dark:text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Active Incidents
            <Badge variant={tab === "active" ? "info" : "secondary"} className="px-2">{active.length}</Badge>
          </button>
          <button
            type="button"
            onClick={() => setTab("resolved")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === "resolved" ? "bg-brand/10 text-teal-600 dark:text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Resolved
            <Badge variant="secondary" className="px-2">{resolved.length}</Badge>
          </button>
        </div>

        {/* incident grid */}
        {list.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {loading
              ? "Scanning live AI data…"
              : tab === "active"
                ? "No unbooked occupancy detected right now."
                : "Nothing resolved yet."}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((inc) => (
              <IncidentCard
                key={inc.id}
                inc={inc}
                now={now}
                resolved={resolvedIds.has(inc.id)}
                onToggle={() => toggle(inc.id)}
              />
            ))}
          </div>
        )}
      </main>
    </AuthorityShell>
  );
}

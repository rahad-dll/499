"use client";

import { useMemo } from "react";
import {
  Activity,
  Car,
  Gauge,
  MapPinOff,
  RadioTower,
  RefreshCcw,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { InfoTip } from "@/components/InfoTip";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { LiveStatus } from "@/components/portal/LiveStatus";
import { RowsSkeleton } from "@/components/portal/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import type { GlossaryTerm } from "@/lib/insights/glossary";
import {
  cityOccupancy,
  deriveIncidents,
  occupancyPct,
  stressOf,
  type Stress,
} from "@/lib/insights/metrics";
import { useLiveSpaces } from "@/lib/spaces/use-live-spaces";
import { cn } from "@/lib/utils";

const STRESS_BAR: Record<Stress, string> = {
  Critical: "bg-red-500",
  Moderate: "bg-amber-500",
  Optimal: "bg-emerald-500",
};

const STRESS_BADGE: Record<Stress, "destructive" | "warning" | "success"> = {
  Critical: "destructive",
  Moderate: "warning",
  Optimal: "success",
};

export default function AnalyticsPage() {
  const { spaces, loading, error, updatedAt, nextRefreshAt, refresh } = useLiveSpaces();

  const data = useMemo(() => {
    const lots = spaces
      .map((space) => ({ space, pct: occupancyPct(space) }))
      .sort((a, b) => b.pct - a.pct);
    const slots = spaces.flatMap((s) => s.slot_statuses);
    const occupied = spaces.reduce((t, s) => t + s.occupied_slots, 0);
    const available = spaces.reduce((t, s) => t + s.available_slots, 0);
    const unknown = spaces.reduce((t, s) => t + s.unknown_slots, 0);
    const fresh = spaces.filter((s) => !s.is_stale).length;
    return {
      lots,
      occupied,
      available,
      unknown,
      booked: slots.filter((s) => s.is_booked).length,
      totalSlots: occupied + available + unknown,
      cityPct: cityOccupancy(spaces),
      incidents: deriveIncidents(spaces).length,
      coverage: spaces.length ? Math.round((fresh / spaces.length) * 100) : 0,
    };
  }, [spaces]);

  const stats: { icon: LucideIcon; iconClass: string; value: string; label: string; term?: GlossaryTerm }[] = [
    { icon: Car, iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400", value: data.occupied.toLocaleString(), label: "Vehicles parked now" },
    { icon: Ticket, iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400", value: data.incidents.toLocaleString(), label: "Unbooked occupancy", term: "unbooked" },
    { icon: Gauge, iconClass: "bg-red-500/15 text-red-600 dark:text-red-400", value: `${data.cityPct}%`, label: "City occupancy", term: "occupancy" },
    { icon: RadioTower, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", value: `${data.coverage}%`, label: "Lots with fresh AI data", term: "freshData" },
  ];

  const mix = [
    { label: "Available", count: data.available, cls: "bg-emerald-500" },
    { label: "Occupied", count: data.occupied, cls: "bg-red-500" },
    { label: "Unknown", count: data.unknown, cls: "bg-slate-400" },
  ];

  return (
    <AuthorityShell active="analytics">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          City analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live parking occupancy across Dhaka from CityPulse AI cameras.
        </p>
        <LiveStatus
          className="mt-1.5"
          updatedAt={updatedAt}
          nextRefreshAt={nextRefreshAt}
          loading={loading}
          error={error}
          onRefresh={() => void refresh()}
        />

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <span className={cn("flex size-10 items-center justify-center rounded-xl", s.iconClass)}>
                <s.icon className="size-5" />
              </span>
              {loading && spaces.length === 0 ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <div className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[26px]">{s.value}</div>
              )}
              <div className="mt-0.5 flex items-center gap-0.5 text-[13px] text-muted-foreground">
                {s.label}
                {s.term && <InfoTip term={s.term} className="-my-1" />}
              </div>
            </div>
          ))}
        </div>

        {/* occupancy by lot */}
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Live occupancy by lot</h2>
              <p className="text-[13px] text-muted-foreground">Share of AI-classified slots that are occupied</p>
            </div>
            <Badge variant="purple">
              <Activity className="size-3" />
              Live
            </Badge>
          </div>
          {data.lots.length === 0 ? (
            loading ? (
              <LoadingRegion label="Loading live data…">
                <RowsSkeleton rows={4} className="mt-3 -mx-5" />
              </LoadingRegion>
            ) : (
              <EmptyState
                className="mt-5"
                icon={error ? RefreshCcw : MapPinOff}
                title={error ? "Live data unavailable" : "No active parking lots yet"}
                description={
                  error
                    ? "CityPulse couldn't load the latest camera readings. Try again in a moment."
                    : "Lots appear here once an owner's lot is active and its camera reports AI-monitored slots."
                }
                action={
                  <Button variant="outline" onClick={() => void refresh()}>
                    <RefreshCcw className="size-4" /> Check again now
                  </Button>
                }
              />
            )
          ) : (
            <div className="mt-5 flex flex-col gap-3.5">
              {data.lots.map(({ space, pct }) => (
                <div key={space.id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-[13.5px] font-semibold sm:w-40" title={space.name}>
                    {space.name}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", STRESS_BAR[stressOf(pct)])} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-extrabold">{pct}%</span>
                  <span className="hidden w-16 text-right text-xs text-muted-foreground sm:inline">
                    {space.occupied_slots}/{space.occupied_slots + space.available_slots}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* slot status mix */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-extrabold tracking-tight">Slot status breakdown</h2>
            <p className="text-[13px] text-muted-foreground">
              {data.totalSlots} AI-monitored slots · {data.booked} currently booked
            </p>
            <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted">
              {data.totalSlots > 0 &&
                mix.map((m) => (
                  <div key={m.label} className={m.cls} style={{ width: `${(m.count / data.totalSlots) * 100}%` }} />
                ))}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {mix.map((m) => (
                <div key={m.label} className="flex items-center gap-3 text-sm">
                  <span className={cn("size-2.5 rounded-full", m.cls)} />
                  <span className="flex flex-1 items-center gap-0.5 font-semibold">
                    {m.label}
                    {m.label === "Unknown" && <InfoTip term="unknown" className="-my-1" />}
                  </span>
                  <span className="font-extrabold">{m.count}</span>
                  <span className="w-12 text-right text-muted-foreground">
                    {data.totalSlots ? Math.round((m.count / data.totalSlots) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* top stressed lots */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-0.5 text-lg font-extrabold tracking-tight">
              Most stressed lots
              <InfoTip term="stress" className="-my-1" />
            </h2>
            <p className="text-[13px] text-muted-foreground">Ranked by live occupancy</p>
            <div className="mt-4 flex flex-col divide-y divide-border">
              {data.lots.slice(0, 5).map(({ space, pct }, i) => {
                const stress = stressOf(pct);
                return (
                  <div key={space.id} className="flex items-center gap-3.5 py-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-extrabold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{space.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {pct}% occupancy · {space.address ?? "—"}
                      </div>
                    </span>
                    <Badge variant={STRESS_BADGE[stress]}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {stress}
                    </Badge>
                  </div>
                );
              })}
              {data.lots.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">No data yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthorityShell>
  );
}

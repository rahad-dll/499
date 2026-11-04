"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import {
  CheckCircle2,
  Cctv,
  CircleDollarSign,
  Gauge,
  Layers,
  MapPin,
  Plus,
  Settings,
  Video,
  type LucideIcon,
} from "lucide-react";
import { OwnerShell } from "@/components/portal/OwnerShell";
import {
  CameraStatusBadge,
  LotStatusBadge,
  SlotGrid,
  SlotLegend,
} from "@/components/portal/owner-widgets";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/lib/bookings/use-bookings";
import {
  bookingRevenue,
  cityOccupancy,
  formatTaka,
  isSameLocalDay,
  lastUpdated,
  occupancyPct,
  timeAgo,
} from "@/lib/insights/metrics";
import { useLotOccupancy, useOwnerSpaces } from "@/lib/spaces/use-owner-spaces";
import { cn } from "@/lib/utils";

interface Metric {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  label: string;
  caption: string;
}

function RegisteredNotice() {
  const params = useSearchParams();
  if (params.get("registered") !== "1") return null;
  return (
    <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 className="size-4" />
      Parking lot registered. New lots appear on the live map once they are active and have AI-monitored slots.
    </div>
  );
}

export default function OwnerDashboardPage() {
  const { spaces, loading: spacesLoading, error: spacesError } = useOwnerSpaces();
  const occupancy = useLotOccupancy(spaces);
  const { bookings, error: bookingsError, loadedAt } = useBookings();

  const metrics = useMemo<Metric[]>(() => {
    const totalCapacity = spaces.reduce((total, space) => total + space.total_capacity, 0);
    const live = Object.values(occupancy.byId);
    const cameras = spaces.flatMap((space) => space.cameras ?? []);
    const activeCameras = cameras.filter((camera) => camera.status === "active").length;
    const ownLotIds = new Set(spaces.map((s) => s.id));
    const today = loadedAt ? new Date(loadedAt) : null;
    const todays = today
      ? bookings.filter((b) => ownLotIds.has(b.space_id) && isSameLocalDay(b.scheduled_at, today))
      : [];
    const revenue = todays.reduce((total, b) => total + bookingRevenue(b), 0);

    return [
      {
        icon: Layers,
        iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
        value: totalCapacity.toLocaleString(),
        label: "Total Capacity",
        caption: `${spaces.length} parking lot${spaces.length === 1 ? "" : "s"}`,
      },
      {
        icon: Gauge,
        iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
        value: live.length ? `${cityOccupancy(live)}%` : "—",
        label: "Live Occupancy",
        caption: `${live.length} of ${spaces.length} lots reporting AI data`,
      },
      {
        icon: CircleDollarSign,
        iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        value: bookingsError ? "—" : formatTaka(revenue),
        label: "Today's Revenue",
        caption: bookingsError ? "Bookings unavailable" : `${todays.length} booking${todays.length === 1 ? "" : "s"} today`,
      },
      {
        icon: Cctv,
        iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        value: `${activeCameras}/${cameras.length}`,
        label: "Active AI Cameras",
        caption: cameras.length ? `${cameras.length - activeCameras} offline or in setup` : "No cameras connected",
      },
    ];
  }, [spaces, occupancy.byId, bookings, bookingsError, loadedAt]);

  const now = occupancy.updatedAt ?? 0;
  const cameras = spaces.flatMap((space) => (space.cameras ?? []).map((camera) => ({ camera, space })));

  return (
    <OwnerShell active="dashboard" breadcrumb="Dashboard">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your registered parking facilities and operations.
          </p>
        </div>
        <Button asChild variant="brand" className="h-11 rounded-xl">
          <Link href="/owner/spaces/new">
            <Plus className="size-4" /> Register Parking Lot
          </Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <RegisteredNotice />
      </Suspense>

      {/* metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-4 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <span className={cn("flex size-10 items-center justify-center rounded-xl", m.iconClass)}>
              <m.icon className="size-5" />
            </span>
            <div className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[28px]">
              {spacesLoading ? "…" : m.value}
            </div>
            <div className="mt-0.5 text-[13px] font-semibold">{m.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{m.caption}</div>
          </div>
        ))}
      </div>

      {/* parking lots with live slots */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Your Parking Lots</h2>
            <p className="text-[13px] text-muted-foreground">
              Live slot status from CityPulse AI cameras
              {occupancy.updatedAt && <> · updated {new Date(occupancy.updatedAt).toLocaleTimeString()}</>}
            </p>
          </div>
          <SlotLegend />
        </div>

        {spacesError ? (
          <div className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {spacesError}
          </div>
        ) : spacesLoading ? (
          <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Loading parking lots…
          </div>
        ) : spaces.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No parking lots registered yet.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/owner/spaces/new">Register your first parking lot</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {spaces.map((space) => {
              const live = occupancy.byId[space.id];
              return (
                <article key={space.id} className="flex flex-col rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold">{space.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        {space.address || `${space.latitude}, ${space.longitude}`}
                      </p>
                    </div>
                    <LotStatusBadge space={space} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-card px-2 py-2">
                      <div className="text-sm font-extrabold">{space.total_capacity}</div>
                      <div className="text-[11px] text-muted-foreground">Capacity</div>
                    </div>
                    <div className="rounded-lg bg-card px-2 py-2">
                      <div className="text-sm font-extrabold">{live ? live.available_slots : "—"}</div>
                      <div className="text-[11px] text-muted-foreground">Free now</div>
                    </div>
                    <div className="rounded-lg bg-card px-2 py-2">
                      <div className="text-sm font-extrabold">{live ? `${occupancyPct(live)}%` : "—"}</div>
                      <div className="text-[11px] text-muted-foreground">Occupied</div>
                    </div>
                  </div>

                  <div className="mt-4 flex-1">
                    {live ? (
                      <>
                        <SlotGrid slots={live.slot_statuses} />
                        <p className={cn("mt-2 text-xs", live.is_stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                          {live.is_stale ? "Camera data is stale" : "AI data live"} · {timeAgo(lastUpdated(live), now)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {occupancy.loading ? "Loading live AI data…" : "No live AI data yet (lot must be active with monitored slots)."}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="capitalize text-muted-foreground">
                      {space.space_type}
                      {space.base_rate_unit != null && <> · ৳{space.base_rate_unit / 100}/hr</>}
                    </span>
                    <Link
                      href={`/owner/settings?lot=${space.id}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-teal-600 hover:underline dark:text-brand"
                    >
                      <Settings className="size-3.5" />
                      Manage
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* cameras */}
      <div className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">AI Cameras</h2>
          <Link href="/owner/cameras" className="text-sm font-semibold text-brand hover:underline">
            View all
          </Link>
        </div>
        {cameras.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {spacesLoading ? "Loading cameras…" : "No cameras connected. Add an RTSP stream from the Cameras page."}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cameras.slice(0, 6).map(({ camera, space }) => (
              <div key={camera.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-teal-600 dark:text-brand">
                  <Video className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{camera.label || space.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{camera.rtsp_url}</span>
                </span>
                <CameraStatusBadge status={camera.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </OwnerShell>
  );
}

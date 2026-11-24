"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Cctv,
  ChevronRight,
  MapPin,
  Navigation,
  ParkingCircle,
  Plus,
  Settings,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { OwnerMap } from "@/components/maps";
import { catchmentLabel, distanceM, type CatchmentM } from "@/components/maps/owner/catchment";
import { LiveStatus } from "@/components/portal/LiveStatus";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { LotStatusBadge, SlotGrid, SlotLegend } from "@/components/portal/owner-widgets";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  lastUpdated,
  occupancyPct,
  spaceStatus,
  stressOf,
  timeAgo,
  type Stress,
} from "@/lib/insights/metrics";
import type { NearbySpace, ParkingSpace } from "@/lib/spaces/types";
import { useLiveSpaces } from "@/lib/spaces/use-live-spaces";
import { useLotOccupancy, useOwnerSpaces } from "@/lib/spaces/use-owner-spaces";
import { cn } from "@/lib/utils";

type LotFilter = "all" | "live" | "busy" | "pending" | "inactive";

const FILTERS: { key: LotFilter; label: string }[] = [
  { key: "all", label: "All lots" },
  { key: "live", label: "Live" },
  { key: "busy", label: "Filling up" },
  { key: "pending", label: "Pending approval" },
  { key: "inactive", label: "Suspended" },
];

const STRESS_CHIP: Record<Stress, string> = {
  Optimal: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Moderate: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
};

const STRESS_DOT: Record<Stress, string> = {
  Optimal: "bg-emerald-500",
  Moderate: "bg-amber-500",
  Critical: "bg-red-500",
};

function matches(filter: LotFilter, space: ParkingSpace, live: NearbySpace | undefined): boolean {
  switch (filter) {
    case "all":
      return true;
    case "live":
      return Boolean(live);
    case "busy":
      return Boolean(live) && occupancyPct(live!) >= 60;
    case "pending":
      return spaceStatus(space) === "pending";
    case "inactive":
      return spaceStatus(space) === "inactive";
  }
}

const at = (s: { latitude: number; longitude: number }) => ({ lat: s.latitude, lng: s.longitude });

/* ---------------- market snapshot ---------------- */

interface Market {
  count: number;
  free: number;
  avgRate: number | null;
  /** this lot's rate vs the area average, in % (+ = pricier) */
  rateDelta: number | null;
  cheapest: NearbySpace | null;
}

function marketAround(space: ParkingSpace, competitors: NearbySpace[], radiusM: number): Market {
  const inside = competitors.filter((c) => distanceM(at(space), at(c)) <= radiusM);
  const rated = inside.filter((c) => c.base_rate_unit != null);
  const avgRate = rated.length ? rated.reduce((t, c) => t + c.base_rate_unit!, 0) / rated.length : null;
  const rateDelta =
    avgRate && space.base_rate_unit != null ? Math.round(((space.base_rate_unit - avgRate) / avgRate) * 100) : null;
  const cheapest = rated.reduce<NearbySpace | null>(
    (best, c) => (!best || c.base_rate_unit! < best.base_rate_unit! ? c : best),
    null,
  );
  return { count: inside.length, free: inside.reduce((t, c) => t + c.available_slots, 0), avgRate, rateDelta, cheapest };
}

function MarketSnapshot({ space, competitors, catchment }: { space: ParkingSpace; competitors: NearbySpace[]; catchment: CatchmentM }) {
  const radius = catchment || 1000;
  const market = marketAround(space, competitors, radius);
  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Store className="size-4 text-muted-foreground" />
        Market within {catchmentLabel(radius)}
      </div>
      {market.count === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          No other live CityPulse lots nearby. You are the only option drivers see here.
        </p>
      ) : (
        <>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-card py-1.5">
              <div className="text-sm font-extrabold">{market.count}</div>
              <div className="text-[10.5px] text-muted-foreground">Competitors</div>
            </div>
            <div className="rounded-lg bg-card py-1.5">
              <div className="text-sm font-extrabold">{market.free}</div>
              <div className="text-[10.5px] text-muted-foreground">Their free slots</div>
            </div>
            <div className="rounded-lg bg-card py-1.5">
              <div className="text-sm font-extrabold">{market.avgRate != null ? `৳${Math.round(market.avgRate / 100)}` : "—"}</div>
              <div className="text-[10.5px] text-muted-foreground">Avg rate/h</div>
            </div>
          </div>
          {market.rateDelta != null && (
            <p
              className={cn(
                "mt-2.5 flex items-center gap-1.5 text-xs font-semibold",
                market.rateDelta > 10
                  ? "text-amber-700 dark:text-amber-300"
                  : market.rateDelta < -10
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground",
              )}
            >
              {market.rateDelta > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {market.rateDelta === 0
                ? "Your rate matches the area average."
                : `Your rate is ${Math.abs(market.rateDelta)}% ${market.rateDelta > 0 ? "above" : "below"} the area average.`}
            </p>
          )}
          {market.cheapest && (
            <p className="mt-1 text-xs text-muted-foreground">
              Cheapest nearby: <span className="font-semibold text-foreground">{market.cheapest.name}</span> · ৳
              {market.cheapest.base_rate_unit! / 100}/h
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- side panel ---------------- */

function LotDetail({
  space,
  live,
  competitors,
  catchment,
  now,
}: {
  space: ParkingSpace;
  live: NearbySpace | undefined;
  competitors: NearbySpace[];
  catchment: CatchmentM;
  now: number;
}) {
  const cameras = space.cameras ?? [];
  const online = cameras.filter((c) => c.status === "active").length;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight">{space.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {space.address || `${space.latitude.toFixed(5)}, ${space.longitude.toFixed(5)}`}
          </p>
        </div>
      </div>
      <div className="mt-2.5">
        <LotStatusBadge space={space} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Capacity", String(space.total_capacity)],
          ["Free now", live ? String(live.available_slots) : "—"],
          ["Occupied", live ? `${occupancyPct(live)}%` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted/60 px-2 py-2">
            <div className="text-base font-extrabold">{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        {live ? (
          <>
            <SlotGrid slots={live.slot_statuses} />
            <p className={cn("mt-2 text-xs", live.is_stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {live.is_stale ? "Camera data is stale" : "AI data live"} · {timeAgo(lastUpdated(live), now)}
            </p>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
            No live AI data yet. A lot appears live once it is approved and has AI-monitored slots.
          </p>
        )}
      </div>

      <MarketSnapshot space={space} competitors={competitors} catchment={catchment} />

      <div className="mt-4 flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Cctv className="size-4" />
          Cameras online
        </span>
        <span className="font-bold">
          {online}/{cameras.length}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild variant="brand">
          <Link href={`/owner/settings?lot=${space.id}`}>
            <Settings className="size-4" /> Manage lot
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${space.latitude},${space.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation className="size-4" /> Directions
          </a>
        </Button>
      </div>
    </div>
  );
}

function PortfolioSummary({ spaces, live }: { spaces: ParkingSpace[]; live: Record<string, NearbySpace> }) {
  const lots = Object.values(live);
  const free = lots.reduce((t, s) => t + s.available_slots, 0);
  const pending = spaces.filter((s) => spaceStatus(s) === "pending").length;
  return (
    <div>
      <h2 className="text-lg font-extrabold tracking-tight">Your portfolio</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">Select a lot on the map or in the list for its details and market.</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Lots", String(spaces.length)],
          ["Free now", lots.length ? String(free) : "—"],
          ["Pending", String(pending)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted/60 px-2 py-2">
            <div className="text-base font-extrabold">{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <SlotLegend />
      </div>
      <ul className="mt-4 space-y-2 text-[13px] text-muted-foreground">
        <li>• <span className="font-semibold text-foreground">Catchment ring</span> (Layers) shows how far your drivers come from.</li>
        <li>• <span className="font-semibold text-foreground">Price tags</span> are nearby competitors: compare their rate and free space.</li>
        <li>• <span className="font-semibold text-foreground">Street View</span> (walking icon) checks the entrance drivers will see.</li>
      </ul>
    </div>
  );
}

/** Side panel for an owner with no lots yet: the market they would enter. */
function NewOwnerPanel({ market }: { market: NearbySpace[] }) {
  const rated = market.filter((s) => s.base_rate_unit != null);
  const avg = rated.length ? Math.round(rated.reduce((t, s) => t + s.base_rate_unit!, 0) / rated.length / 100) : null;
  const free = market.reduce((t, s) => t + s.available_slots, 0);
  return (
    <div>
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand/12 text-teal-600 dark:text-brand">
        <ParkingCircle className="size-6" />
      </span>
      <h2 className="mt-3 text-lg font-extrabold tracking-tight">No parking lots yet</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Register a lot and it appears on this map with its live occupancy, catchment ring and nearby competitors.
      </p>
      <Button asChild variant="brand" className="mt-4 w-full">
        <Link href="/owner/spaces/new">
          <Plus className="size-4" /> Register your first parking lot
        </Link>
      </Button>

      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3.5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Store className="size-4 text-muted-foreground" />
          Dhaka parking market today
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
          {[
            ["Live lots", String(market.length)],
            ["Free slots", String(free)],
            ["Avg rate/h", avg != null ? `৳${avg}` : "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-card py-1.5">
              <div className="text-sm font-extrabold">{value}</div>
              <div className="text-[10.5px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          The price tags on the map are existing CityPulse lots. Look for busy areas with few free slots before you
          pick a location and a rate.
        </p>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function OwnerMapPage() {
  const { spaces, loading, error } = useOwnerSpaces();
  const occupancy = useLotOccupancy(spaces);
  const [filter, setFilter] = useState<LotFilter>("all");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [catchment, setCatchment] = useState<CatchmentM>(1000);

  // an owner with no lots yet still gets the map: the city's lots, to scout a location and price
  const noLots = !loading && !error && spaces.length === 0;
  const cityMarket = useLiveSpaces({ enabled: noLots });

  const ownIds = useMemo(() => new Set(spaces.map((s) => s.id)), [spaces]);
  const competitors = useMemo(
    () => (noLots ? cityMarket.spaces : occupancy.nearby.filter((s) => !ownIds.has(s.id))),
    [noLots, cityMarket.spaces, occupancy.nearby, ownIds],
  );
  const shown = useMemo(
    () => spaces.filter((s) => matches(filter, s, occupancy.byId[s.id])),
    [spaces, filter, occupancy.byId],
  );
  const focused = spaces.find((s) => s.id === focusId) ?? null;
  const now = occupancy.updatedAt ?? 0;

  return (
    <OwnerShell active="map" breadcrumb="Lot map" lockViewport>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Lot map</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {noLots
              ? "Scout the city's parking before you register your first lot."
              : "Your lots, their live occupancy and the competition around them."}
          </p>
          {noLots ? (
            <LiveStatus
              className="mt-1"
              updatedAt={cityMarket.updatedAt}
              nextRefreshAt={cityMarket.nextRefreshAt}
              loading={cityMarket.loading}
              error={cityMarket.error}
              onRefresh={() => void cityMarket.refresh()}
            />
          ) : spaces.length > 0 && (
            <LiveStatus
              className="mt-1"
              updatedAt={occupancy.updatedAt}
              nextRefreshAt={occupancy.nextRefreshAt}
              loading={occupancy.loading}
              error={occupancy.error}
              onRefresh={() => void occupancy.refresh()}
            />
          )}
        </div>
        <div
          className={cn(
            "-mx-4 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:max-w-full sm:px-0",
            noLots && "hidden",
          )}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold shadow-sm transition-colors",
                filter === f.key
                  ? "border-teal-500 bg-teal-500 text-white"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
            <OwnerMap
              spaces={shown}
              live={occupancy.byId}
              competitors={competitors}
              focusId={focusId}
              onSelect={setFocusId}
              catchment={catchment}
              onCatchment={setCatchment}
              className="h-[62dvh] min-h-[380px] rounded-2xl border border-border lg:h-auto lg:min-h-0 lg:flex-1"
            />

            {/* lot cards, like the driver app's bottom carousel */}
            <div className={cn("-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:px-0", noLots && "hidden")}>
              {loading
                ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[92px] w-60 shrink-0 rounded-2xl" />)
                : shown.map((space) => {
                    const live = occupancy.byId[space.id];
                    const stress = live ? stressOf(occupancyPct(live)) : null;
                    return (
                      <button
                        key={space.id}
                        type="button"
                        onClick={() => setFocusId(space.id)}
                        aria-pressed={space.id === focusId}
                        className={cn(
                          "w-60 shrink-0 rounded-2xl border bg-card p-3 text-left shadow-sm transition-colors",
                          space.id === focusId ? "border-teal-500 ring-2 ring-teal-500/30" : "border-border hover:border-teal-500/50",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">{space.name}</span>
                          <span className={cn("size-2 shrink-0 rounded-full", stress ? STRESS_DOT[stress] : "bg-slate-400")} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{space.address || "No address"}</div>
                        <div className="mt-2 flex items-center justify-between">
                          {live && stress ? (
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11.5px] font-bold", STRESS_CHIP[stress])}>
                              {live.available_slots} free
                            </span>
                          ) : (
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11.5px] font-semibold capitalize text-muted-foreground">
                              {spaceStatus(space) === "active" ? "No live data" : spaceStatus(space)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            {space.base_rate_unit != null ? `৳${space.base_rate_unit / 100}/hr` : ""}
                            <ChevronRight className="size-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
              {!loading && shown.length === 0 && (
                <p className="py-6 text-sm text-muted-foreground">No lots match this filter.</p>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-5 lg:min-h-0 lg:overflow-y-auto">
            {noLots ? (
              <NewOwnerPanel market={cityMarket.spaces} />
            ) : focused ? (
              <LotDetail
                space={focused}
                live={occupancy.byId[focused.id]}
                competitors={competitors}
                catchment={catchment}
                now={now}
              />
            ) : (
              <PortfolioSummary spaces={spaces} live={occupancy.byId} />
            )}
          </aside>
        </div>
      )}
    </OwnerShell>
  );
}

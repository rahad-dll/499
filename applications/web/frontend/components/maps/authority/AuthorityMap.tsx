"use client";

/*
 * Traffic-authority map (Google Maps). Built for city-wide monitoring and
 * enforcement rather than one business:
 *  - Google live traffic on by default, transit lines on demand;
 *  - congestion zones: a halo per lot sized by capacity, coloured by stress;
 *  - monitoring coverage: the 5 km scan areas the city feed is built from;
 *  - pins flag critical alerts (pulsing ring) and unbooked cars (red counter);
 *  - quick filters (critical, alerts, unbooked, stale cameras);
 *  - a dispatch card with Google directions for field officers.
 * Without a Google key it falls back to the OpenStreetMap LiveMap.
 */

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AdvancedMarker, Circle, useMap } from "@vis.gl/react-google-maps";
import { BusFront, Clock, Flame, Navigation, Radar, Shield, TrafficCone, X } from "lucide-react";
import {
  deriveAlerts,
  lastUpdated,
  occupancyPct,
  stressOf,
  timeAgo,
  unbookedSlots,
  type AlertSeverity,
  type Stress,
} from "@/lib/insights/metrics";
import { DHAKA_CENTER, DHAKA_SCAN_POINTS } from "@/lib/spaces/use-live-spaces";
import type { NearbySpace } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";
import LiveMap from "../LiveMap";
import {
  FitOnce,
  FlyTo,
  GoogleBaseMap,
  GoogleMapsGate,
  LayersPanel,
  LegendDot,
  MapRail,
  MeMarker,
  TrafficLayer,
  TransitLayer,
  directionsUrl,
  fitTo,
  useMapView,
  type LatLngLiteral,
} from "../google/toolkit";

const STRESS_COLOR: Record<Stress, string> = {
  Optimal: "#12c2a9",
  Moderate: "#f59e0b",
  Critical: "#ef4444",
};

const PIN_PATH =
  "M18 1C8.6 1 1 8.6 1 18c0 12.4 14.6 25.2 16.2 26.5a1.3 1.3 0 0 0 1.6 0C20.4 43.2 35 30.4 35 18 35 8.6 27.4 1 18 1z";

/** GET /spaces/nearby searches about this far around each scan point. */
const SCAN_RADIUS_M = 5000;

type CityFilter = "all" | "critical" | "alerts" | "unbooked" | "stale";

const FILTERS: { key: CityFilter; label: string }[] = [
  { key: "all", label: "All lots" },
  { key: "critical", label: "Critical" },
  { key: "alerts", label: "With alerts" },
  { key: "unbooked", label: "Unbooked cars" },
  { key: "stale", label: "Stale cameras" },
];

const at = (s: NearbySpace): LatLngLiteral => ({ lat: s.latitude, lng: s.longitude });

interface LotIntel {
  space: NearbySpace;
  pct: number;
  stress: Stress;
  unbooked: number;
  worst: AlertSeverity | null;
  alerts: number;
}

function CityPin({ intel, selected }: { intel: LotIntel; selected: boolean }) {
  const { space, stress, unbooked, worst } = intel;
  return (
    <div
      className={cn(
        "cp-pin",
        `cp-pin--${stress.toLowerCase()}`,
        selected && "cp-pin--selected",
        worst === "critical" && !selected && "cp-pin--alert",
      )}
    >
      <svg viewBox="0 0 36 46" aria-hidden="true">
        <path d={PIN_PATH} />
      </svg>
      <span className="cp-pin__value">{space.available_slots}</span>
      {space.is_stale && <span className="cp-pin__stale" />}
      {unbooked > 0 && <span className="cp-pin__badge">{unbooked}</span>}
    </div>
  );
}

const STRESS_PILL: Record<Stress, string> = {
  Optimal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  Moderate: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Critical: "bg-red-500/15 text-red-700 dark:text-red-300",
};

/** Selected lot: live numbers plus dispatch actions for officers. */
function DispatchCard({ intel, compact, onClose }: { intel: LotIntel; compact: boolean; onClose: () => void }) {
  const { space, pct, stress, unbooked, alerts } = intel;
  return (
    <div
      className={cn(
        "absolute z-10 rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm",
        compact ? "inset-x-2 bottom-2 p-3 pr-14" : "right-[4.25rem] top-16 w-72 p-4",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-extrabold">{space.name}</div>
          {!compact && <div className="truncate text-xs text-muted-foreground">{space.address ?? "No address"}</div>}
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", STRESS_PILL[stress])}>{pct}% full</span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      {!compact && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            ["Free", space.available_slots, "text-teal-600 dark:text-teal-300"],
            ["Unbooked", unbooked, unbooked ? "text-red-600 dark:text-red-300" : ""],
            ["Alerts", alerts, alerts ? "text-amber-600 dark:text-amber-300" : ""],
          ].map(([label, value, cls]) => (
            <div key={label as string} className="rounded-lg bg-muted/70 py-1.5">
              <div className={cn("text-base font-extrabold leading-tight", cls as string)}>{value}</div>
              <div className="text-[10.5px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className={cn("flex items-center gap-1.5 text-xs", compact ? "mt-1" : "mt-2.5", space.is_stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
        <Clock className="size-3.5" />
        {space.is_stale ? "Camera data is stale" : "AI updated"} · {timeAgo(lastUpdated(space))}
        {compact && unbooked > 0 && <span className="ml-auto font-semibold text-red-600 dark:text-red-300">{unbooked} unbooked</span>}
      </div>

      <div className={cn("grid gap-2", compact ? "mt-2 grid-cols-2" : "mt-3 grid-cols-2")}>
        <a
          href={directionsUrl(at(space))}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-teal-500 px-3 text-[13px] font-semibold text-white hover:bg-teal-600"
        >
          <Navigation className="size-4" /> Dispatch
        </a>
        <Link
          href="/command-center/enforcement"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold hover:bg-muted"
        >
          <Shield className="size-4" /> Enforce
        </Link>
      </div>
    </div>
  );
}

export interface AuthorityMapProps {
  spaces: NearbySpace[];
  focusId?: string | null;
  onSelect?: (spaceId: string | null) => void;
  compact?: boolean;
  /** shown instead of the Google map when no key is set or Google rejects it */
  fallback?: ReactNode;
  /** left offset (px) for the filter chips, to clear the page's own overlay */
  chipsInset?: number;
  className?: string;
}

function AuthorityGoogleMap({
  spaces,
  focusId = null,
  onSelect,
  compact = false,
  chipsInset = 12,
}: AuthorityMapProps) {
  const view = useMapView("roadmap");
  const map = useMap();
  const [traffic, setTraffic] = useState(true);
  const [transit, setTransit] = useState(false);
  const [zones, setZones] = useState(true);
  const [coverage, setCoverage] = useState(false);
  const [filter, setFilter] = useState<CityFilter>("all");

  const intel = useMemo<LotIntel[]>(() => {
    const alerts = deriveAlerts(spaces);
    return spaces.map((space) => {
      const mine = alerts.filter((a) => a.space.id === space.id);
      const pct = occupancyPct(space);
      return {
        space,
        pct,
        stress: stressOf(pct),
        unbooked: unbookedSlots(space).length,
        alerts: mine.length,
        worst: mine[0]?.severity ?? null, // deriveAlerts sorts by severity
      };
    });
  }, [spaces]);

  const shown = useMemo(
    () =>
      intel.filter((i) => {
        switch (filter) {
          case "all":
            return true;
          case "critical":
            return i.stress === "Critical";
          case "alerts":
            return i.alerts > 0;
          case "unbooked":
            return i.unbooked > 0;
          case "stale":
            return i.space.is_stale;
        }
      }),
    [intel, filter],
  );

  const points = useMemo(() => spaces.map(at), [spaces]);
  const focused = intel.find((i) => i.space.id === focusId) ?? null;
  const counts: Record<CityFilter, number> = {
    all: intel.length,
    critical: intel.filter((i) => i.stress === "Critical").length,
    alerts: intel.filter((i) => i.alerts > 0).length,
    unbooked: intel.filter((i) => i.unbooked > 0).length,
    stale: intel.filter((i) => i.space.is_stale).length,
  };

  return (
    <>
      <GoogleBaseMap
        mapType={view.mapType}
        tilted={view.tilted}
        compact={compact}
        defaultCenter={{ lat: DHAKA_CENTER[0], lng: DHAKA_CENTER[1] }}
        defaultZoom={compact ? 12 : 13}
        onMapClick={() => onSelect?.(null)}
      >
        <FitOnce points={points} />
        <FlyTo target={focused ? at(focused.space) : null} targetKey={focusId} />
        <TrafficLayer visible={traffic} />
        <TransitLayer visible={transit} />

        {coverage &&
          DHAKA_SCAN_POINTS.map(([lat, lng]) => (
            <Circle
              key={`scan-${lat}-${lng}`}
              center={{ lat, lng }}
              radius={SCAN_RADIUS_M}
              clickable={false}
              strokeColor="#8b6cff"
              strokeOpacity={0.7}
              strokeWeight={1.5}
              fillColor="#8b6cff"
              fillOpacity={0.04}
            />
          ))}

        {zones &&
          shown.map((i) => (
            <Circle
              key={`zone-${i.space.id}`}
              center={at(i.space)}
              radius={Math.min(60 + i.space.total_capacity * 3, 300)}
              clickable={false}
              strokeColor={STRESS_COLOR[i.stress]}
              strokeOpacity={0.5}
              strokeWeight={1}
              fillColor={STRESS_COLOR[i.stress]}
              fillOpacity={i.stress === "Critical" ? 0.3 : i.stress === "Moderate" ? 0.22 : 0.14}
            />
          ))}

        {shown.map((i) => (
          <AdvancedMarker
            key={i.space.id}
            position={at(i.space)}
            title={`${i.space.name}: ${i.pct}% full, ${i.space.available_slots} free${i.unbooked ? `, ${i.unbooked} unbooked` : ""}`}
            zIndex={i.space.id === focusId ? 1000 : i.worst === "critical" ? 600 : 100}
            onClick={() => onSelect?.(i.space.id)}
          >
            <CityPin intel={i} selected={i.space.id === focusId} />
          </AdvancedMarker>
        ))}

        <MeMarker position={view.me} />
      </GoogleBaseMap>

      {/* quick filters */}
      <div
        className={cn(
          "absolute right-3 z-10 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          compact ? "top-12" : "top-4 right-[4.25rem]",
        )}
        style={{ left: chipsInset }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold shadow-sm transition-colors",
              compact ? "px-2.5 py-1 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]",
              filter === f.key
                ? "border-teal-500 bg-teal-500 text-white"
                : "border-border bg-card/95 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10.5px] font-bold",
                filter === f.key ? "bg-white/25" : "bg-muted text-foreground",
              )}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {!compact && (
        <div className="pointer-events-none absolute bottom-9 left-3 z-10 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur-sm">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Map legend</div>
          <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] font-medium">
            <LegendDot color="#12c2a9" label="Optimal (<60% full)" />
            <LegendDot color="#f59e0b" label="Moderate (60–84%)" />
            <LegendDot color="#ef4444" label="Critical (≥85%, pulsing)" />
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-extrabold text-white">n</span>
              Unbooked cars at the lot
            </span>
            {traffic && (
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-1.5 w-6 overflow-hidden rounded-full">
                  <span className="flex-1 bg-[#16a34a]" />
                  <span className="flex-1 bg-[#f97316]" />
                  <span className="flex-1 bg-[#dc2626]" />
                </span>
                Road traffic (Google)
              </span>
            )}
          </div>
          <div className="mt-2 border-t border-border pt-1.5 text-[11px] text-muted-foreground">Number on a pin = free slots</div>
        </div>
      )}

      {focused && <DispatchCard intel={focused} compact={compact} onClose={() => onSelect?.(null)} />}

      <MapRail
        compact={compact}
        mapType={view.mapType}
        onMapType={view.setMapType}
        tilted={view.tilted}
        onTilted={view.setTilted}
        layersOpen={view.layersOpen}
        onLayers={() => view.setLayersOpen(!view.layersOpen)}
        onFit={() => map && fitTo(map, points.length ? points : [{ lat: DHAKA_CENTER[0], lng: DHAKA_CENTER[1] }])}
        onMe={view.setMe}
        className={compact && focused ? "bottom-[6.5rem]" : undefined}
      />

      <LayersPanel
        open={view.layersOpen}
        onClose={() => view.setLayersOpen(false)}
        title="City map layers"
        mapType={view.mapType}
        onMapType={view.setMapType}
        toggles={[
          { key: "traffic", label: "Live traffic", description: "Green, orange and red roads from Google", icon: TrafficCone, value: traffic, onChange: setTraffic },
          { key: "zones", label: "Congestion zones", description: "Halo per lot, sized by capacity, coloured by stress", icon: Flame, value: zones, onChange: setZones },
          { key: "transit", label: "Public transit", description: "Bus and rail lines and stations", icon: BusFront, value: transit, onChange: setTransit },
          { key: "coverage", label: "Monitoring coverage", description: "The 5 km scan areas behind the live feed", icon: Radar, value: coverage, onChange: setCoverage },
        ]}
        legend={
          <>
            <LegendDot color="#12c2a9" label="Optimal (<60%)" />
            <LegendDot color="#f59e0b" label="Moderate (60–84%)" />
            <LegendDot color="#ef4444" label="Critical (≥85%)" />
            <LegendDot color="#dc2626" label="Red counter = unbooked cars" />
            <LegendDot color="#8b6cff" label="Coverage area" />
          </>
        }
      />

      {view.toast}
    </>
  );
}

/** Traffic-authority map: Google Maps when a key is set, else OpenStreetMap. */
export default function AuthorityMap(props: AuthorityMapProps) {
  return (
    <div className={cn("relative overflow-hidden", props.className)}>
      <GoogleMapsGate
        fallback={
          props.fallback ?? (
            <LiveMap
              spaces={props.spaces}
              compact={props.compact}
              focusId={props.focusId}
              onSelect={(id) => props.onSelect?.(id)}
              className="absolute inset-0"
            />
          )
        }
      >
        <AuthorityGoogleMap {...props} />
      </GoogleMapsGate>
    </div>
  );
}

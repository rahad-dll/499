"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { Clock, Maximize, Minus, Plus } from "lucide-react";
import {
  lastUpdated,
  occupancyPct,
  stressOf,
  timeAgo,
  type Stress,
} from "@/lib/insights/metrics";
import { DHAKA_CENTER } from "@/lib/spaces/use-live-spaces";
import type { NearbySpace } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";
import { ThemedTiles } from "./tiles";

/* ---------------- icons ---------------- */

const STRESS_CLASS: Record<Stress, string> = {
  Optimal: "optimal",
  Moderate: "moderate",
  Critical: "critical",
};

const PIN_PATH =
  "M18 1C8.6 1 1 8.6 1 18c0 12.4 14.6 25.2 16.2 26.5a1.3 1.3 0 0 0 1.6 0C20.4 43.2 35 30.4 35 18 35 8.6 27.4 1 18 1z";

/** Teardrop pin colored by stress; the white disc shows free slots. */
function pinIcon(space: NearbySpace, selected: boolean): L.DivIcon {
  const stress = STRESS_CLASS[stressOf(occupancyPct(space))];
  return L.divIcon({
    className: "",
    iconSize: [36, 46],
    iconAnchor: [18, 45],
    popupAnchor: [0, -42],
    html: `<div class="cp-pin cp-pin--${stress}${selected ? " cp-pin--selected" : ""}">
      <svg viewBox="0 0 36 46" aria-hidden="true"><path d="${PIN_PATH}"/></svg>
      <span class="cp-pin__value">${space.available_slots}</span>
      ${space.is_stale ? '<span class="cp-pin__stale"></span>' : ""}
    </div>`,
  });
}

/** Brand-gradient bubble for several lots that would overlap at this zoom. */
function clusterIcon(spaces: NearbySpace[]): L.DivIcon {
  const occupied = spaces.reduce((t, s) => t + s.occupied_slots, 0);
  const known = spaces.reduce((t, s) => t + s.occupied_slots + s.available_slots, 0);
  const stress = STRESS_CLASS[stressOf(known ? Math.round((occupied / known) * 100) : 0)];
  return L.divIcon({
    className: "",
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    html: `<div class="cp-cluster cp-cluster--${stress}">
      <span class="cp-cluster__count">${spaces.length}</span>
      <span class="cp-cluster__label">lots</span>
    </div>`,
  });
}

/* ---------------- clustering ---------------- */

const CLUSTER_RADIUS_PX = 46;
const MAX_CLUSTER_ZOOM = 17;

type MarkerGroup =
  | { kind: "lot"; space: NearbySpace }
  | { kind: "cluster"; key: string; spaces: NearbySpace[]; center: L.LatLngExpression };

/** Greedy screen-space grouping: lots closer than ~46px at this zoom merge. */
function groupSpaces(map: L.Map, zoom: number, spaces: NearbySpace[], keepId: string | null): MarkerGroup[] {
  if (zoom >= MAX_CLUSTER_ZOOM) return spaces.map((space) => ({ kind: "lot", space }));

  const buckets: { point: L.Point; members: NearbySpace[] }[] = [];
  const groups: MarkerGroup[] = [];
  for (const space of spaces) {
    if (space.id === keepId) {
      groups.push({ kind: "lot", space }); // the selected lot always stays visible
      continue;
    }
    const point = map.project([space.latitude, space.longitude], zoom);
    const bucket = buckets.find((b) => b.point.distanceTo(point) < CLUSTER_RADIUS_PX);
    if (bucket) {
      bucket.members.push(space);
      const n = bucket.members.length;
      bucket.point = L.point(
        bucket.point.x + (point.x - bucket.point.x) / n,
        bucket.point.y + (point.y - bucket.point.y) / n,
      );
    } else {
      buckets.push({ point, members: [space] });
    }
  }

  for (const { members } of buckets) {
    if (members.length === 1) {
      groups.push({ kind: "lot", space: members[0] });
      continue;
    }
    const lat = members.reduce((t, s) => t + s.latitude, 0) / members.length;
    const lng = members.reduce((t, s) => t + s.longitude, 0) / members.length;
    groups.push({
      kind: "cluster",
      key: members.map((s) => s.id).sort().join("|"),
      spaces: members,
      center: [lat, lng],
    });
  }
  return groups;
}

function boundsOf(spaces: NearbySpace[]): L.LatLngBounds {
  return L.latLngBounds(spaces.map((s) => [s.latitude, s.longitude] as [number, number]));
}

/* ---------------- popup ---------------- */

const STRESS_PILL: Record<Stress, string> = {
  Optimal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  Moderate: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Critical: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const STRESS_BAR: Record<Stress, string> = {
  Optimal: "bg-teal-500",
  Moderate: "bg-amber-500",
  Critical: "bg-red-500",
};

function LotPopup({ space }: { space: NearbySpace }) {
  const pct = occupancyPct(space);
  const stress = stressOf(pct);
  return (
    <div className="w-60">
      <div className="flex items-start justify-between gap-3 pr-4">
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-extrabold text-foreground">{space.name}</div>
          <div className="truncate text-xs text-muted-foreground">{space.address ?? "No address"}</div>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", STRESS_PILL[stress])}>
          {stress}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        {[
          { label: "Free", value: space.available_slots, cls: "text-teal-600 dark:text-teal-300" },
          { label: "Taken", value: space.occupied_slots, cls: "text-red-600 dark:text-red-300" },
          { label: "Unknown", value: space.unknown_slots, cls: "text-muted-foreground" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/70 py-1.5">
            <div className={cn("text-base font-extrabold leading-tight", item.cls)}>{item.value}</div>
            <div className="text-[10.5px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", STRESS_BAR[stress])} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold">{pct}% full</span>
      </div>

      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Capacity {space.total_capacity}</span>
        {space.base_rate_unit != null && <span>৳{space.base_rate_unit / 100}/hour</span>}
      </div>

      <div
        className={cn(
          "mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-xs",
          space.is_stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        <Clock className="size-3.5" />
        {space.is_stale ? "Camera data is stale" : "AI updated"} · {timeAgo(lastUpdated(space))}
      </div>
    </div>
  );
}

/* ---------------- map behaviour ---------------- */

type MarkerRefs = Record<string, L.Marker | null>;

/**
 * Keeps Leaflet in sync with its container size (the page renders separate
 * desktop/mobile maps and hides one with CSS) and fits the view to the lots
 * the first time they arrive while the map is actually visible.
 */
function AutoFit({ spaces }: { spaces: NearbySpace[] }) {
  const map = useMap();
  const fitted = useRef(false);
  const latest = useRef(spaces);

  useEffect(() => {
    latest.current = spaces;
    fitIfReady();
  });

  function fitIfReady() {
    const current = latest.current;
    if (fitted.current || current.length === 0) return;
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;
    fitted.current = true;
    map.fitBounds(boundsOf(current), { padding: [56, 56], maxZoom: 15 });
  }

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      fitIfReady();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

/** Flies to a lot and opens its popup when `focusId` changes. */
function FocusOnSelection({
  focusId,
  spaces,
  markers,
}: {
  focusId: string | null;
  spaces: NearbySpace[];
  markers: RefObject<MarkerRefs>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!focusId) return;
    const space = spaces.find((s) => s.id === focusId);
    if (!space) return;
    // the page also renders a CSS-hidden map; flying a zero-size map yields NaN
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const openPopup = () => {
      timer = setTimeout(() => markers.current[focusId]?.openPopup(), 60);
    };
    const target = L.latLng(space.latitude, space.longitude);
    // already in comfortable view (e.g. the pin itself was clicked): no fly
    if (map.getZoom() >= 15 && map.getBounds().pad(-0.15).contains(target)) {
      openPopup();
      return () => clearTimeout(timer);
    }
    map.once("moveend", openPopup);
    map.flyTo(target, Math.max(map.getZoom(), MAX_CLUSTER_ZOOM), { duration: 0.8 });
    return () => {
      map.off("moveend", openPopup);
      clearTimeout(timer);
    };
    // spaces refresh every poll; only re-fly when the selection itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, map]);
  return null;
}

function LotMarkers({
  spaces,
  focusId,
  onSelect,
  markers,
}: {
  spaces: NearbySpace[];
  focusId: string | null;
  onSelect?: (spaceId: string) => void;
  markers: RefObject<MarkerRefs>;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const groups = useMemo(() => groupSpaces(map, zoom, spaces, focusId), [map, zoom, spaces, focusId]);

  return groups.map((group) =>
    group.kind === "lot" ? (
      <Marker
        key={group.space.id}
        ref={(marker) => {
          markers.current[group.space.id] = marker;
        }}
        position={[group.space.latitude, group.space.longitude]}
        icon={pinIcon(group.space, group.space.id === focusId)}
        title={`${group.space.name}: ${group.space.available_slots} free`}
        riseOnHover
        zIndexOffset={group.space.id === focusId ? 1000 : 0}
        eventHandlers={{ click: () => onSelect?.(group.space.id) }}
      >
        <Popup className="cp-popup" minWidth={240} maxWidth={280}>
          <LotPopup space={group.space} />
        </Popup>
      </Marker>
    ) : (
      <Marker
        key={group.key}
        position={group.center}
        icon={clusterIcon(group.spaces)}
        title={`${group.spaces.length} lots · ${group.spaces.reduce((t, s) => t + s.available_slots, 0)} free slots — click to zoom in`}
        eventHandlers={{
          click: () => map.fitBounds(boundsOf(group.spaces), { padding: [64, 64], maxZoom: MAX_CLUSTER_ZOOM }),
        }}
      />
    ),
  );
}

/* ---------------- controls ---------------- */

function ControlButton({
  label,
  onClick,
  children,
  compact,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center text-foreground transition-colors hover:bg-muted hover:text-teal-600 dark:hover:text-brand",
        compact ? "size-8" : "size-10",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- map ---------------- */

export interface LiveMapProps {
  spaces: NearbySpace[];
  compact?: boolean;
  focusId?: string | null;
  onSelect?: (spaceId: string) => void;
  className?: string;
}

/** OpenStreetMap view of every lot with live AI occupancy. */
export default function LiveMap({
  spaces,
  compact = false,
  focusId = null,
  onSelect,
  className,
}: LiveMapProps) {
  const markers = useRef<MarkerRefs>({});
  const [map, setMap] = useState<L.Map | null>(null);
  const icon = compact ? "size-3.5" : "size-4";

  return (
    <div className={cn("isolate z-0", className)}>
      <MapContainer
        ref={setMap}
        center={DHAKA_CENTER}
        zoom={compact ? 13 : 14}
        zoomControl={false}
        scrollWheelZoom={!compact}
        style={{ height: "100%", width: "100%", background: "var(--secondary)" }}
      >
        <ThemedTiles />
        <AutoFit spaces={spaces} />
        <FocusOnSelection focusId={focusId} spaces={spaces} markers={markers} />
        <LotMarkers spaces={spaces} focusId={focusId} onSelect={onSelect} markers={markers} />
      </MapContainer>

      {/* zoom / fit controls, bottom-right so overlays never cover them */}
      {map && (
        <div
          className={cn(
            "absolute z-[1000] flex flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur-sm [&>button+button]:border-t [&>button+button]:border-border",
            compact ? "bottom-7 right-2" : "bottom-8 right-4",
          )}
        >
          <ControlButton label="Zoom in" onClick={() => map.zoomIn()} compact={compact}>
            <Plus className={icon} />
          </ControlButton>
          <ControlButton label="Zoom out" onClick={() => map.zoomOut()} compact={compact}>
            <Minus className={icon} />
          </ControlButton>
          <ControlButton
            label="Show all parking lots"
            onClick={() => {
              if (spaces.length) map.fitBounds(boundsOf(spaces), { padding: [56, 56], maxZoom: 15 });
              else map.setView(DHAKA_CENTER, 13);
            }}
            compact={compact}
          >
            <Maximize className={icon} />
          </ControlButton>
        </div>
      )}
    </div>
  );
}

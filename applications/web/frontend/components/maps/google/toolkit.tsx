"use client";

/*
 * Shared Google Maps building blocks for the role maps (parking owner and
 * traffic authority): the API gate with an OpenStreetMap fallback, the themed
 * base map, the right-hand control rail, the "Map layers" panel, map toasts
 * and a few imperative helpers (fit, fly, tilt, traffic/transit layers).
 */

import "../map.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  ColorScheme,
  Map,
  RenderingType,
  useApiLoadingStatus,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  Box,
  Layers,
  LocateFixed,
  Map as MapIcon,
  Maximize,
  Minus,
  Mountain,
  Plus,
  Satellite,
  X,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useDarkTheme } from "../use-dark-theme";

/* ---------------- config ---------------- */

/** Browser key for the Maps JavaScript API (restrict it by HTTP referrer). */
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** A cloud map id enables vector maps (tilt / 3D buildings) and Advanced Markers. */
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

export type LatLngLiteral = { lat: number; lng: number };
export type MapTypeId = "roadmap" | "satellite" | "hybrid" | "terrain";

/* ---------------- API gate ---------------- */

function FallbackNotice({ reason, children }: { reason: string; children: ReactNode }) {
  return (
    <>
      {children}
      <span
        title={reason}
        className="pointer-events-none absolute right-3 top-3 z-[1001] rounded-full border border-border bg-card/95 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm"
      >
        OpenStreetMap view · {reason}
      </span>
    </>
  );
}

function GateStatus({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const status = useApiLoadingStatus();
  if (status === APILoadingStatus.AUTH_FAILURE) {
    return <FallbackNotice reason="Google Maps key rejected">{fallback}</FallbackNotice>;
  }
  if (status === APILoadingStatus.FAILED) {
    return <FallbackNotice reason="Google Maps failed to load">{fallback}</FallbackNotice>;
  }
  return children;
}

/**
 * Renders `children` inside a Google Maps API provider, or `fallback` (the
 * OpenStreetMap map) when no key is configured or Google rejects the key.
 */
export function GoogleMapsGate({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <FallbackNotice reason="no Google Maps key">{fallback}</FallbackNotice>;
  }
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} region="BD" language="en">
      <GateStatus fallback={fallback}>{children}</GateStatus>
    </APIProvider>
  );
}

/* ---------------- base map ---------------- */

/**
 * Vector Google map that follows the site theme. Google's own UI is off: each
 * role map draws its own controls with `MapRail` and `LayersPanel`.
 */
export function GoogleBaseMap({
  mapType,
  tilted,
  compact = false,
  defaultCenter,
  defaultZoom,
  onMapClick,
  cursor,
  children,
}: {
  mapType: MapTypeId;
  tilted: boolean;
  compact?: boolean;
  defaultCenter: LatLngLiteral;
  defaultZoom: number;
  /** receives the clicked point (null when Google gives none) */
  onMapClick?: (latLng: LatLngLiteral | null) => void;
  /** cursor over the map, e.g. "crosshair" for pickers */
  cursor?: string;
  children?: ReactNode;
}) {
  const dark = useDarkTheme();
  return (
    <Map
      mapId={GOOGLE_MAP_ID}
      colorScheme={dark ? ColorScheme.DARK : ColorScheme.LIGHT}
      renderingType={RenderingType.VECTOR}
      defaultCenter={defaultCenter}
      defaultZoom={defaultZoom}
      mapTypeId={mapType}
      disableDefaultUI
      clickableIcons={false}
      gestureHandling={compact ? "cooperative" : "greedy"}
      draggableCursor={cursor}
      onClick={onMapClick ? (event) => onMapClick(event.detail.latLng) : undefined}
      className="absolute inset-0 z-0"
      style={{ background: "var(--secondary)" }}
    >
      <TiltSync tilted={tilted} />
      {children}
    </Map>
  );
}

/** Tilts the camera for the 3D buildings view and flattens it again. */
function TiltSync({ tilted }: { tilted: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (tilted) {
      if ((map.getZoom() ?? 0) < 17) map.setZoom(17);
      map.setTilt(60);
      map.setHeading(25);
    } else {
      map.setTilt(0);
      map.setHeading(0);
    }
  }, [map, tilted]);
  return null;
}

/* ---------------- imperative helpers ---------------- */

export function fitTo(map: google.maps.Map, points: LatLngLiteral[], padding = 64, maxZoom = 16) {
  if (points.length === 0) return;
  if (points.length === 1) {
    map.panTo(points[0]);
    map.setZoom(Math.max(map.getZoom() ?? 0, 15));
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  for (const p of points) bounds.extend(p);
  map.fitBounds(bounds, padding);
  google.maps.event.addListenerOnce(map, "idle", () => {
    if ((map.getZoom() ?? 0) > maxZoom) map.setZoom(maxZoom);
  });
}

/** Fits the view to `points` the first time there are any. */
export function FitOnce({ points }: { points: LatLngLiteral[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!map || done.current || points.length === 0) return;
    done.current = true;
    fitTo(map, points);
  }, [map, points]);
  return null;
}

/** Pans to `target` (and zooms in) whenever `targetKey` changes. */
export function FlyTo({ target, targetKey, zoom = 16 }: { target: LatLngLiteral | null; targetKey: string | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target || !targetKey) return;
    map.panTo(target);
    if ((map.getZoom() ?? 0) < zoom) map.setZoom(zoom);
    // only re-fly when the selection itself changes, not on every data poll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, targetKey]);
  return null;
}

/** Google's live traffic overlay (green / orange / red roads). */
export function TrafficLayer({ visible }: { visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !visible) return;
    const layer = new google.maps.TrafficLayer({ autoRefresh: true });
    layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, visible]);
  return null;
}

/** Bus / rail lines and stations. */
export function TransitLayer({ visible }: { visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !visible) return;
    const layer = new google.maps.TransitLayer();
    layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, visible]);
  return null;
}

/** The "you are here" dot after the locate button was used. */
export function MeMarker({ position }: { position: LatLngLiteral | null }) {
  if (!position) return null;
  return (
    <AdvancedMarker position={position} title="Your location" anchorLeft="-50%" anchorTop="-50%" zIndex={2000}>
      <div className="cp-me" />
    </AdvancedMarker>
  );
}

/** Google Maps link with turn-by-turn directions to a point. */
export function directionsUrl({ lat, lng }: LatLngLiteral): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/* ---------------- toast ---------------- */

export function useMapToast() {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);
  const show = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  const node = toast ? (
    <div
      key={toast.id}
      role="status"
      className="cp-toast pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-teal-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg"
    >
      {toast.text}
    </div>
  ) : null;
  return { show, node };
}

/* ---------------- control rail ---------------- */

export function RailButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  compact = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-full border shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        compact ? "size-9" : "size-11",
        active
          ? "border-transparent bg-teal-500 text-white hover:bg-teal-600"
          : "border-border bg-card text-foreground hover:text-teal-600 dark:hover:text-brand",
      )}
    >
      <Icon className={compact ? "size-4" : "size-[18px]"} />
    </button>
  );
}

/**
 * Round buttons on the right edge, as in the driver app: layers, quick
 * satellite switch, 3D buildings, locate me, fit, zoom. `extra` adds
 * role-specific buttons on top.
 */
export function MapRail({
  mapType,
  onMapType,
  tilted,
  onTilted,
  onLayers,
  layersOpen,
  onFit,
  onMe,
  compact = false,
  extra,
  fitLabel = "Fit all parking lots",
  className,
}: {
  mapType: MapTypeId;
  onMapType: (type: MapTypeId) => void;
  tilted: boolean;
  onTilted: (tilted: boolean) => void;
  onLayers: () => void;
  layersOpen: boolean;
  onFit: () => void;
  onMe: (position: LatLngLiteral) => void;
  compact?: boolean;
  extra?: ReactNode;
  fitLabel?: string;
  className?: string;
}) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const satellite = mapType === "satellite" || mapType === "hybrid";

  function locate() {
    if (!navigator.geolocation || !map) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const here = { lat: coords.latitude, lng: coords.longitude };
        onMe(here);
        map.panTo(here);
        if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className={cn("absolute right-3 z-10 flex flex-col gap-2.5", compact ? "bottom-7" : "bottom-9", className)}>
      {extra}
      <RailButton label="Map layers" icon={Layers} active={layersOpen} compact={compact} onClick={onLayers} />
      <RailButton
        label={satellite ? "Switch to map view" : "Switch to satellite view"}
        icon={satellite ? MapIcon : Satellite}
        active={satellite}
        compact={compact}
        onClick={() => onMapType(satellite ? "roadmap" : "hybrid")}
      />
      <RailButton label="3D buildings view" icon={Box} active={tilted} compact={compact} onClick={() => onTilted(!tilted)} />
      <RailButton label="Show my location" icon={LocateFixed} active={locating} compact={compact} onClick={locate} />
      <RailButton label={fitLabel} icon={Maximize} compact={compact} onClick={onFit} />
      {!compact && map && (
        // phones pinch to zoom, so the +/- pair only shows on wider screens
        <div className="hidden flex-col overflow-hidden rounded-full border border-border bg-card shadow-md sm:flex">
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => map.setZoom((map.getZoom() ?? 14) + 1)}
            className="flex size-11 items-center justify-center hover:text-teal-600 dark:hover:text-brand"
          >
            <Plus className="size-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => map.setZoom((map.getZoom() ?? 14) - 1)}
            className="flex size-11 items-center justify-center border-t border-border hover:text-teal-600 dark:hover:text-brand"
          >
            <Minus className="size-[18px]" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- layers panel ---------------- */

const MAP_TYPES: { id: MapTypeId; label: string; icon: LucideIcon }[] = [
  { id: "roadmap", label: "Default", icon: MapIcon },
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "hybrid", label: "Hybrid", icon: Layers },
  { id: "terrain", label: "Terrain", icon: Mountain },
];

export interface LayerToggle {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  value: boolean;
  onChange: (value: boolean) => void;
}

/**
 * "Map layers" sheet: map type, the role's overlay switches, optional extra
 * settings and a pin legend. Bottom sheet on phones, a floating card on wider
 * screens.
 */
export function LayersPanel({
  open,
  onClose,
  title = "Map layers",
  mapType,
  onMapType,
  toggles,
  extra,
  legend,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  mapType: MapTypeId;
  onMapType: (type: MapTypeId) => void;
  toggles: LayerToggle[];
  extra?: ReactNode;
  legend?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close map layers"
        onClick={onClose}
        className="absolute inset-0 z-20 cursor-default bg-slate-900/25 sm:bg-transparent"
      />
      <section
        role="dialog"
        aria-label={title}
        className={cn(
          "absolute z-30 flex max-h-[calc(100%-1.5rem)] flex-col overflow-hidden border border-border bg-card shadow-2xl",
          "inset-x-0 bottom-0 rounded-t-3xl",
          "sm:inset-x-auto sm:bottom-auto sm:right-[4.25rem] sm:top-3 sm:w-[340px] sm:rounded-2xl",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <h2 className="text-[17px] font-extrabold tracking-tight">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5">
          <div className="mt-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Map type</div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {MAP_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                aria-pressed={mapType === type.id}
                onClick={() => onMapType(type.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[12px] font-semibold transition-colors",
                  mapType === type.id
                    ? "border-transparent bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow"
                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <type.icon className="size-[18px]" />
                {type.label}
              </button>
            ))}
          </div>

          <div className="mt-5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Show on the map</div>
          <ul className="mt-1 divide-y divide-border">
            {toggles.map((toggle) => (
              <li key={toggle.key} className="flex items-center gap-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/12 text-teal-600 dark:text-brand">
                  <toggle.icon className="size-[18px]" />
                </span>
                <label htmlFor={`layer-${toggle.key}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block text-sm font-bold">{toggle.label}</span>
                  <span className="block text-xs text-muted-foreground">{toggle.description}</span>
                </label>
                <Switch id={`layer-${toggle.key}`} checked={toggle.value} onCheckedChange={toggle.onChange} />
              </li>
            ))}
          </ul>

          {extra}

          {legend && (
            <>
              <div className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Legend</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">{legend}</div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/* ---------------- shared view state ---------------- */

/** Map type, 3D tilt, layers panel and "me" state that every role map has. */
export function useMapView(initialType: MapTypeId = "roadmap") {
  const [mapType, setMapTypeState] = useState<MapTypeId>(initialType);
  const [tilted, setTiltedState] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [me, setMe] = useState<LatLngLiteral | null>(null);
  const { show, node } = useMapToast();

  const setMapType = useCallback(
    (type: MapTypeId) => {
      setMapTypeState(type);
      show(type === "roadmap" ? "Map view on" : `${MAP_TYPES.find((t) => t.id === type)?.label} view on`);
    },
    [show],
  );
  const setTilted = useCallback(
    (value: boolean) => {
      setTiltedState(value);
      show(value ? "3D buildings on" : "Flat view on");
    },
    [show],
  );

  return { mapType, setMapType, tilted, setTilted, layersOpen, setLayersOpen, me, setMe, toast: node, showToast: show };
}

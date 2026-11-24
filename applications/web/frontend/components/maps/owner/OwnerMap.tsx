"use client";

/*
 * Parking-owner map (Google Maps). Built around the owner's own business:
 *  - only their lots are pins, labelled by name and coloured by live occupancy
 *    or approval state (pending / suspended);
 *  - an availability glow under each lot;
 *  - a catchment ring (500 m – 2 km) showing where their drivers come from;
 *  - nearby competitor lots as price tags, to compare price and free space;
 *  - Street View at a lot, to check the entrance and signage drivers see.
 * Without a Google key it falls back to the OpenStreetMap LiveMap.
 */

import { useMemo, useState } from "react";
import { AdvancedMarker, Circle, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Footprints, Navigation, Sparkles, Store, TrafficCone, Type, X } from "lucide-react";
import { occupancyPct, spaceStatus, stressOf, type Stress } from "@/lib/insights/metrics";
import { DHAKA_CENTER } from "@/lib/spaces/use-live-spaces";
import type { NearbySpace, ParkingSpace } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";
import LiveMap from "../LiveMap";
import { CATCHMENT_OPTIONS, catchmentLabel, type CatchmentM } from "./catchment";
import {
  FitOnce,
  FlyTo,
  GoogleBaseMap,
  GoogleMapsGate,
  LayersPanel,
  LegendDot,
  MapRail,
  MeMarker,
  RailButton,
  TrafficLayer,
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

const at = (s: { latitude: number; longitude: number }): LatLngLiteral => ({ lat: s.latitude, lng: s.longitude });

type PinTone = "optimal" | "moderate" | "critical" | "muted" | "pending";

function ownTone(space: ParkingSpace, live: NearbySpace | undefined): PinTone {
  const status = spaceStatus(space);
  if (status === "pending") return "pending";
  if (status === "inactive" || !live) return "muted";
  return stressOf(occupancyPct(live)).toLowerCase() as PinTone;
}

function OwnPin({
  space,
  live,
  selected,
  showLabel,
}: {
  space: ParkingSpace;
  live: NearbySpace | undefined;
  selected: boolean;
  showLabel: boolean;
}) {
  const tone = ownTone(space, live);
  return (
    <div className={cn("cp-pin", `cp-pin--${tone}`, selected && "cp-pin--selected")}>
      <svg viewBox="0 0 36 46" aria-hidden="true">
        <path d={PIN_PATH} />
      </svg>
      <span className="cp-pin__value">{tone === "pending" ? "P" : live ? live.available_slots : "–"}</span>
      {live?.is_stale && <span className="cp-pin__stale" />}
      {showLabel && <span className="cp-pin__label">{space.name}</span>}
    </div>
  );
}

function CompetitorTag({ space, selected }: { space: NearbySpace; selected: boolean }) {
  const color = STRESS_COLOR[stressOf(occupancyPct(space))];
  return (
    <div className={cn("cp-tag", selected && "cp-tag--selected")} style={{ ["--tag" as string]: color }}>
      <span className="cp-tag__dot" />
      {space.base_rate_unit != null ? `৳${space.base_rate_unit / 100}` : "—"} · {space.available_slots} free
    </div>
  );
}

/** Opens Google Street View at the lot (or says there is none nearby). */
function StreetViewButton({ target, onResult }: { target: LatLngLiteral | null; onResult: (text: string) => void }) {
  const map = useMap();
  const streetView = useMapsLibrary("streetView");
  return (
    <RailButton
      label={target ? "Street View at this lot" : "Select a lot to open Street View"}
      icon={Footprints}
      disabled={!target || !map || !streetView}
      onClick={() => {
        if (!target || !map || !streetView) return;
        new streetView.StreetViewService()
          .getPanorama({ location: target, radius: 150 })
          .then(({ data }) => {
            const pano = map.getStreetView();
            pano.setOptions({ addressControl: false, fullscreenControl: false, enableCloseButton: true, motionTracking: false });
            pano.setPosition(data.location?.latLng ?? target);
            pano.setVisible(true);
          })
          .catch(() => onResult("No Street View imagery near this lot"));
      }}
    />
  );
}

export interface OwnerMapProps {
  spaces: ParkingSpace[];
  live: Record<string, NearbySpace>;
  /** other owners' active lots near this owner's lots */
  competitors: NearbySpace[];
  focusId: string | null;
  onSelect: (spaceId: string | null) => void;
  catchment: CatchmentM;
  onCatchment: (m: CatchmentM) => void;
  className?: string;
}

function OwnerGoogleMap({
  spaces,
  live,
  competitors,
  focusId,
  onSelect,
  catchment,
  onCatchment,
}: OwnerMapProps) {
  const view = useMapView("roadmap");
  const map = useMap();
  const [glow, setGlow] = useState(true);
  const [labels, setLabels] = useState(true);
  const [showCompetitors, setShowCompetitors] = useState(true);
  const [traffic, setTraffic] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);

  const located = useMemo(
    () => spaces.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)),
    [spaces],
  );
  const ownPoints = useMemo(() => located.map(at), [located]);
  const focused = located.find((s) => s.id === focusId) ?? null;
  const peek = competitors.find((c) => c.id === peekId) ?? null;
  const ringCenters = focused ? [focused] : located;

  return (
    <>
      <GoogleBaseMap
        mapType={view.mapType}
        tilted={view.tilted}
        defaultCenter={{ lat: DHAKA_CENTER[0], lng: DHAKA_CENTER[1] }}
        defaultZoom={13}
        onMapClick={() => setPeekId(null)}
      >
        {/* an owner without lots yet sees the city's lots instead */}
        <FitOnce points={ownPoints.length ? ownPoints : competitors.map(at)} />
        <FlyTo target={focused ? at(focused) : null} targetKey={focusId} />
        <TrafficLayer visible={traffic} />

        {catchment > 0 &&
          ringCenters.map((s) => (
            <Circle
              key={`ring-${s.id}-${catchment}`}
              center={at(s)}
              radius={catchment}
              clickable={false}
              strokeColor="#18d6c0"
              strokeOpacity={0.9}
              strokeWeight={2}
              fillColor="#18d6c0"
              fillOpacity={0.06}
            />
          ))}

        {glow &&
          located.map((s) => {
            const lot = live[s.id];
            if (!lot) return null;
            const color = STRESS_COLOR[stressOf(occupancyPct(lot))];
            return (
              <Circle
                key={`glow-${s.id}`}
                center={at(s)}
                radius={Math.min(70 + s.total_capacity * 2, 220)}
                clickable={false}
                strokeColor={color}
                strokeOpacity={0.35}
                strokeWeight={1}
                fillColor={color}
                fillOpacity={0.2}
              />
            );
          })}

        {showCompetitors &&
          competitors.map((c) => (
            <AdvancedMarker
              key={`c-${c.id}`}
              position={at(c)}
              title={`${c.name} (competitor)`}
              zIndex={c.id === peekId ? 900 : 1}
              onClick={() => setPeekId(c.id)}
            >
              <CompetitorTag space={c} selected={c.id === peekId} />
            </AdvancedMarker>
          ))}

        {located.map((s) => (
          <AdvancedMarker
            key={s.id}
            position={at(s)}
            title={s.name}
            zIndex={s.id === focusId ? 1000 : 500}
            onClick={() => {
              setPeekId(null);
              onSelect(s.id);
            }}
          >
            <OwnPin space={s} live={live[s.id]} selected={s.id === focusId} showLabel={labels} />
          </AdvancedMarker>
        ))}

        <MeMarker position={view.me} />
      </GoogleBaseMap>

      {/* competitor peek card */}
      {peek && (
        <div className="absolute left-3 top-3 z-10 w-64 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/15 text-slate-600 dark:text-slate-300">
              <Store className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Nearby competitor</div>
              <div className="truncate text-sm font-extrabold">{peek.name}</div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPeekId(null)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
            {[
              ["Rate", peek.base_rate_unit != null ? `৳${peek.base_rate_unit / 100}/h` : "—"],
              ["Free", String(peek.available_slots)],
              ["Full", `${occupancyPct(peek)}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted/70 py-1.5">
                <div className="text-sm font-extrabold">{value}</div>
                <div className="text-[10.5px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MapRail
        mapType={view.mapType}
        onMapType={view.setMapType}
        tilted={view.tilted}
        onTilted={view.setTilted}
        layersOpen={view.layersOpen}
        onLayers={() => view.setLayersOpen(!view.layersOpen)}
        onFit={() => map && fitTo(map, ownPoints.length ? ownPoints : [{ lat: DHAKA_CENTER[0], lng: DHAKA_CENTER[1] }])}
        onMe={view.setMe}
        extra={
          <>
            <StreetViewButton target={focused ? at(focused) : null} onResult={view.showToast} />
            {focused && (
              <a
                href={directionsUrl(at(focused))}
                target="_blank"
                rel="noreferrer"
                aria-label="Directions in Google Maps"
                title="Directions in Google Maps"
                className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md hover:text-teal-600 dark:hover:text-brand"
              >
                <Navigation className="size-[18px]" />
              </a>
            )}
          </>
        }
      />

      <LayersPanel
        open={view.layersOpen}
        onClose={() => view.setLayersOpen(false)}
        title="Owner map layers"
        mapType={view.mapType}
        onMapType={view.setMapType}
        toggles={[
          { key: "glow", label: "Availability glow", description: "Coloured halo under each of your lots", icon: Sparkles, value: glow, onChange: setGlow },
          { key: "labels", label: "Lot names", description: "Your lot's name under its pin", icon: Type, value: labels, onChange: setLabels },
          { key: "competitors", label: "Nearby competitors", description: "Other lots with their price and free space", icon: Store, value: showCompetitors, onChange: setShowCompetitors },
          { key: "traffic", label: "Live traffic", description: "Road congestion around your lots", icon: TrafficCone, value: traffic, onChange: setTraffic },
        ]}
        extra={
          <div className="mt-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Catchment ring</div>
            <p className="mt-1 text-xs text-muted-foreground">How far drivers usually come from. Competitors inside it are compared in the lot panel.</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {CATCHMENT_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={catchment === m}
                  onClick={() => onCatchment(m)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[12.5px] font-semibold transition-colors",
                    catchment === m ? "border-teal-500 bg-teal-500/12 text-teal-700 dark:text-brand" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {catchmentLabel(m)}
                </button>
              ))}
            </div>
          </div>
        }
        legend={
          <>
            <LegendDot color="#12c2a9" label="Plenty free" />
            <LegendDot color="#f59e0b" label="Filling up" />
            <LegendDot color="#ef4444" label="Nearly full" />
            <LegendDot color="#8b6cff" label="Pending approval" />
            <LegendDot color="#94a3b8" label="No live data / suspended" />
            <LegendDot color="#475569" label="Competitor (price tag)" />
          </>
        }
      />

      {view.toast}
    </>
  );
}

/** Parking-owner map: Google Maps when a key is set, else OpenStreetMap. */
export default function OwnerMap(props: OwnerMapProps) {
  const liveOwn = useMemo(() => Object.values(props.live), [props.live]);
  return (
    <div className={cn("relative overflow-hidden", props.className)}>
      <GoogleMapsGate
        fallback={
          <LiveMap
            spaces={liveOwn}
            focusId={props.focusId}
            onSelect={(id) => props.onSelect(id)}
            className="absolute inset-0"
          />
        }
      >
        <OwnerGoogleMap {...props} />
      </GoogleMapsGate>
    </div>
  );
}

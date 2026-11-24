"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { AdvancedMarker, useMap as useGoogleMap } from "@vis.gl/react-google-maps";
import { TrafficCone } from "lucide-react";
import { DHAKA_CENTER } from "@/lib/spaces/use-live-spaces";
import { cn } from "@/lib/utils";
import {
  GoogleBaseMap,
  GoogleMapsGate,
  LayersPanel,
  MapRail,
  MeMarker,
  TrafficLayer,
  useMapView,
} from "./google/toolkit";
import { ThemedTiles } from "./tiles";

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface PickerProps {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}

const DHAKA = { lat: DHAKA_CENTER[0], lng: DHAKA_CENTER[1] };

const PIN_STYLE =
  "width:30px;height:30px;border-radius:9999px;background:#18d6c0;border:3px solid #fff;box-shadow:0 0 0 4px rgba(24,214,192,.35),0 6px 16px rgba(0,0,0,.35)";

/* ---------------- Google Maps picker ---------------- */

/** Re-centers when the value changes from outside (typed coordinates, GPS, search). */
function GoogleFollowValue({ value }: { value: PickedLocation | null }) {
  const map = useGoogleMap();
  const lat = value?.lat;
  const lng = value?.lng;
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined) return;
    const inView = map.getBounds()?.contains({ lat, lng }) ?? false;
    if (!inView || (map.getZoom() ?? 0) < 14) {
      map.panTo({ lat, lng });
      map.setZoom(Math.max(map.getZoom() ?? 0, 17));
    }
  }, [map, lat, lng]);
  return null;
}

/**
 * Click (or drag the pin) to choose the lot's coordinates. Satellite and 3D
 * views help put the pin on the actual gate, not just the street.
 */
function GooglePicker({ value, onChange }: PickerProps) {
  const view = useMapView("roadmap");
  const map = useGoogleMap();
  const [traffic, setTraffic] = useState(false);

  return (
    <>
      <GoogleBaseMap
        mapType={view.mapType}
        tilted={view.tilted}
        compact
        cursor="crosshair"
        defaultCenter={value ?? DHAKA}
        defaultZoom={value ? 17 : 12}
        onMapClick={(latLng) => latLng && onChange(latLng)}
      >
        <GoogleFollowValue value={value} />
        <TrafficLayer visible={traffic} />
        {value && (
          <AdvancedMarker
            position={value}
            draggable
            title="Parking lot location (drag to adjust)"
            anchorLeft="-50%"
            anchorTop="-50%"
            onDragEnd={(event) => {
              if (event.latLng) onChange({ lat: event.latLng.lat(), lng: event.latLng.lng() });
            }}
          >
            <div className="size-[30px] rounded-full border-[3px] border-white bg-[#18d6c0] shadow-[0_0_0_4px_rgba(24,214,192,.35),0_6px_16px_rgba(0,0,0,.35)]" />
          </AdvancedMarker>
        )}
        <MeMarker position={view.me} />
      </GoogleBaseMap>

      <MapRail
        compact
        mapType={view.mapType}
        onMapType={view.setMapType}
        tilted={view.tilted}
        onTilted={view.setTilted}
        layersOpen={view.layersOpen}
        onLayers={() => view.setLayersOpen(!view.layersOpen)}
        onMe={view.setMe}
        fitLabel={value ? "Show the pin" : "Show Dhaka"}
        onFit={() => {
          if (!map) return;
          map.panTo(value ?? DHAKA);
          map.setZoom(value ? 17 : 12);
        }}
        className="bottom-3 right-2 gap-2"
      />

      <LayersPanel
        open={view.layersOpen}
        onClose={() => view.setLayersOpen(false)}
        title="Map view"
        mapType={view.mapType}
        onMapType={view.setMapType}
        toggles={[
          {
            key: "picker-traffic",
            label: "Live traffic",
            description: "See how busy the roads to your entrance are",
            icon: TrafficCone,
            value: traffic,
            onChange: setTraffic,
          },
        ]}
      />

      {view.toast}
    </>
  );
}

/* ---------------- OpenStreetMap fallback ---------------- */

const PIN = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<div style="${PIN_STYLE}"></div>`,
});

function ClickToPick({ onPick }: { onPick: (location: PickedLocation) => void }) {
  useMapEvents({
    click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
}

/** Re-centers when the value changes from outside (typed coordinates, GPS, search),
 *  zooming in from a city-wide view so the pin can be fine-tuned. */
function FollowValue({ value }: { value: PickedLocation | null }) {
  const map = useMap();
  const lat = value?.lat;
  const lng = value?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    if (!map.getBounds().contains([lat, lng]) || map.getZoom() < 14) {
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    }
  }, [map, lat, lng]);
  return null;
}

function OsmPicker({ value, onChange }: PickerProps) {
  return (
    <div className="absolute inset-0 isolate z-0">
      <MapContainer
        center={value ? [value.lat, value.lng] : DHAKA_CENTER}
        zoom={value ? 16 : 12}
        style={{ height: "100%", width: "100%", background: "var(--secondary)", cursor: "crosshair" }}
      >
        <ThemedTiles />
        <ClickToPick onPick={onChange} />
        <FollowValue value={value} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={PIN}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = (event.target as L.Marker).getLatLng();
                onChange({ lat, lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

/** Click (or drag the pin) to choose a lot's coordinates. Google Maps when a
 *  key is set, else OpenStreetMap. */
export default function LocationPicker({
  value,
  onChange,
  className,
}: PickerProps & { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border", className)}>
      <GoogleMapsGate fallback={<OsmPicker value={value} onChange={onChange} />}>
        <GooglePicker value={value} onChange={onChange} />
      </GoogleMapsGate>
    </div>
  );
}

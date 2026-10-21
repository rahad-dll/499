"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { DHAKA_CENTER } from "@/lib/spaces/use-live-spaces";
import { cn } from "@/lib/utils";
import { ThemedTiles } from "./tiles";

const PIN = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: '<div style="width:30px;height:30px;border-radius:9999px;background:#18d6c0;border:3px solid #fff;box-shadow:0 0 0 4px rgba(24,214,192,.35),0 6px 16px rgba(0,0,0,.35)"></div>',
});

export interface PickedLocation {
  lat: number;
  lng: number;
}

function ClickToPick({ onPick }: { onPick: (location: PickedLocation) => void }) {
  useMapEvents({
    click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
}

/** Re-centers when the value changes from outside (typed coordinates, GPS, search). */
function FollowValue({ value }: { value: PickedLocation | null }) {
  const map = useMap();
  const lat = value?.lat;
  const lng = value?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [map, lat, lng]);
  return null;
}

/** Click (or drag the pin) to choose a lot's coordinates. */
export default function LocationPicker({
  value,
  onChange,
  className,
}: {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  className?: string;
}) {
  return (
    <div className={cn("isolate z-0 overflow-hidden rounded-xl border border-border", className)}>
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

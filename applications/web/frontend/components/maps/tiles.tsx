"use client";

import "./map.css";
import { TileLayer } from "react-leaflet";
import { useDarkTheme } from "./use-dark-theme";

// Standard OpenStreetMap tiles: free, no API key, attribution required.
// Usage policy: https://operations.osmfoundation.org/policies/tiles/
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Base map tiles; dark mode is a CSS filter (`.cp-map-tiles-dark` in globals.css). */
export function ThemedTiles() {
  const dark = useDarkTheme();
  return (
    <TileLayer
      key={dark ? "dark" : "light"}
      url={TILE_URL}
      attribution={ATTRIBUTION}
      maxZoom={19}
      className={dark ? "cp-map-tiles-dark" : undefined}
    />
  );
}

/**
 * Address lookup for the lot location, backed by OpenStreetMap's Nominatim
 * (https://nominatim.org/release-docs/latest/api/Search/). Its usage policy
 * forbids search-as-you-type, so callers look up a finished address (on blur
 * or Enter), at most about once a second.
 */

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
}

/** "Road 5, Gulshan 1, Gulshan, Dhaka, Dhaka Metropolitan, …" → its first four parts. */
const shortLabel = (displayName: string) =>
  displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");

export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "4",
    countrycodes: "bd",
    "accept-language": "en,bn",
  });
  const response = await fetch(`${NOMINATIM_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Address lookup failed (${response.status})`);
  const places = (await response.json()) as NominatimPlace[];

  return places.flatMap((place) => {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{ label: shortLabel(place.display_name), lat, lng }];
  });
}

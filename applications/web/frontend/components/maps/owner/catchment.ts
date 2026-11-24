/** Catchment ring radii (metres) on the owner map; 0 hides the ring. */
export const CATCHMENT_OPTIONS = [0, 500, 1000, 2000] as const;
export type CatchmentM = (typeof CATCHMENT_OPTIONS)[number];

export function catchmentLabel(m: number): string {
  return m === 0 ? "Off" : m >= 1000 ? `${m / 1000} km` : `${m} m`;
}

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(h));
}

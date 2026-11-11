"use client";

import { useQuery } from "@/lib/api/use-query";
import { mergeSpaces } from "@/lib/insights/metrics";
import { parkingSpacesRepository } from "./repository";
import type { NearbySpace } from "./types";

export type LatLng = [number, number];

export const DHAKA_CENTER: LatLng = [23.7937, 90.4066];

/** GET /spaces/nearby only searches ~5 km around a point, so the city is
 *  covered by querying these overlapping points and merging the results. */
export const DHAKA_SCAN_POINTS: LatLng[] = [
  [23.8759, 90.3795], // Uttara
  [23.8223, 90.3654], // Mirpur
  [23.7937, 90.4066], // Gulshan / Banani
  [23.7461, 90.3742], // Dhanmondi
  [23.733, 90.4172], // Motijheel / Old Dhaka
];

/**
 * A point that found no lots costs the API as much as one that did, so it is
 * re-checked every 5 minutes instead of on every poll. New lots there appear
 * within that time.
 */
const EMPTY_RECHECK_MS = 5 * 60_000;

/** When each point last came back empty, shared by every scan in the tab. */
const emptySince = new Map<string, number>();

const NO_SPACES: NearbySpace[] = [];

const pointKey = (point: LatLng) => point.join(",");

async function fetchMerged(points: LatLng[]): Promise<NearbySpace[]> {
  const now = Date.now();
  const due = points.filter((p) => now - (emptySince.get(pointKey(p)) ?? -Infinity) >= EMPTY_RECHECK_MS);
  if (due.length === 0) return [];

  const results = await Promise.allSettled(
    due.map(([lat, lng]) => parkingSpacesRepository.nearby(lat, lng)),
  );
  const lists: NearbySpace[][] = [];
  results.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    if (result.value.length === 0) emptySince.set(pointKey(due[i]), now);
    else emptySince.delete(pointKey(due[i]));
    lists.push(result.value);
  });
  if (lists.length === 0) {
    const failure = results.find((r) => r.status === "rejected");
    throw failure?.reason instanceof Error ? failure.reason : new Error("Could not load live occupancy");
  }
  // points skipped this time were empty, so they add nothing
  return mergeSpaces(lists);
}

/**
 * Live AI occupancy for every active lot around the given points, re-polled
 * every `intervalMs` (default 30 s).
 *
 * The result lives in the shared query store: every page that shows the same
 * points observes one poller, so moving between portal pages does not refetch,
 * and the poller pauses while the tab is hidden.
 */
export function useLiveSpaces({
  points = DHAKA_SCAN_POINTS,
  intervalMs = 30_000,
  enabled = true,
}: { points?: LatLng[]; intervalMs?: number; enabled?: boolean } = {}) {
  const pointsKey = points.map(pointKey).join("|");
  const query = useQuery(
    enabled && pointsKey ? `live:${pointsKey}` : null,
    () => fetchMerged(points),
    { staleMs: intervalMs, pollMs: intervalMs },
  );

  return {
    spaces: query.data ?? NO_SPACES,
    loading: query.loading,
    error: query.error,
    /** epoch ms of the last successful refresh */
    updatedAt: query.updatedAt || null,
    refresh: query.reload,
  };
}

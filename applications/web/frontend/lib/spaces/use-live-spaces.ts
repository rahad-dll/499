"use client";

import { useCallback, useEffect, useState } from "react";
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

interface LiveSpacesState {
  spaces: NearbySpace[];
  loading: boolean;
  error: string | null;
  /** epoch ms of the last successful refresh */
  updatedAt: number | null;
}

async function fetchMerged(points: LatLng[], signal: AbortSignal): Promise<NearbySpace[]> {
  const results = await Promise.allSettled(
    points.map(([lat, lng]) => parkingSpacesRepository.nearby(lat, lng, signal)),
  );
  const lists = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (lists.length === 0) {
    const failure = results.find((r) => r.status === "rejected");
    throw failure?.reason instanceof Error ? failure.reason : new Error("Could not load live occupancy");
  }
  return mergeSpaces(lists);
}

/**
 * Live AI occupancy for every active lot around the given points,
 * re-polled every `intervalMs` (default 30 s).
 */
export function useLiveSpaces({
  points = DHAKA_SCAN_POINTS,
  intervalMs = 30_000,
  enabled = true,
}: { points?: LatLng[]; intervalMs?: number; enabled?: boolean } = {}) {
  const [state, setState] = useState<LiveSpacesState>({
    spaces: [],
    loading: true,
    error: null,
    updatedAt: null,
  });
  const [tick, setTick] = useState(0);
  const pointsKey = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const scan = pointsKey
      .split("|")
      .filter(Boolean)
      .map((p) => p.split(",").map(Number) as LatLng);

    fetchMerged(scan, controller.signal)
      .then((spaces) => {
        setState({ spaces, loading: false, error: null, updatedAt: Date.now() });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // keep the last good data on a failed poll
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load live occupancy",
        }));
      });

    const timer = setTimeout(() => setTick((t) => t + 1), intervalMs);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [pointsKey, intervalMs, enabled, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refresh };
}

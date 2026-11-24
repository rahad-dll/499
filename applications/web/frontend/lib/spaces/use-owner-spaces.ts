"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { primeQuery } from "@/lib/api/query-store";
import { useQuery } from "@/lib/api/use-query";
import { parkingSpacesRepository, spaceKeys } from "./repository";
import type { NearbySpace, ParkingSpace } from "./types";
import { useLiveSpaces, type LatLng } from "./use-live-spaces";

const NO_SPACES: ParkingSpace[] = [];

/** Lots this close to a scan point share its query (GET /spaces/nearby covers ~5 km). */
const SHARED_SCAN_KM = 3;

async function loadOwnerSpaces(): Promise<ParkingSpace[]> {
  const requestedAt = Date.now();
  const spaces = await parkingSpacesRepository.list();
  // the list carries each lot's details, so a lot's settings open without GET /spaces/:id
  for (const space of spaces) primeQuery(spaceKeys.one(space.id), space, requestedAt);
  return spaces;
}

/** The signed-in owner's lots from GET /spaces, shared by every owner page. */
export function useOwnerSpaces() {
  const { user, loading: authLoading } = useAuth();
  const enabled = !authLoading && user?.role === "owner";
  const query = useQuery(enabled ? spaceKeys.mine : null, loadOwnerSpaces);
  return {
    spaces: query.data ?? NO_SPACES,
    loading: query.loading,
    error: query.error,
    reload: query.reload,
  };
}

/** Great-circle distance in km. */
function distanceKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(a));
}

/** One scan point per group of nearby lots instead of one per lot. */
function scanPointsFor(spaces: ParkingSpace[]): LatLng[] {
  const points: LatLng[] = [];
  for (const space of spaces) {
    const here: LatLng = [space.latitude, space.longitude];
    if (!Number.isFinite(here[0]) || !Number.isFinite(here[1])) continue;
    if (!points.some((point) => distanceKm(point, here) <= SHARED_SCAN_KM)) points.push(here);
  }
  return points;
}

/**
 * Live AI occupancy for the owner's lots, keyed by lot id. GET /spaces/nearby is
 * queried near the owner's lots; only active lots with slots appear.
 */
export function useLotOccupancy(spaces: ParkingSpace[]) {
  const points = useMemo(() => scanPointsFor(spaces), [spaces]);

  const live = useLiveSpaces({ points, enabled: points.length > 0 });

  const byId = useMemo(() => {
    const ids = new Set(spaces.map((s) => s.id));
    const map: Record<string, NearbySpace> = {};
    for (const space of live.spaces) if (ids.has(space.id)) map[space.id] = space;
    return map;
  }, [live.spaces, spaces]);

  return {
    byId,
    /** every active lot around the owner's lots, theirs and other owners' */
    nearby: live.spaces,
    loading: points.length > 0 && live.loading,
    error: live.error,
    updatedAt: live.updatedAt,
    nextRefreshAt: live.nextRefreshAt,
    refresh: live.refresh,
  };
}

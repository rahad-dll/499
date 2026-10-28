"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ParkingSpaceError, parkingSpacesRepository } from "./repository";
import type { NearbySpace, ParkingSpace } from "./types";
import { useLiveSpaces, type LatLng } from "./use-live-spaces";

/** The signed-in owner's lots from GET /spaces. */
export function useOwnerSpaces() {
  const { user, loading: authLoading } = useAuth();
  const enabled = !authLoading && user?.role === "owner";
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    parkingSpacesRepository
      .list()
      .then((data) => {
        if (!active) return;
        setSpaces(data);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ParkingSpaceError ? caught.message : "Could not load parking lots");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { spaces, loading, error, reload };
}

/**
 * Live AI occupancy for the owner's lots, keyed by lot id. GET /spaces/nearby is
 * queried at each lot's own coordinates; only active lots with slots appear.
 */
export function useLotOccupancy(spaces: ParkingSpace[]) {
  const points = useMemo(() => {
    const unique = new Map<string, LatLng>();
    for (const space of spaces) {
      const lat = Number(space.latitude);
      const lng = Number(space.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      unique.set(`${lat.toFixed(3)},${lng.toFixed(3)}`, [lat, lng]);
    }
    return [...unique.values()];
  }, [spaces]);

  const live = useLiveSpaces({ points, enabled: points.length > 0 });

  const byId = useMemo(() => {
    const ids = new Set(spaces.map((s) => s.id));
    const map: Record<string, NearbySpace> = {};
    for (const space of live.spaces) if (ids.has(space.id)) map[space.id] = space;
    return map;
  }, [live.spaces, spaces]);

  return {
    byId,
    loading: points.length > 0 && live.loading,
    error: live.error,
    updatedAt: live.updatedAt,
  };
}

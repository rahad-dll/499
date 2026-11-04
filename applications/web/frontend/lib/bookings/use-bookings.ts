"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BookingError, bookingsRepository } from "./repository";
import type { Booking } from "./types";

/** Bookings visible to the signed-in user (GET /bookings). */
export function useBookings() {
  const { user, loading: authLoading } = useAuth();
  const enabled = !authLoading && !!user;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** epoch ms of the last successful load, for "today" calculations */
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    bookingsRepository
      .list()
      .then((data) => {
        if (!active) return;
        setBookings(data);
        setError(null);
        setLoadedAt(Date.now());
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof BookingError ? caught.message : "Could not load bookings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  /** Replace one booking in place (e.g. after cancelling it). */
  const replace = useCallback((updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }, []);

  return { bookings, loading, error, loadedAt, reload, replace };
}

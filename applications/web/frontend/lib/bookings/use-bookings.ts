"use client";

import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { setQueryData } from "@/lib/api/query-store";
import { useQuery } from "@/lib/api/use-query";
import { bookingsRepository } from "./repository";
import type { Booking } from "./types";

const BOOKINGS_KEY = "bookings:mine";
const NO_BOOKINGS: Booking[] = [];

const loadBookings = () => bookingsRepository.list();

/** Bookings visible to the signed-in user (GET /bookings), shared by every page. */
export function useBookings() {
  const { user, loading: authLoading } = useAuth();
  const enabled = !authLoading && !!user;
  const query = useQuery(enabled ? BOOKINGS_KEY : null, loadBookings);

  /** Replace one booking in place (e.g. after cancelling it). */
  const replace = useCallback((updated: Booking) => {
    setQueryData<Booking[]>(BOOKINGS_KEY, (prev = []) =>
      prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)),
    );
  }, []);

  return {
    bookings: query.data ?? NO_BOOKINGS,
    loading: query.loading,
    error: query.error,
    /** epoch ms of the last successful load, for "today" calculations */
    loadedAt: query.updatedAt || null,
    reload: query.reload,
    replace,
  };
}

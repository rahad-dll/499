import { ApiError } from "@/lib/api/client";
import { asList, authedRequest } from "@/lib/api/authed";
import type { Booking } from "./types";

export class BookingError extends Error {
  constructor(message: string, public readonly status = 0) {
    super(message);
    this.name = "BookingError";
  }
}

async function call<T>(request: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError) throw new BookingError(error.message, error.status);
    throw new BookingError(fallback);
  }
}

export const bookingsRepository = {
  /** GET /bookings: bookings visible to the signed-in user. */
  list(): Promise<Booking[]> {
    return call(
      async () => asList<Booking>(await authedRequest<unknown>("/bookings")),
      "Could not load bookings",
    );
  },

  /** GET /bookings/:id */
  get(id: string): Promise<Booking> {
    return call(
      () => authedRequest<Booking>(`/bookings/${encodeURIComponent(id)}`),
      "Could not load booking",
    );
  },

  /** PATCH /bookings/:id/cancel */
  cancel(id: string): Promise<Booking> {
    return call(
      () =>
        authedRequest<Booking>(`/bookings/${encodeURIComponent(id)}/cancel`, {
          method: "PATCH",
        }),
      "Could not cancel booking",
    );
  },
};

import { ApiError } from "@/lib/api/client";
import { asList, authedRequest } from "@/lib/api/authed";
import type { Booking, BookingPage } from "./types";

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

/** The API's largest page size for GET /bookings. */
const PAGE_LIMIT = 100;
/** Stop after this many pages so a misbehaving `total` can't loop forever. */
const MAX_PAGES = 20;

export const bookingsRepository = {
  /**
   * GET /bookings: the signed-in user's own bookings as a driver, every page
   * (`{ data, page, limit, total }`, at most 100 per page). Other roles get an
   * empty list: the API has no endpoint for bookings made at an owner's lots.
   */
  list(): Promise<Booking[]> {
    return call(async () => {
      const all: Booking[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const query = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
        const payload = await authedRequest<BookingPage | Booking[]>(`/bookings?${query}`);
        const rows = asList<Booking>(payload);
        all.push(...rows);
        const total = Array.isArray(payload) ? rows.length : payload.total;
        if (rows.length < PAGE_LIMIT || all.length >= total) break;
      }
      return all;
    }, "Could not load bookings");
  },

  /** GET /bookings/:id */
  get(id: string): Promise<Booking> {
    return call(
      () => authedRequest<Booking>(`/bookings/${encodeURIComponent(id)}`),
      "Could not load booking",
    );
  },
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "bkash" | "nagad" | "card" | "cash";

/** The payment row, embedded by GET /bookings/:id and PATCH /bookings/:id/cancel only. */
export interface BookingPayment {
  status: PaymentStatus;
  method?: PaymentMethod;
  trx_id?: string | null;
  paid_at?: string | null;
  refund_amount_unit?: number | null;
}

/**
 * A booking as GET /bookings, GET /bookings/:id and PATCH /bookings/:id/cancel
 * return it (`formatBooking` on the API). Amounts ending in `_unit` are paisa
 * (100 = ৳1); `total_price` and `price_per_hour` are BDT.
 */
export interface Booking {
  id: string;
  space_id: string;
  space_name: string;
  space_address?: string;
  slot_id: string;
  slot_label: string;
  status: BookingStatus;
  scheduled_at: string;
  hold_expires_at?: string | null;
  duration_hours?: number | null;
  base_amount_unit?: number | null;
  discount_unit?: number | null;
  amount_unit?: number | null;
  price_per_hour?: number;
  total_price?: number;
  cancellation_reason?: string | null;
  vehicle_plate?: string | null;
  payment_status?: PaymentStatus | null;
  payment?: BookingPayment | null;
  arrived_at?: string | null;
  departed_at?: string | null;
  extended_to?: string | null;
  created_at?: string;
}

/** One page of GET /bookings: `{ data, page, limit, total }`. */
export interface BookingPage {
  data: Booking[];
  page: number;
  limit: number;
  total: number;
}

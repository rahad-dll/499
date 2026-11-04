export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "bkash" | "nagad" | "card" | "cash";

export interface BookingPayment {
  status: PaymentStatus;
  method?: PaymentMethod;
  amount_unit: number;
  paid_at?: string | null;
}

/** A booking as returned by GET /bookings. Relations are optional because
 *  the API may or may not embed them. */
export interface Booking {
  id: string;
  driver_id: string;
  slot_id: string;
  space_id: string;
  status: BookingStatus;
  scheduled_at: string;
  hold_expires_at?: string | null;
  arrived_at?: string | null;
  departed_at?: string | null;
  /** Amount in paisa (100 = ৳1). */
  amount_unit?: number | null;
  /** Some API builds report the booked length directly. */
  duration_hours?: number | null;
  vehicle_plate?: string | null;
  cancellation_reason?: string | null;
  created_at?: string;
  payment?: BookingPayment | null;
  space?: { id: string; name: string } | null;
  slot?: { id?: string; slot_label?: string } | null;
}

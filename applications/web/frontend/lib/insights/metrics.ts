/**
 * Pure helpers that turn raw API data into dashboard numbers.
 *
 * The API has no analytics, alerts, or enforcement endpoints yet, so the
 * portals derive them here from live data (GET /spaces/nearby, GET /bookings).
 * Only type imports are used so Node's test runner can load this file directly.
 */
import type { Booking } from "@/lib/bookings/types";
import type {
  NearbySpace,
  ParkingSpace,
  SlotStatusInfo,
  SpaceStatus,
} from "@/lib/spaces/types";

/* ---------------- occupancy & stress ---------------- */

export type Stress = "Optimal" | "Moderate" | "Critical";

export const STRESS_RANK: Record<Stress, number> = { Critical: 0, Moderate: 1, Optimal: 2 };

type SlotCounts = Pick<NearbySpace, "occupied_slots" | "available_slots">;

/** Share of AI-classified slots that are occupied (unknown slots are ignored). */
export function occupancyPct(space: SlotCounts): number {
  const known = space.occupied_slots + space.available_slots;
  return known === 0 ? 0 : Math.round((space.occupied_slots / known) * 100);
}

export function stressOf(pct: number): Stress {
  if (pct >= 85) return "Critical";
  if (pct >= 60) return "Moderate";
  return "Optimal";
}

/** Occupancy across many lots, weighted by slot count. */
export function cityOccupancy(spaces: SlotCounts[]): number {
  const occupied = spaces.reduce((total, s) => total + s.occupied_slots, 0);
  const known = spaces.reduce((total, s) => total + s.occupied_slots + s.available_slots, 0);
  return known === 0 ? 0 : Math.round((occupied / known) * 100);
}

/** Merges several /spaces/nearby responses, keeping one entry per lot. */
export function mergeSpaces(lists: NearbySpace[][]): NearbySpace[] {
  const byId = new Map<string, NearbySpace>();
  for (const list of lists) for (const space of list) byId.set(space.id, space);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** Most recent AI update across a lot's slots. */
export function lastUpdated(space: Pick<NearbySpace, "slot_statuses">): string | null {
  let latest: string | null = null;
  for (const slot of space.slot_statuses) {
    if (slot.last_updated && (!latest || slot.last_updated > latest)) latest = slot.last_updated;
  }
  return latest;
}

/** Normalizes the lot status across API builds (`status` vs legacy `is_active`). */
export function spaceStatus(space: Pick<ParkingSpace, "status" | "is_active">): SpaceStatus {
  if (space.status) return space.status;
  return space.is_active === false ? "inactive" : "active";
}

/* ---------------- alerts ---------------- */

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertKind = "congestion" | "stale" | "unclassified" | "unbooked";

export interface DerivedAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  location: string;
  space: NearbySpace;
  at: string | null;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/** Real-time alerts derived from live lot data. */
export function deriveAlerts(spaces: NearbySpace[]): DerivedAlert[] {
  const alerts: DerivedAlert[] = [];
  for (const space of spaces) {
    const location = space.address || space.name;
    const at = lastUpdated(space);
    const pct = occupancyPct(space);
    const unbooked = unbookedSlots(space).length;

    if (pct >= 85) {
      alerts.push({ id: `${space.id}:congestion`, kind: "congestion", severity: "critical", title: `High occupancy at ${space.name} (${pct}%)`, location, space, at });
    }
    if (unbooked > 0) {
      alerts.push({ id: `${space.id}:unbooked`, kind: "unbooked", severity: "warning", title: `${unbooked} occupied slot${unbooked === 1 ? "" : "s"} without a booking at ${space.name}`, location, space, at });
    }
    if (space.is_stale) {
      alerts.push({ id: `${space.id}:stale`, kind: "stale", severity: "warning", title: `Camera data is stale at ${space.name}`, location, space, at });
    }
    if (space.unknown_slots > 0) {
      alerts.push({ id: `${space.id}:unclassified`, kind: "unclassified", severity: "info", title: `${space.unknown_slots} slot${space.unknown_slots === 1 ? "" : "s"} not classified by AI at ${space.name}`, location, space, at });
    }
  }
  return alerts.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (b.at ?? "").localeCompare(a.at ?? ""),
  );
}

/* ---------------- enforcement ---------------- */

/** Slots the AI sees as occupied that have no booking: possible unpaid parking. */
export function unbookedSlots(space: Pick<NearbySpace, "slot_statuses">): SlotStatusInfo[] {
  return space.slot_statuses.filter((slot) => slot.status === "not_available" && !slot.is_booked);
}

export interface Incident {
  id: string;
  space: NearbySpace;
  slot: SlotStatusInfo;
  slotNumber: number;
}

export function deriveIncidents(spaces: NearbySpace[]): Incident[] {
  return spaces
    .flatMap((space) =>
      unbookedSlots(space).map((slot) => ({
        id: slot.slot_id,
        space,
        slot,
        slotNumber: space.slot_statuses.indexOf(slot) + 1,
      })),
    )
    .sort((a, b) => (b.slot.last_updated ?? "").localeCompare(a.slot.last_updated ?? ""));
}

/* ---------------- money & bookings ---------------- */

/** Formats paisa as Bangladeshi Taka, e.g. 482600 -> "৳4,826". */
export function formatTaka(paisa: number): string {
  return `৳${(paisa / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Revenue a booking actually earned, in paisa. */
export function bookingRevenue(booking: Booking): number {
  if (booking.payment) {
    return booking.payment.status === "paid" ? booking.payment.amount_unit : 0;
  }
  return booking.status === "completed" ? (booking.amount_unit ?? 0) : 0;
}

/** Parked time in ms: actual arrival→departure, else the booked duration. */
export function bookingDurationMs(booking: Booking): number | null {
  if (booking.arrived_at && booking.departed_at) {
    const ms = Date.parse(booking.departed_at) - Date.parse(booking.arrived_at);
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  }
  if (typeof booking.duration_hours === "number") return booking.duration_hours * 3_600_000;
  return null;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const minutes = Math.round(ms / 60_000);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function bookingsToCsv(
  bookings: Booking[],
  spaceNames: Record<string, string> = {},
): string {
  const header = ["Booking ID", "Scheduled At", "Driver ID", "Parking Lot", "Slot", "Duration", "Amount (BDT)", "Earned (BDT)", "Status", "Payment"];
  const rows = bookings.map((b) => [
    b.id,
    b.scheduled_at,
    b.driver_id,
    b.space?.name ?? spaceNames[b.space_id] ?? b.space_id,
    b.slot?.slot_label ?? b.slot_id,
    formatDuration(bookingDurationMs(b)),
    (b.payment?.amount_unit ?? b.amount_unit ?? 0) / 100,
    bookingRevenue(b) / 100,
    b.status,
    b.payment?.status ?? "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

/* ---------------- time ---------------- */

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "—";
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function isSameLocalDay(iso: string, day: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

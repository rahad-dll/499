import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Booking } from "../bookings/types.ts";
import type { NearbySpace, SlotStatusInfo } from "../spaces/types.ts";
import {
  bookingDurationMs,
  bookingRevenue,
  bookingsToCsv,
  cityOccupancy,
  deriveAlerts,
  deriveIncidents,
  formatDuration,
  formatTaka,
  mergeSpaces,
  occupancyPct,
  spaceStatus,
  stressOf,
  timeAgo,
} from "./metrics.ts";

function slot(status: SlotStatusInfo["status"], is_booked = false, last_updated = "2026-10-03T10:00:00Z"): SlotStatusInfo {
  return { slot_id: `slot-${Math.random()}`, status, label: status, confidence: 0.9, last_updated, is_booked };
}

function space(overrides: Partial<NearbySpace> = {}): NearbySpace {
  return {
    id: "s1", name: "space-1", description: null, address: "Gulshan", latitude: 23.78, longitude: 90.41,
    total_capacity: 2, base_rate_unit: 5000, amenities: [], status: "active", distance_km: 0.5,
    available_slots: 1, occupied_slots: 1, unknown_slots: 0, slot_statuses: [], is_stale: false,
    photo_count: 0, camera_count: 1, slot_count: 2, booking_count: 0,
    ...overrides,
  };
}

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1", driver_id: "d1", slot_id: "sl1", space_id: "s1", status: "completed",
    scheduled_at: "2026-10-03T10:00:00Z", amount_unit: 12000, ...overrides,
  };
}

describe("occupancy and stress", () => {
  it("ignores unknown slots when computing occupancy", () => {
    assert.equal(occupancyPct({ occupied_slots: 3, available_slots: 1 }), 75);
    assert.equal(occupancyPct({ occupied_slots: 0, available_slots: 0 }), 0);
  });

  it("maps occupancy to stress levels", () => {
    assert.equal(stressOf(90), "Critical");
    assert.equal(stressOf(85), "Critical");
    assert.equal(stressOf(60), "Moderate");
    assert.equal(stressOf(59), "Optimal");
  });

  it("weights city occupancy by slot count", () => {
    assert.equal(
      cityOccupancy([
        { occupied_slots: 9, available_slots: 1 },
        { occupied_slots: 0, available_slots: 10 },
      ]),
      45,
    );
  });

  it("deduplicates merged nearby results", () => {
    const merged = mergeSpaces([[space({ id: "a", name: "space-2" })], [space({ id: "a", name: "space-2" }), space({ id: "b", name: "space-10" })]]);
    assert.deepEqual(merged.map((s) => s.name), ["space-2", "space-10"]);
  });

  it("falls back to the legacy is_active flag", () => {
    assert.equal(spaceStatus({ status: "pending" }), "pending");
    assert.equal(spaceStatus({ is_active: false }), "inactive");
    assert.equal(spaceStatus({}), "active");
  });
});

describe("alerts and incidents", () => {
  it("raises critical, warning, and info alerts in severity order", () => {
    const alerts = deriveAlerts([
      space({ id: "info", unknown_slots: 1 }),
      space({ id: "stale", is_stale: true }),
      space({ id: "full", occupied_slots: 9, available_slots: 1 }),
    ]);
    assert.deepEqual(alerts.map((a) => a.kind), ["congestion", "stale", "unclassified"]);
  });

  it("flags occupied slots that have no booking", () => {
    const lot = space({ slot_statuses: [slot("not_available", false), slot("not_available", true), slot("available")] });
    const incidents = deriveIncidents([lot]);
    assert.equal(incidents.length, 1);
    assert.equal(incidents[0].slotNumber, 1);
    assert.ok(deriveAlerts([lot]).some((a) => a.kind === "unbooked"));
  });
});

describe("bookings", () => {
  it("counts paid payments, completed bookings, and nothing else as revenue", () => {
    assert.equal(bookingRevenue(booking()), 12000);
    assert.equal(bookingRevenue(booking({ status: "confirmed" })), 0);
    assert.equal(bookingRevenue(booking({ payment: { status: "paid", amount_unit: 9000 } })), 9000);
    assert.equal(bookingRevenue(booking({ payment: { status: "refunded", amount_unit: 9000 } })), 0);
  });

  it("measures duration from arrival and departure, else booked hours", () => {
    assert.equal(
      bookingDurationMs(booking({ arrived_at: "2026-10-03T10:00:00Z", departed_at: "2026-10-03T12:48:00Z" })),
      (2 * 60 + 48) * 60_000,
    );
    assert.equal(bookingDurationMs(booking({ duration_hours: 2 })), 7_200_000);
    assert.equal(bookingDurationMs(booking()), null);
    assert.equal(formatDuration(168 * 60_000), "2h 48m");
    assert.equal(formatDuration(null), "—");
  });

  it("formats taka and exports escaped CSV", () => {
    assert.equal(formatTaka(482600), "৳4,826");
    const csv = bookingsToCsv([booking()], { s1: "Gulshan, Zone A" });
    assert.match(csv, /"Gulshan, Zone A"/);
    assert.equal(csv.split("\n").length, 2);
  });

  it("describes relative time", () => {
    const now = Date.parse("2026-10-03T12:00:00Z");
    assert.equal(timeAgo("2026-10-03T11:59:30Z", now), "just now");
    assert.equal(timeAgo("2026-10-03T11:45:00Z", now), "15m ago");
    assert.equal(timeAgo(null, now), "—");
  });
});

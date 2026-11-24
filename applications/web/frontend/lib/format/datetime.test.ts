import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate, formatDateTime, formatSeconds, formatTime } from "./datetime.ts";

// 08:05 UTC is 2:05 pm in Dhaka (UTC+6, no daylight saving)
const AFTERNOON = "2026-10-31T08:05:00Z";

test("formats date and time in Dhaka time", () => {
  assert.equal(formatDateTime(AFTERNOON), "31 Oct 2026, 2:05 pm");
  assert.equal(formatDate(AFTERNOON), "31 Oct 2026");
  assert.equal(formatTime(AFTERNOON), "2:05 pm");
});

test("uses the Dhaka calendar day, not the UTC one", () => {
  // 20:30 UTC on the 31st is already 2:30 am on 1 November in Dhaka
  assert.equal(formatDate("2026-10-31T20:30:00Z"), "1 Nov 2026");
});

test("accepts epoch milliseconds and Date objects", () => {
  const ms = Date.parse(AFTERNOON);
  assert.equal(formatTime(ms), "2:05 pm");
  assert.equal(formatTime(new Date(ms)), "2:05 pm");
});

test("shows a dash for missing or invalid dates", () => {
  for (const value of [null, undefined, "", "not a date", Number.NaN]) {
    assert.equal(formatDateTime(value), "—");
    assert.equal(formatDate(value), "—");
    assert.equal(formatTime(value), "—");
  }
});

test("formats short durations", () => {
  assert.equal(formatSeconds(0), "0 s");
  assert.equal(formatSeconds(8.4), "8 s");
  assert.equal(formatSeconds(-3), "0 s");
  assert.equal(formatSeconds(59), "59 s");
  assert.equal(formatSeconds(240), "4 min");
  assert.equal(formatSeconds(7_200), "2 h");
});

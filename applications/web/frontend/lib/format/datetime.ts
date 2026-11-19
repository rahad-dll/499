/**
 * Dates and times as CityPulse shows them: "31 Oct 2026, 2:05 pm".
 *
 * Every value is shown in Dhaka time, whatever the visitor's computer is set
 * to, so owners, authorities and exported reports all agree on when something
 * happened. No imports, so Node's test runner can load this file directly.
 */

export const DISPLAY_TIME_ZONE = "Asia/Dhaka";

const LOCALE = "en-GB";

const DATE_TIME = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: DISPLAY_TIME_ZONE,
});

const DATE = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: DISPLAY_TIME_ZONE,
});

const TIME = new Intl.DateTimeFormat(LOCALE, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: DISPLAY_TIME_ZONE,
});

export type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "31 Oct 2026, 2:05 pm", or "—" when there is no valid date. */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : "—";
}

/** "31 Oct 2026", or "—". */
export function formatDate(value: DateInput): string {
  const date = toDate(value);
  return date ? DATE.format(date) : "—";
}

/** "2:05 pm", or "—". */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  return date ? TIME.format(date) : "—";
}

/** Short countdowns and ages for live data: "8 s", "4 min", "2 h". */
export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
}

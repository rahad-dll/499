"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  FilterX,
  Info,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { RowsSkeleton } from "@/components/portal/PageSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import type { Booking, BookingStatus } from "@/lib/bookings/types";
import { useBookings } from "@/lib/bookings/use-bookings";
import {
  bookingDurationMs,
  bookingPaymentStatus,
  bookingRevenue,
  bookingsToCsv,
  formatDuration,
  formatTaka,
} from "@/lib/insights/metrics";
import { formatDate, formatDateTime } from "@/lib/format/datetime";
import { useOwnerSpaces } from "@/lib/spaces/use-owner-spaces";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const STATUS_VARIANT: Record<BookingStatus, "success" | "warning" | "secondary" | "info" | "destructive"> = {
  completed: "success",
  confirmed: "info",
  pending: "warning",
  cancelled: "secondary",
  no_show: "destructive",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  completed: "Completed",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const COLUMNS = ["Date and time", "Booking", "Parking lot", "Duration", "Amount", "Status"];

type RangeKey = "all" | "7d" | "30d" | "month";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
];

function rangeStart(key: RangeKey, now: Date): number | null {
  if (key === "all") return null;
  if (key === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const days = key === "7d" ? 7 : 30;
  return now.getTime() - days * 86_400_000;
}

export default function RevenueHistoryPage() {
  const { bookings, loading, error } = useBookings();
  const { spaces } = useOwnerSpaces();
  const [range, setRange] = useState<{ key: RangeKey; from: number | null }>({ key: "all", from: null });
  const [lotId, setLotId] = useState("all");
  const [page, setPage] = useState(1);

  const spaceNames = useMemo(
    () => Object.fromEntries(spaces.map((s) => [s.id, s.name])) as Record<string, string>,
    [spaces],
  );

  const filtered = useMemo(
    () =>
      bookings
        .filter((b) => lotId === "all" || b.space_id === lotId)
        .filter((b) => range.from === null || Date.parse(b.scheduled_at) >= range.from)
        .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    [bookings, lotId, range.from],
  );

  const summary = useMemo(() => {
    const revenue = filtered.reduce((t, b) => t + bookingRevenue(b), 0);
    const durations = filtered.map(bookingDurationMs).filter((d): d is number => d !== null);
    const avg = durations.length ? durations.reduce((t, d) => t + d, 0) / durations.length : null;
    return { revenue, avg, paid: filtered.filter((b) => bookingRevenue(b) > 0).length };
  }, [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const lotName = (b: Booking) => b.space_name || spaceNames[b.space_id] || `Lot ${b.space_id.slice(0, 6)}`;
  const amount = (b: Booking) => formatTaka(b.amount_unit ?? 0);
  /** Short booking reference shown in place of the driver, whom the API does not identify. */
  const reference = (b: Booking) => b.id.slice(0, 8).toUpperCase();

  const filtersActive = range.key !== "all" || lotId !== "all";

  function clearFilters() {
    setRange({ key: "all", from: null });
    setLotId("all");
    setPage(1);
  }

  function chooseRange(key: RangeKey) {
    setRange({ key, from: rangeStart(key, new Date()) });
    setPage(1);
  }

  function exportCsv() {
    const blob = new Blob([bookingsToCsv(filtered, spaceNames)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `citypulse-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const cards: { icon: LucideIcon; iconClass: string; label: string; value: string; caption: string }[] = [
    { icon: Receipt, iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400", label: "Total bookings", value: filtered.length.toLocaleString(), caption: `${summary.paid} earned revenue` },
    { icon: CircleDollarSign, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", label: "Revenue earned", value: formatTaka(summary.revenue), caption: "Paid or completed bookings" },
    { icon: Clock, iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400", label: "Average parking time", value: formatDuration(summary.avg), caption: "Arrival to departure" },
  ];

  return (
    <OwnerShell active="revenue" breadcrumb="Revenue">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Revenue history
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bookings and earnings from the CityPulse API.
          </p>
        </div>
        <Button variant="brand" className="h-11 rounded-xl" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {/* filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => chooseRange(r.key)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                range.key === r.key ? "bg-brand/10 text-teal-600 dark:text-brand" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Filter by parking lot"
          value={lotId}
          onChange={(e) => {
            setLotId(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <option value="all">All parking lots</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* GET /bookings only returns the caller's own bookings as a driver */}
      <Alert className="mt-5">
        <Info className="size-4" />
        <AlertDescription>
          The CityPulse API doesn’t list bookings made at an owner’s lots yet: GET /bookings only returns a
          driver’s own bookings. Revenue will appear here once the backend adds an owner bookings endpoint.
        </AlertDescription>
      </Alert>

      {/* summary cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {cards.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", s.iconClass)}>
              <s.icon className="size-[22px]" />
            </span>
            <div>
              <div className="text-[13px] text-muted-foreground">{s.label}</div>
              {loading ? (
                <Skeleton className="my-1 h-6 w-24" />
              ) : (
                <div className="text-2xl font-extrabold tracking-tight">{s.value}</div>
              )}
              <div className="text-xs text-muted-foreground">{s.caption}</div>
            </div>
          </div>
        ))}
      </div>

      {/* transactions: table on ≥md, cards on mobile */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <LoadingRegion label="Loading bookings…">
            <RowsSkeleton rows={6} />
          </LoadingRegion>
        ) : rows.length === 0 ? (
          filtersActive ? (
            <EmptyState
              className="m-4 border-0"
              icon={FilterX}
              title="No bookings match these filters"
              description="Try a longer date range or another parking lot."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Show all bookings
                </Button>
              }
            />
          ) : (
            <EmptyState
              className="m-4 border-0"
              icon={Receipt}
              title="No bookings yet"
              description="Nothing to show until the API can list bookings at your lots. Meanwhile, check that each lot is approved: drivers can book a lot only after a CityPulse admin approves it."
              action={
                <Button asChild variant="outline">
                  <Link href="/owner">Check your parking lots</Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {COLUMNS.map((c) => (
                      <th key={c} className={"px-5 py-3.5 font-bold"}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-4 text-muted-foreground">{formatDateTime(b.scheduled_at)}</td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-teal-600 dark:text-brand" title={b.id}>
                        {reference(b)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{lotName(b)}</div>
                        {(b.slot_label || b.vehicle_plate) && (
                          <div className="text-xs text-muted-foreground">
                            {[b.slot_label && `Slot ${b.slot_label}`, b.vehicle_plate].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDuration(bookingDurationMs(b))}</td>
                      <td className="px-5 py-4 font-extrabold">{amount(b)}</td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
                          <span className="size-1.5 rounded-full bg-current" />
                          {STATUS_LABEL[b.status] ?? b.status}
                        </Badge>
                        {bookingPaymentStatus(b) && (
                          <div className="mt-1 text-xs capitalize text-muted-foreground">
                            {bookingPaymentStatus(b)}{b.payment?.method ? ` · ${b.payment.method}` : ""}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="flex flex-col divide-y divide-border md:hidden">
              {rows.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-600 dark:text-brand">{reference(b)}</span>
                    <Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold">{lotName(b)}</div>
                  <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                    <span>{formatDate(b.scheduled_at)}</span>
                    <span>{formatDuration(bookingDurationMs(b))}</span>
                    <span className="font-extrabold text-foreground">{amount(b)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <span className="text-[13px] text-muted-foreground">
            {filtered.length === 0
              ? "No bookings"
              : `Showing ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} of ${filtered.length} bookings`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous page"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 text-sm font-semibold">
              {current} / {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </OwnerShell>
  );
}

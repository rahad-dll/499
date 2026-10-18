"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Cctv,
  Layers,
  Map,
  RefreshCcw,
  Search,
} from "lucide-react";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  STRESS_RANK,
  lastUpdated,
  occupancyPct,
  stressOf,
  timeAgo,
  type Stress,
} from "@/lib/insights/metrics";
import { useLiveSpaces } from "@/lib/spaces/use-live-spaces";
import { cn } from "@/lib/utils";

const STRESS_META: Record<Stress, { badge: "destructive" | "warning" | "success"; bar: string }> = {
  Critical: { badge: "destructive", bar: "bg-red-500" },
  Moderate: { badge: "warning", bar: "bg-amber-500" },
  Optimal: { badge: "success", bar: "bg-emerald-500" },
};

const COLUMNS = ["Lot ID", "Parking Lot", "Location", "Capacity", "Occupancy", "Stress Level", "AI Data"];

type StressFilter = "All" | Stress;

export default function ZoneManagementPage() {
  const { spaces, loading, error, updatedAt, refresh } = useLiveSpaces();
  const [query, setQuery] = useState("");
  const [stressFilter, setStressFilter] = useState<StressFilter>("All");
  const now = updatedAt ?? 0;

  const rows = useMemo(
    () =>
      spaces
        .map((space) => {
          const occupancy = occupancyPct(space);
          return { space, occupancy, stress: stressOf(occupancy), updated: lastUpdated(space) };
        })
        .sort((a, b) => STRESS_RANK[a.stress] - STRESS_RANK[b.stress] || b.occupancy - a.occupancy),
    [spaces],
  );

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    ({ space, stress }) =>
      (stressFilter === "All" || stress === stressFilter) &&
      (!q ||
        space.name.toLowerCase().includes(q) ||
        space.id.toLowerCase().includes(q) ||
        (space.address ?? "").toLowerCase().includes(q)),
  );

  const capacity = spaces.reduce((total, s) => total + s.total_capacity, 0);
  const critical = rows.filter((r) => r.stress === "Critical").length;

  return (
    <AuthorityShell active="zones">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          City Parking Zones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every active parking lot in Dhaka with live AI occupancy.
        </p>

        {/* toolbar */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search lots or addresses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <label className="relative inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card pl-4 pr-9 text-sm font-semibold text-foreground hover:bg-muted">
            <AlertTriangle className="size-4 text-amber-500" />
            <span className="sr-only">Filter by stress level</span>
            <select
              value={stressFilter}
              onChange={(e) => setStressFilter(e.target.value as StressFilter)}
              className="cursor-pointer appearance-none bg-transparent outline-none"
            >
              {(["All", "Critical", "Moderate", "Optimal"] as const).map((option) => (
                <option key={option} value={option}>
                  Stress Level: {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
          </label>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </button>
          <Badge variant="info" className="ml-auto hidden px-3.5 py-2 text-[13px] sm:inline-flex">
            {spaces.length} lots live
          </Badge>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {visible.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {loading ? "Loading live parking lots…" : "No parking lots match your filters."}
          </div>
        )}

        {/* table on ≥lg */}
        {visible.length > 0 && (
          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {COLUMNS.map((c) => (
                    <th key={c} className="px-5 py-3.5 font-bold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ space, occupancy, stress, updated }) => (
                  <tr key={space.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-teal-600 dark:text-brand" title={space.id}>
                      {space.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4 font-bold">{space.name}</td>
                    <td className="max-w-56 px-5 py-4">
                      <div className="truncate font-semibold">{space.address ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {space.latitude.toFixed(4)}, {space.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{space.total_capacity} slots</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", STRESS_META[stress].bar)} style={{ width: `${occupancy}%` }} />
                        </div>
                        <span className="font-extrabold">{occupancy}%</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {space.available_slots} free · {space.occupied_slots} taken
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={STRESS_META[stress].badge}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {stress}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", space.is_stale ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                        <Cctv className="size-3.5" />
                        {space.is_stale ? "Stale" : "Live"} · {space.camera_count} cam
                      </div>
                      <div className="text-xs text-muted-foreground">{timeAgo(updated, now)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* card list on mobile/tablet */}
        <div className="mt-5 flex flex-col gap-3 lg:hidden">
          {visible.map(({ space, occupancy, stress, updated }) => (
            <div key={space.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-600 dark:text-brand">
                  {space.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge variant={STRESS_META[stress].badge}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {stress}
                </Badge>
              </div>
              <div className="mt-1.5 text-[15px] font-extrabold">{space.name}</div>
              <div className="text-[13px] text-muted-foreground">
                {space.address ?? "—"} · {space.total_capacity} slots
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", STRESS_META[stress].bar)} style={{ width: `${occupancy}%` }} />
                </div>
                <span className="text-sm font-extrabold">{occupancy}%</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {space.is_stale ? "Stale camera data" : "Live AI data"} · {timeAgo(updated, now)}
              </div>
            </div>
          ))}
        </div>

        {/* summary cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <Map className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{spaces.length}</div>
              <div className="text-[13px] text-muted-foreground">Active Parking Lots</div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Layers className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{capacity.toLocaleString()}</div>
              <div className="text-[13px] text-muted-foreground">City-wide Capacity</div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">{critical}</div>
              <div className="text-[13px] text-muted-foreground">Critical Lots (≥85% full)</div>
            </div>
          </div>
        </div>
      </main>
    </AuthorityShell>
  );
}

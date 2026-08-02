"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Layers,
  Map,
  MoreVertical,
  Search,
} from "lucide-react";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ---------------- mock data ---------------- */

type Stress = "Critical" | "Moderate" | "Optimal";

const STRESS_META: Record<Stress, { badge: "destructive" | "warning" | "success"; bar: string }> = {
  Critical: { badge: "destructive", bar: "bg-red-500" },
  Moderate: { badge: "warning", bar: "bg-amber-500" },
  Optimal: { badge: "success", bar: "bg-emerald-500" },
};

const ZONES: {
  id: string;
  name: string;
  owner: string;
  phone: string;
  capacity: string;
  occupancy: number;
  stress: Stress;
}[] = [
  { id: "ZN-014", name: "Gulshan Central", owner: "Rahim Uddin", phone: "+880 171 234", capacity: "400 slots", occupancy: 94, stress: "Critical" },
  { id: "ZN-021", name: "Banani Block C", owner: "ParkCo Ltd.", phone: "+880 191 887", capacity: "250 slots", occupancy: 72, stress: "Moderate" },
  { id: "ZN-008", name: "Dhanmondi 27", owner: "Sultana Begum", phone: "+880 155 220", capacity: "180 slots", occupancy: 45, stress: "Optimal" },
  { id: "ZN-033", name: "Uttara Sector 7", owner: "CityHold BD", phone: "+880 133 909", capacity: "320 slots", occupancy: 88, stress: "Critical" },
  { id: "ZN-002", name: "Motijheel Plaza", owner: "A. Karim", phone: "+880 188 771", capacity: "210 slots", occupancy: 63, stress: "Moderate" },
  { id: "ZN-045", name: "Mirpur DOHS", owner: "GreenPark", phone: "+880 177 456", capacity: "160 slots", occupancy: 38, stress: "Optimal" },
];

const COLUMNS = ["Zone ID", "Zone Name", "Owner Details", "Capacity", "Occupancy", "Stress Level", "Actions"];

/* ---------------- page ---------------- */

export default function ZoneManagementPage() {
  const [query, setQuery] = useState("");
  const zones = ZONES.filter(
    (z) =>
      z.name.toLowerCase().includes(query.toLowerCase()) ||
      z.id.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AuthorityShell active="zones">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          City Parking Zones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor and manage all registered city parking zones.
        </p>

        {/* toolbar */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search zones..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <AlertTriangle className="size-4 text-amber-500" />
            Stress Level: All
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          <Badge variant="info" className="ml-auto hidden px-3.5 py-2 text-[13px] sm:inline-flex">
            48 zones registered
          </Badge>
        </div>

        {/* table on ≥lg */}
        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {COLUMNS.map((c) => (
                  <th key={c} className={cn("px-5 py-3.5 font-bold", c === "Actions" && "text-right")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-4 font-bold text-teal-600 dark:text-brand">{z.id}</td>
                  <td className="px-5 py-4 font-bold">{z.name}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{z.owner}</div>
                    <div className="text-xs text-muted-foreground">{z.phone}</div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{z.capacity}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", STRESS_META[z.stress].bar)}
                          style={{ width: `${z.occupancy}%` }}
                        />
                      </div>
                      <span className="font-extrabold">{z.occupancy}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={STRESS_META[z.stress].badge}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {z.stress}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button type="button" aria-label="Zone actions" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <MoreVertical className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* card list on mobile/tablet */}
        <div className="mt-5 flex flex-col gap-3 lg:hidden">
          {zones.map((z) => (
            <div key={z.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-teal-600 dark:text-brand">{z.id}</span>
                <Badge variant={STRESS_META[z.stress].badge}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {z.stress}
                </Badge>
              </div>
              <div className="mt-1.5 text-[15px] font-extrabold">{z.name}</div>
              <div className="text-[13px] text-muted-foreground">
                {z.owner} · {z.capacity}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", STRESS_META[z.stress].bar)}
                    style={{ width: `${z.occupancy}%` }}
                  />
                </div>
                <span className="text-sm font-extrabold">{z.occupancy}%</span>
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
              <div className="text-2xl font-extrabold tracking-tight">48</div>
              <div className="text-[13px] text-muted-foreground">Registered Zones</div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Layers className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">24,800</div>
              <div className="text-[13px] text-muted-foreground">City-wide Capacity</div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">7</div>
              <div className="text-[13px] text-muted-foreground">Active Critical Zones</div>
            </div>
          </div>
        </div>
      </main>
    </AuthorityShell>
  );
}

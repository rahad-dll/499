"use client";

import {
  Activity,
  Car,
  CheckCircle2,
  Gauge,
  Ticket,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ---------------- mock data ----------------
   No Figma frame exists for Analytics — it follows the same visual
   language as the other authority pages. */

const STATS: {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  label: string;
  delta: string;
  up: boolean;
}[] = [
  { icon: Car, iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400", value: "12,4K", label: "Vehicles Tracked Today", delta: "+6.2%", up: true },
  { icon: Ticket, iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400", value: "142", label: "Violations Detected", delta: "-9%", up: false },
  { icon: Gauge, iconClass: "bg-red-500/15 text-red-600 dark:text-red-400", value: "68%", label: "Avg City Stress", delta: "+18%", up: true },
  { icon: CheckCircle2, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", value: "92%", label: "Resolution Rate", delta: "+3.4%", up: true },
];

/* congestion index per hour, 0..100 */
const CONGESTION = [22, 18, 15, 14, 16, 24, 42, 66, 82, 74, 62, 58, 60, 64, 60, 66, 74, 88, 92, 80, 62, 48, 36, 28];

const ZONE_BARS = [
  { zone: "Gulshan", count: 38, cls: "bg-red-500" },
  { zone: "Banani", count: 27, cls: "bg-amber-500" },
  { zone: "Uttara", count: 24, cls: "bg-amber-500" },
  { zone: "Dhanmondi", count: 19, cls: "bg-brand" },
  { zone: "Motijheel", count: 16, cls: "bg-brand" },
  { zone: "Mirpur", count: 11, cls: "bg-emerald-500" },
];

const TOP_ZONES = [
  { name: "Gulshan Central", metric: "94% occupancy", stress: "Critical", badge: "destructive" as const },
  { name: "Uttara Sector 7", metric: "88% occupancy", stress: "Critical", badge: "destructive" as const },
  { name: "Banani Block C", metric: "72% occupancy", stress: "Moderate", badge: "warning" as const },
  { name: "Motijheel Plaza", metric: "63% occupancy", stress: "Moderate", badge: "warning" as const },
];

/* ---------------- charts ---------------- */

function CongestionChart() {
  const W = 1000;
  const H = 240;
  const pts = CONGESTION.map(
    (v, i) => [(i * W) / (CONGESTION.length - 1), H - 20 - (v / 100) * (H - 50)] as const,
  );
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full sm:h-60" preserveAspectRatio="none" role="img" aria-label="City congestion index by hour">
      <defs>
        <linearGradient id="congestionFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6cff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b6cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="4 6" strokeWidth="1" />
      ))}
      <polygon points={area} fill="url(#congestionFill)" />
      <polyline points={line} fill="none" stroke="#8b6cff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- page ---------------- */

export default function AnalyticsPage() {
  const max = Math.max(...ZONE_BARS.map((z) => z.count));
  return (
    <AuthorityShell active="analytics">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          City Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Congestion, violations and enforcement performance across Dhaka.
        </p>

        {/* stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <span className={cn("flex size-10 items-center justify-center rounded-xl", s.iconClass)}>
                  <s.icon className="size-5" />
                </span>
                <Badge variant={s.up ? "success" : "destructive"} className="text-[11px]">
                  {s.up ? <TrendingUp /> : <TrendingDown />}
                  {s.delta}
                </Badge>
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[26px]">{s.value}</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* congestion chart */}
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">City Congestion Index</h2>
              <p className="text-[13px] text-muted-foreground">By hour · last 24 hours</p>
            </div>
            <Badge variant="purple">
              <Activity className="size-3" />
              Congestion %
            </Badge>
          </div>
          <div className="mt-4">
            <CongestionChart />
          </div>
          <div className="mt-2 flex justify-between text-[11.5px] text-muted-foreground">
            {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* violations by zone */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-extrabold tracking-tight">Violations by Zone</h2>
            <p className="text-[13px] text-muted-foreground">Detected today</p>
            <div className="mt-5 flex flex-col gap-4">
              {ZONE_BARS.map((z) => (
                <div key={z.zone} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[13.5px] font-semibold">{z.zone}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", z.cls)} style={{ width: `${(z.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-extrabold">{z.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* top stressed zones */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-extrabold tracking-tight">Top Stressed Zones</h2>
            <p className="text-[13px] text-muted-foreground">Ranked by live occupancy</p>
            <div className="mt-4 flex flex-col divide-y divide-border">
              {TOP_ZONES.map((z, i) => (
                <div key={z.name} className="flex items-center gap-3.5 py-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-extrabold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{z.name}</div>
                    <div className="text-xs text-muted-foreground">{z.metric}</div>
                  </span>
                  <Badge variant={z.badge}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {z.stress}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AuthorityShell>
  );
}

"use client";

import {
  Cctv,
  CircleDollarSign,
  Gauge,
  Layers,
  TrendingDown,
  TrendingUp,
  Video,
  type LucideIcon,
} from "lucide-react";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ---------------- mock data ---------------- */

interface Metric {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  label: string;
  shortLabel: string;
  delta: string;
  up: boolean;
  spark: string;
}

const METRICS: Metric[] = [
  { icon: Layers, iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400", value: "2,400", label: "Total Capacity", shortLabel: "Total Capacity", delta: "+3.2%", up: true, spark: "#14b8a6" },
  { icon: Gauge, iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400", value: "89.9%", label: "Current Occupancy", shortLabel: "Occupancy", delta: "+5.1%", up: true, spark: "#8b5cf6" },
  { icon: CircleDollarSign, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", value: "৳84,200", label: "Today's Revenue", shortLabel: "Revenue", delta: "+12%", up: true, spark: "#22c55e" },
  { icon: Cctv, iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400", value: "328", label: "Active AI Cameras", shortLabel: "AI Cameras", delta: "-2", up: false, spark: "#38bdf8" },
];

const CAMERAS = [
  { name: "Gate A — North", cars: 4, boxes: [{ l: "8%", t: "38%", w: 74, h: 48, c: "#22c55e" }, { l: "48%", t: "52%", w: 86, h: 52, c: "#18d6c0" }, { l: "82%", t: "24%", w: 52, h: 40, c: "#8b6cff" }] },
  { name: "Level 2 — East", cars: 7, boxes: [{ l: "12%", t: "40%", w: 78, h: 52, c: "#22c55e" }, { l: "52%", t: "56%", w: 88, h: 50, c: "#18d6c0" }, { l: "80%", t: "22%", w: 50, h: 42, c: "#8b6cff" }] },
  { name: "Exit B — South", cars: 2, boxes: [{ l: "10%", t: "32%", w: 76, h: 50, c: "#22c55e" }, { l: "50%", t: "54%", w: 90, h: 48, c: "#18d6c0" }, { l: "81%", t: "26%", w: 52, h: 42, c: "#8b6cff" }] },
];

const TREND = [62, 60, 63, 58, 54, 44, 34, 28, 30, 24, 26, 22, 28, 24, 18, 16, 22, 26, 20, 24, 34, 46, 56, 60, 64];

/* ---------------- tiny chart helpers ---------------- */

function Sparkline({ color }: { color: string }) {
  const pts = [14, 10, 13, 8, 11, 7, 10, 6, 9, 5, 8, 4, 7]
    .map((y, i) => `${(i * 100) / 12},${y}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 18" className="h-5 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TrendChart() {
  const W = 1000;
  const H = 230;
  const pts = TREND.map((y, i) => [(i * W) / (TREND.length - 1), 30 + (y / 70) * (H - 60)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full sm:h-56 lg:h-64" preserveAspectRatio="none" role="img" aria-label="Occupancy trend over the last 24 hours">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18d6c0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#18d6c0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="4 6" strokeWidth="1" />
      ))}
      <polygon points={area} fill="url(#trendFill)" />
      <polyline points={line} fill="none" stroke="#14d3b2" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- page ---------------- */

export default function OwnerDashboardPage() {
  return (
    <OwnerShell active="dashboard" breadcrumb="Dashboard">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
        Dashboard Overview
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Real-time occupancy, revenue and AI camera insights.
      </p>

      {/* metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-4 xl:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <span className={cn("flex size-10 items-center justify-center rounded-xl", m.iconClass)}>
                <m.icon className="size-5" />
              </span>
              <Badge variant={m.up ? "success" : "destructive"} className="text-[11px]">
                {m.up ? <TrendingUp /> : <TrendingDown />}
                {m.delta}
              </Badge>
            </div>
            <div className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[28px]">{m.value}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">
              <span className="sm:hidden">{m.shortLabel}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </div>
            <div className="mt-3">
              <Sparkline color={m.spark} />
            </div>
          </div>
        ))}
      </div>

      {/* occupancy trends */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Occupancy Trends</h2>
            <p className="text-[13px] text-muted-foreground">Last 24 hours</p>
          </div>
          <Badge variant="info">
            <span className="size-1.5 rounded-full bg-current" />
            Occupancy %
          </Badge>
        </div>
        <div className="mt-4">
          <TrendChart />
        </div>
        <div className="mt-2 flex justify-between text-[11.5px] text-muted-foreground">
          {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"].map((t, i, arr) => (
            <span key={t} className={cn(i > 0 && i < arr.length - 1 && "hidden sm:inline")}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* live camera feed */}
      <div className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">Live AI Camera Feed</h2>
          <a href="/owner/cameras" className="text-sm font-semibold text-brand hover:underline">
            View all
          </a>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CAMERAS.map((cam) => (
            <div key={cam.name} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative h-40 bg-[linear-gradient(160deg,#0b1322_0%,#101b31_100%)] sm:h-44">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:40px_40px]" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10.5px] font-bold tracking-wider text-white">
                  <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  LIVE
                </span>
                {cam.boxes.map((b, i) => (
                  <span
                    key={i}
                    className="absolute rounded-[4px] border-[1.5px]"
                    style={{ left: b.l, top: b.t, width: b.w, height: b.h, borderColor: b.c, boxShadow: `0 0 10px ${b.c}55` }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Video className="size-4 text-brand" />
                  {cam.name}
                </span>
                <span className="text-[12.5px] text-muted-foreground">{cam.cars} cars detected</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </OwnerShell>
  );
}

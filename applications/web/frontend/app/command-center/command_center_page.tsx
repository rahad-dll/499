"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Car,
  Cctv,
  Gauge,
  MapPin,
  Minus,
  Plus,
  Send,
  type LucideIcon,
} from "lucide-react";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- mock data ---------------- */

type Severity = "critical" | "warning" | "info";

interface Alert {
  icon: LucideIcon;
  severity: Severity;
  title: string;
  location: string;
  time: string;
}

const ALERTS: Alert[] = [
  { icon: Car, severity: "critical", title: "High congestion at Gulshan Zone A", location: "Gulshan Ave · Zone A", time: "2m ago" },
  { icon: AlertTriangle, severity: "warning", title: "Illegal roadside parking detected", location: "Road 11 · Banani", time: "6m ago" },
  { icon: Cctv, severity: "warning", title: "Camera offline — feed lost", location: "Dhanmondi · Gate 3", time: "12m ago" },
  { icon: Car, severity: "info", title: "Occupancy surge near Uttara Sector 7", location: "Uttara · Sector 7", time: "18m ago" },
];

const SEVERITY: Record<
  Severity,
  { badge: "destructive" | "warning" | "info"; label: string; card: string; icon: string }
> = {
  critical: { badge: "destructive", label: "CRITICAL", card: "border-destructive/45", icon: "bg-destructive/12 text-destructive" },
  warning: { badge: "warning", label: "WARNING", card: "border-amber-500/45", icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  info: { badge: "info", label: "INFO", card: "border-brand/40", icon: "bg-brand/12 text-teal-600 dark:text-brand" },
};

const MARKERS = [
  { l: "13%", t: "24%", n: 0, tone: "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.65)]" },
  { l: "60%", t: "36%", n: 3, tone: "bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.6)]" },
  { l: "84%", t: "26%", n: 8, tone: "bg-emerald-500 shadow-[0_0_14px_rgba(34,197,94,0.6)]" },
  { l: "35%", t: "72%", n: 5, tone: "bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.6)]" },
  { l: "70%", t: "66%", n: 12, tone: "bg-emerald-500 shadow-[0_0_14px_rgba(34,197,94,0.6)]" },
];

/* ---------------- heatmap ---------------- */

function Heatmap({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary/60", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--foreground)_9%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_9%,transparent)_1px,transparent_1px)] bg-[length:120px_120px]" />

      <div className="absolute left-[-10%] top-1/2 h-[10px] w-[130%] -rotate-[24deg] bg-background/70" />
      <div className="absolute left-[46%] top-[-15%] h-[130%] w-[10px] rotate-[18deg] bg-background/70" />
      <div className="absolute left-[-10%] top-[30%] h-[8px] w-[130%] rotate-[10deg] bg-background/60" />

      <span className="absolute left-[4%] top-[10%] size-[46%] rounded-full bg-red-500/35 blur-[70px]" />
      <span className="absolute left-[48%] top-[26%] size-[42%] rounded-full bg-amber-500/35 blur-[70px]" />
      <span className="absolute bottom-[4%] left-[30%] size-[38%] rounded-full bg-violet-500/30 blur-[70px]" />
      <span className="absolute right-[-6%] top-[8%] size-[36%] rounded-full bg-emerald-500/25 blur-[70px]" />

      {MARKERS.map((m) => (
        <span
          key={`${m.l}-${m.t}`}
          className={cn(
            "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/85 text-[12px] font-extrabold text-white",
            compact ? "size-8" : "size-10 text-[13px]",
            m.tone,
          )}
          style={{ left: m.l, top: m.t }}
        >
          {m.n}
        </span>
      ))}

      {compact ? (
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[12.5px] font-bold shadow-sm">
          <Gauge className="size-3.5 text-destructive" />
          Stress: <span className="text-destructive">High</span>
        </span>
      ) : (
        <div className="absolute left-5 top-5 z-10 w-64 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Gauge className="size-4 text-destructive" />
            City Traffic Stress
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="text-3xl font-extrabold tracking-tight text-destructive">High</span>
            <Badge variant="destructive" className="text-[11px]">+18%</Badge>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-amber-500 to-red-500" />
          </div>
        </div>
      )}

      {!compact && (
        <div className="absolute right-5 top-5 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <button type="button" aria-label="Zoom in" className="flex size-10 items-center justify-center text-foreground hover:bg-muted">
            <Plus className="size-4" />
          </button>
          <button type="button" aria-label="Zoom out" className="flex size-10 items-center justify-center border-t border-border text-foreground hover:bg-muted">
            <Minus className="size-4" />
          </button>
        </div>
      )}

      {!compact && (
        <div className="absolute bottom-5 left-5 z-10 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Stress Level
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-[13px] font-medium">
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-500" />Optimal</span>
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-amber-500" />Moderate</span>
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-red-500" />Critical</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- alert card ---------------- */

function AlertCard({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  const s = SEVERITY[alert.severity];
  const [dispatched, setDispatched] = useState(false);
  return (
    <div className={cn("rounded-2xl border bg-card p-4", s.card)}>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", s.icon)}>
          <alert.icon className="size-[18px]" />
        </span>
        <Badge variant={s.badge} className="text-[10.5px] tracking-wider">
          <span className="size-1.5 rounded-full bg-current" />
          {s.label}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">{alert.time}</span>
      </div>
      <div className="mt-3 text-[15px] font-bold leading-snug">{alert.title}</div>
      <div className={cn("mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground", compact && "justify-between")}>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {alert.location}
        </span>
        {compact && (
          <Button size="sm" variant="brand" className="h-9 rounded-lg px-4 text-[13px]" disabled={dispatched} onClick={() => setDispatched(true)}>
            <Send className="size-3.5" />
            {dispatched ? "Sent" : "Dispatch"}
          </Button>
        )}
      </div>
      {!compact && (
        <Button variant="brand" className="mt-3.5 w-full" disabled={dispatched} onClick={() => setDispatched(true)}>
          <Send className="size-4" />
          {dispatched ? "Warden Dispatched" : "Dispatch Warden"}
        </Button>
      )}
    </div>
  );
}

/* ---------------- page ---------------- */

export default function CommandCenterPage() {
  return (
    <AuthorityShell active="command" lockViewport>
      {/* desktop split */}
      <div className="hidden flex-1 overflow-hidden lg:grid lg:grid-cols-[424px_1fr]">
        <section className="flex flex-col overflow-hidden border-r border-border">
          <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
            <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />
            <h1 className="text-lg font-extrabold tracking-tight">Real-Time AI Alerts</h1>
            <Badge variant="destructive" className="ml-auto">5 new</Badge>
          </div>
          <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-5">
            {ALERTS.map((a) => (
              <AlertCard key={a.title} alert={a} />
            ))}
          </div>
        </section>

        <Heatmap className="h-full" />
      </div>

      {/* mobile / tablet stacked */}
      <div className="flex flex-1 flex-col px-4 py-5 sm:px-6 lg:hidden">
        <h1 className="text-2xl font-extrabold tracking-tight">Command Center</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Live city monitoring hub.</p>

        <Heatmap compact className="mt-4 h-56 rounded-2xl border border-border sm:h-72" />

        <div className="mt-6 flex items-center gap-2.5">
          <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />
          <h2 className="text-lg font-extrabold tracking-tight">Real-Time AI Alerts</h2>
          <Badge variant="destructive" className="ml-auto">5 new</Badge>
        </div>
        <div className="mt-3.5 flex flex-col gap-3.5">
          {ALERTS.map((a) => (
            <AlertCard key={a.title} alert={a} compact />
          ))}
        </div>
      </div>
    </AuthorityShell>
  );
}

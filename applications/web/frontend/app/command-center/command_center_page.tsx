"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Car,
  Cctv,
  Check,
  Gauge,
  LocateFixed,
  MapPin,
  RefreshCcw,
  ScanEye,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { InfoTip } from "@/components/InfoTip";
import { AuthorityMap, LiveMap } from "@/components/maps";
import { useMediaQuery } from "@/components/maps/use-media-query";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { LiveStatus } from "@/components/portal/LiveStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import {
  cityOccupancy,
  deriveAlerts,
  stressOf,
  timeAgo,
  type AlertKind,
  type AlertSeverity,
  type DerivedAlert,
  type Stress,
} from "@/lib/insights/metrics";
import { useLiveSpaces } from "@/lib/spaces/use-live-spaces";
import type { NearbySpace } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";

const ALERT_ICON: Record<AlertKind, LucideIcon> = {
  congestion: Car,
  unbooked: AlertTriangle,
  stale: Cctv,
  unclassified: ScanEye,
};

const SEVERITY: Record<
  AlertSeverity,
  { badge: "destructive" | "warning" | "info"; label: string; card: string; icon: string }
> = {
  critical: { badge: "destructive", label: "Critical", card: "border-destructive/45", icon: "bg-destructive/12 text-destructive" },
  warning: { badge: "warning", label: "Warning", card: "border-amber-500/45", icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  info: { badge: "info", label: "Info", card: "border-brand/40", icon: "bg-brand/12 text-teal-600 dark:text-brand" },
};

const STRESS_TEXT: Record<Stress, string> = {
  Critical: "text-destructive",
  Moderate: "text-amber-600 dark:text-amber-400",
  Optimal: "text-emerald-600 dark:text-emerald-400",
};

const STRESS_BAR: Record<Stress, string> = {
  Critical: "from-amber-500 to-red-500",
  Moderate: "from-emerald-500 to-amber-500",
  Optimal: "from-teal-400 to-emerald-500",
};

/* ---------------- live map panel ---------------- */

function LegendPin({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 36 46" className="h-[22px] w-[18px] shrink-0 drop-shadow" aria-hidden="true">
      <path
        d="M18 1C8.6 1 1 8.6 1 18c0 12.4 14.6 25.2 16.2 26.5a1.3 1.3 0 0 0 1.6 0C20.4 43.2 35 30.4 35 18 35 8.6 27.4 1 18 1z"
        fill={color}
        stroke="#fff"
        strokeWidth="2.2"
      />
      <circle cx="18" cy="18" r="8" fill="#fff" />
    </svg>
  );
}

/** Legend for the OpenStreetMap fallback (the Google map draws its own). */
function OsmLegend() {
  return (
    <div className="pointer-events-none absolute bottom-7 left-5 z-10 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Map legend
      </div>
      <div className="mt-2.5 flex flex-col gap-2 text-[13px] font-medium">
        {(
          [
            ["#12c2a9", "Optimal (<60% full)"],
            ["#f59e0b", "Moderate (60–84%)"],
            ["#ef4444", "Critical (≥85%)"],
          ] as const
        ).map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-2.5">
            <LegendPin color={color} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2.5">
          <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(140deg,#18d6c0,#26b7e8_55%,#8b6cff)] text-[8px] font-extrabold text-white shadow">
            n
          </span>
          Group of lots (click to zoom)
        </span>
        <span className="inline-flex items-center gap-2.5">
          <span className="mx-[3px] size-3 rounded-full border-2 border-white bg-amber-500 shadow" />
          Stale camera data
        </span>
      </div>
      <div className="mt-2.5 border-t border-border pt-2 text-[11.5px] text-muted-foreground">
        Number on a pin = free slots
      </div>
    </div>
  );
}

function CityMapPanel({
  spaces,
  loading,
  error,
  updatedAt,
  nextRefreshAt,
  focusId,
  onSelect,
  onRefresh,
  className,
  compact = false,
  mapVisible = true,
}: {
  spaces: NearbySpace[];
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
  nextRefreshAt: number | null;
  focusId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh: () => void;
  className?: string;
  compact?: boolean;
  /** the page lays out a desktop and a phone panel; only the visible one loads a map */
  mapVisible?: boolean;
}) {
  const pct = cityOccupancy(spaces);
  const stress = stressOf(pct);
  const slots = spaces.reduce((total, s) => total + s.slot_count, 0);

  return (
    <div className={cn("relative overflow-hidden bg-secondary/60", className)}>
      {mapVisible && (
        <AuthorityMap
          spaces={spaces}
          compact={compact}
          focusId={focusId}
          onSelect={(id) => onSelect(id)}
          chipsInset={compact ? 12 : 300}
          className="absolute inset-0"
          fallback={
            <>
              <LiveMap
                spaces={spaces}
                compact={compact}
                focusId={focusId}
                onSelect={onSelect}
                className="absolute inset-0"
              />
              {!compact && <OsmLegend />}
            </>
          }
        />
      )}

      {compact ? (
        <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[12.5px] font-bold shadow-sm">
          <Gauge className={cn("size-3.5", STRESS_TEXT[stress])} />
          Stress:{" "}
          {loading && spaces.length === 0 ? (
            <Skeleton className="h-3.5 w-14" />
          ) : (
            <span className={STRESS_TEXT[stress]}>{stress}</span>
          )}
        </span>
      ) : (
        <div className="absolute left-5 top-5 z-10 w-64 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Gauge className={cn("mr-1 size-4", STRESS_TEXT[stress])} />
            City parking stress
            <InfoTip term="stress" side="bottom" className="-my-1" />
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            {loading && spaces.length === 0 ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <span className={cn("text-3xl font-extrabold tracking-tight", STRESS_TEXT[stress])}>{stress}</span>
            )}
            <Badge variant={stress === "Critical" ? "destructive" : stress === "Moderate" ? "warning" : "success"} className="text-[11px]">
              {pct}% full
            </Badge>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full bg-gradient-to-r transition-[width]", STRESS_BAR[stress])} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2.5 text-[12px] text-muted-foreground">
            {spaces.length} lots · {slots} AI-monitored slots
          </div>
          <LiveStatus
            className="mt-1.5"
            updatedAt={updatedAt}
            nextRefreshAt={nextRefreshAt}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
          />
          {error && <div className="mt-1.5 text-[12px] font-semibold text-destructive">{error}</div>}
        </div>
      )}

      {!loading && spaces.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1/2 z-10 mx-auto w-fit rounded-xl border border-border bg-card/95 px-4 py-2 text-sm text-muted-foreground shadow">
          {error ?? "No active parking lots found in Dhaka yet."}
        </div>
      )}
    </div>
  );
}

/* ---------------- alert card ---------------- */

function AlertCard({
  alert,
  now,
  acknowledged,
  onAcknowledge,
  onLocate,
  compact = false,
}: {
  alert: DerivedAlert;
  now: number;
  acknowledged: boolean;
  onAcknowledge: () => void;
  onLocate: () => void;
  compact?: boolean;
}) {
  const s = SEVERITY[alert.severity];
  const Icon = ALERT_ICON[alert.kind];
  return (
    <div className={cn("rounded-2xl border bg-card p-4 transition-opacity", s.card, acknowledged && "opacity-60")}>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", s.icon)}>
          <Icon className="size-[18px]" />
        </span>
        <Badge variant={s.badge} className="text-[10.5px] uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-current" />
          {s.label}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(alert.at, now)}</span>
      </div>
      <div className="mt-3 text-[15px] font-bold leading-snug">{alert.title}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <MapPin className="size-3.5 shrink-0" />
        <span className="truncate">{alert.location}</span>
      </div>
      <div className={cn("mt-3.5 grid gap-2", compact ? "grid-cols-2" : "grid-cols-[1fr_auto]")}>
        <Button variant="brand" className={cn(compact && "h-9 text-[13px]")} onClick={onLocate}>
          <LocateFixed className="size-4" />
          Show on map
        </Button>
        <Button
          variant="outline"
          className={cn(compact && "h-9 text-[13px]")}
          disabled={acknowledged}
          onClick={onAcknowledge}
        >
          <Check className="size-4" />
          {acknowledged ? "Acknowledged" : "Acknowledge"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function CommandCenterPage() {
  const { spaces, loading, error, updatedAt, nextRefreshAt, refresh } = useLiveSpaces();
  const alerts = useMemo(() => deriveAlerts(spaces), [spaces]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set());
  const desktop = useMediaQuery("(min-width: 1024px)");
  const now = updatedAt ?? 0;
  const fresh = alerts.filter((a) => !acknowledged.has(a.id)).length;

  function acknowledge(id: string) {
    setAcknowledged((prev) => new Set(prev).add(id));
  }

  const alertList = (compact: boolean) =>
    loading && alerts.length === 0 ? (
      <LoadingRegion label="Loading live alerts…" className="flex flex-col gap-3.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
            <Skeleton className="mt-3 h-4 w-4/5" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-4 h-10 w-full rounded-md" />
          </div>
        ))}
      </LoadingRegion>
    ) : alerts.length === 0 ? (
      <EmptyState
        icon={error ? RefreshCcw : ShieldCheck}
        title={error ? "Live data unavailable" : "All clear"}
        description={
          error
            ? "CityPulse couldn't load the latest camera readings. Try again in a moment."
            : "No crowded lots, unbooked slots or stale cameras right now. New alerts appear here automatically."
        }
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCcw className="size-4" /> Check again now
          </Button>
        }
      />
    ) : (
      alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          now={now}
          compact={compact}
          acknowledged={acknowledged.has(alert.id)}
          onAcknowledge={() => acknowledge(alert.id)}
          onLocate={() => setFocusId(alert.space.id)}
        />
      ))
    );

  const mapProps = {
    spaces,
    loading,
    error,
    updatedAt,
    nextRefreshAt,
    focusId,
    onSelect: setFocusId,
    onRefresh: () => void refresh(),
  };

  return (
    <AuthorityShell active="command" lockViewport>
      {/* desktop split */}
      <div className="hidden flex-1 overflow-hidden lg:grid lg:grid-cols-[424px_1fr]">
        <section className="flex flex-col overflow-hidden border-r border-border">
          <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
            <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />
            <h1 className="text-lg font-extrabold tracking-tight">Real-time AI alerts</h1>
            <Badge variant={fresh > 0 ? "destructive" : "secondary"} className="ml-auto">{fresh} new</Badge>
          </div>
          <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-5">{alertList(false)}</div>
        </section>

        <CityMapPanel {...mapProps} mapVisible={desktop} className="h-full" />
      </div>

      {/* mobile / tablet stacked */}
      <div className="flex flex-1 flex-col px-4 py-5 sm:px-6 lg:hidden">
        <h1 className="text-2xl font-extrabold tracking-tight">Command center</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Live city parking monitor.</p>
        <LiveStatus
          className="mt-1.5"
          updatedAt={updatedAt}
          nextRefreshAt={nextRefreshAt}
          loading={loading}
          error={error}
          onRefresh={() => void refresh()}
        />

        <CityMapPanel {...mapProps} compact mapVisible={!desktop} className="mt-4 h-64 rounded-2xl border border-border sm:h-80" />

        <div className="mt-6 flex items-center gap-2.5">
          <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />
          <h2 className="text-lg font-extrabold tracking-tight">Real-time AI alerts</h2>
          <Badge variant={fresh > 0 ? "destructive" : "secondary"} className="ml-auto">{fresh} new</Badge>
        </div>
        <div className="mt-3.5 flex flex-col gap-3.5">{alertList(true)}</div>
      </div>
    </AuthorityShell>
  );
}

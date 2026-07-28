"use client";

import { useState, type ReactNode } from "react";
import {
  Building2,
  Cctv,
  CircleDollarSign,
  Landmark,
  Layers,
  Link2,
  MapPin,
  Plug,
  Save,
  Video,
  VideoOff,
  type LucideIcon,
} from "lucide-react";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/* ---------------- mock data ---------------- */

const TABS = [
  { id: "general", label: "General Details" },
  { id: "cameras", label: "Camera Setup" },
  { id: "pricing", label: "Pricing & Payouts" },
];

const CONNECTED_CAMERAS = [
  { name: "Gate A — North", url: "rtsp://192.168.1.24:554/stream1", online: true },
  { name: "Level 2 — East", url: "rtsp://192.168.1.31:554/stream2", online: true },
  { name: "Exit B — South", url: "rtsp://192.168.1.44:554/stream3", online: false },
];

/* ---------------- small pieces ---------------- */

function SectionCard({
  id,
  icon: Icon,
  iconClass,
  title,
  sub,
  children,
}: {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3.5">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          <p className="text-[13px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function IconField({
  label,
  icon: Icon,
  defaultValue,
  className,
}: {
  label: string;
  icon: LucideIcon;
  defaultValue: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2">{label}</Label>
      <div className="relative flex items-center">
        <Icon className="pointer-events-none absolute left-3.5 size-[18px] text-teal-600 dark:text-brand" />
        <Input defaultValue={defaultValue} className="h-[50px] bg-muted/50 pl-11" />
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function FacilityConfigPage() {
  const [tab, setTab] = useState("general");
  const [cameras, setCameras] = useState(CONNECTED_CAMERAS);

  return (
    <OwnerShell active="settings" breadcrumb="Settings">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
        Facility Configuration
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage facility details, connect AI cameras, and set pricing.
      </p>

      {/* tab pills (scroll to section) */}
      <div className="mt-5 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-brand/10 text-teal-600 dark:text-brand"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {/* general details */}
        <SectionCard
          id="general"
          icon={Building2}
          iconClass="bg-teal-500/15 text-teal-600 dark:text-teal-400"
          title="General Details"
          sub="Basic information about your parking facility."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <IconField label="Facility Name" icon={Building2} defaultValue="CityPulse Central Garage" />
            <IconField label="Location / Address" icon={MapPin} defaultValue="12 Gulshan Ave, Dhaka 1212" />
            <IconField label="Total Parking Capacity" icon={Layers} defaultValue="2,400 slots" />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3.5 lg:mt-[26px]">
              <div>
                <div className="text-sm font-bold">24/7 Operations</div>
                <div className="text-[13px] text-muted-foreground">
                  Facility stays open around the clock.
                </div>
              </div>
              <Switch defaultChecked aria-label="24/7 operations" />
            </div>
          </div>
        </SectionCard>

        {/* camera setup */}
        <SectionCard
          id="cameras"
          icon={Cctv}
          iconClass="bg-violet-500/15 text-violet-600 dark:text-violet-400"
          title="Camera Setup"
          sub="Connect CCTV streams to the AI detection pipeline."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            <div className="grid gap-5 sm:grid-cols-2">
              <IconField label="RTSP Stream URL" icon={Link2} defaultValue="rtsp://192.168.1.24:554/stream1" />
              <IconField label="Camera Location Name" icon={MapPin} defaultValue="Gate A — North" />
            </div>
            <div className="lg:mt-[26px]">
              <Button variant="outline" size="lg" className="w-full border-brand/50 text-teal-600 dark:text-brand lg:w-auto">
                <Plug className="size-4" />
                Test
              </Button>
            </div>
          </div>

          <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Connected Cameras
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {cameras.map((cam) => (
              <div
                key={cam.name}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    cam.online
                      ? "bg-brand/12 text-teal-600 dark:text-brand"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {cam.online ? <Video className="size-[18px]" /> : <VideoOff className="size-[18px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{cam.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{cam.url}</div>
                </span>
                <Badge variant={cam.online ? "success" : "secondary"}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {cam.online ? "Online" : "Offline"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setCameras((cs) => cs.filter((c) => c.name !== cam.name))}
                >
                  Disconnect
                </Button>
              </div>
            ))}
            {cameras.length === 0 && (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No cameras connected yet — add an RTSP stream above.
              </div>
            )}
          </div>
        </SectionCard>

        {/* pricing & payouts */}
        <SectionCard
          id="pricing"
          icon={CircleDollarSign}
          iconClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          title="Pricing & Payouts"
          sub="Set your hourly rate and connect payouts."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <IconField label="Hourly Rate (BDT)" icon={CircleDollarSign} defaultValue="৳120 / hour" />
            <IconField label="Payout Account" icon={Landmark} defaultValue="bKash · +880 171 ··· 234" />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3.5">
              <div>
                <div className="text-sm font-bold">Dynamic Surge Pricing</div>
                <div className="text-[13px] text-muted-foreground">
                  Raise rates automatically above 80% occupancy.
                </div>
              </div>
              <Switch aria-label="Dynamic surge pricing" />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3.5">
              <div>
                <div className="text-sm font-bold">Weekly Auto-Payout</div>
                <div className="text-[13px] text-muted-foreground">
                  Transfer earnings every Sunday night.
                </div>
              </div>
              <Switch defaultChecked aria-label="Weekly auto-payout" />
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button variant="brand" size="lg">
            <Save className="size-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </OwnerShell>
  );
}

"use client";

import { useState } from "react";
import {
  Cctv,
  Maximize2,
  Plus,
  RefreshCcw,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- mock data ----------------
   No Figma frame exists for this page — it follows the same visual
   language as the Owner Dashboard's Live AI Camera Feed tiles. */

interface Camera {
  name: string;
  zone: string;
  cars: number;
  online: boolean;
  boxes: { l: string; t: string; w: number; h: number; c: string }[];
}

const CAMERA_LIST: Camera[] = [
  { name: "Gate A — North", zone: "Entrance", cars: 4, online: true, boxes: [{ l: "8%", t: "38%", w: 74, h: 48, c: "#22c55e" }, { l: "48%", t: "52%", w: 86, h: 52, c: "#18d6c0" }, { l: "82%", t: "24%", w: 52, h: 40, c: "#8b6cff" }] },
  { name: "Level 2 — East", zone: "Level 2", cars: 7, online: true, boxes: [{ l: "12%", t: "40%", w: 78, h: 52, c: "#22c55e" }, { l: "52%", t: "56%", w: 88, h: 50, c: "#18d6c0" }] },
  { name: "Exit B — South", zone: "Exit", cars: 2, online: true, boxes: [{ l: "10%", t: "32%", w: 76, h: 50, c: "#22c55e" }, { l: "81%", t: "26%", w: 52, h: 42, c: "#8b6cff" }] },
  { name: "Level 1 — West", zone: "Level 1", cars: 5, online: true, boxes: [{ l: "20%", t: "44%", w: 82, h: 50, c: "#18d6c0" }, { l: "62%", t: "30%", w: 60, h: 44, c: "#22c55e" }] },
  { name: "Rooftop — R1", zone: "Rooftop", cars: 0, online: false, boxes: [] },
  { name: "Basement — B2", zone: "Basement", cars: 3, online: true, boxes: [{ l: "34%", t: "48%", w: 84, h: 52, c: "#22c55e" }] },
];

/* ---------------- page ---------------- */

export default function CamerasPage() {
  const [cameras, setCameras] = useState(CAMERA_LIST);
  const online = cameras.filter((c) => c.online).length;

  function toggle(name: string) {
    setCameras((cs) => cs.map((c) => (c.name === name ? { ...c, online: !c.online } : c)));
  }

  return (
    <OwnerShell active="cameras" breadcrumb="Cameras">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Camera Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor every AI camera feed across your facility.
          </p>
        </div>
        <Button variant="brand" className="h-11 rounded-xl">
          <Plus className="size-4" />
          Add Camera
        </Button>
      </div>

      {/* status strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <Cctv className="size-[22px]" />
          </span>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">{cameras.length}</div>
            <div className="text-[13px] text-muted-foreground">Total Cameras</div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Wifi className="size-[22px]" />
          </span>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">{online}</div>
            <div className="text-[13px] text-muted-foreground">Streams Online</div>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
            <WifiOff className="size-[22px]" />
          </span>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">{cameras.length - online}</div>
            <div className="text-[13px] text-muted-foreground">Offline / Feed Lost</div>
          </div>
        </div>
      </div>

      {/* camera grid */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cameras.map((cam) => (
          <div key={cam.name} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative h-44 bg-[linear-gradient(160deg,#0b1322_0%,#101b31_100%)]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:40px_40px]" />

              {cam.online ? (
                <>
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
                  <button
                    type="button"
                    aria-label={`Expand ${cam.name}`}
                    className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-lg bg-black/60 text-white/80 hover:text-white"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <VideoOff className="size-8" />
                  <span className="text-xs font-semibold tracking-wide">FEED LOST</span>
                  <Button size="sm" variant="outline" className="mt-1 h-8 border-white/25 bg-transparent text-white/85 hover:bg-white/10" onClick={() => toggle(cam.name)}>
                    <RefreshCcw className="size-3.5" />
                    Reconnect
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                <Video className={cn("size-4 shrink-0", cam.online ? "text-brand" : "text-muted-foreground")} />
                <span className="truncate">{cam.name}</span>
              </span>
              <Badge variant="secondary" className="hidden sm:inline-flex">{cam.zone}</Badge>
              <Badge variant={cam.online ? "success" : "destructive"}>
                <span className="size-1.5 rounded-full bg-current" />
                {cam.online ? `${cam.cars} cars` : "Offline"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </OwnerShell>
  );
}

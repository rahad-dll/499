"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Cctv,
  Link2,
  Loader2,
  ParkingCircle,
  Pencil,
  Plus,
  ScanEye,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { InfoTip } from "@/components/InfoTip";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { CardGridSkeleton } from "@/components/portal/PageSkeleton";
import { CameraStatusBadge, SlotGrid, SlotLegend } from "@/components/portal/owner-widgets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { ParkingSpaceError, parkingSpacesRepository } from "@/lib/spaces/repository";
import type { InferenceResult } from "@/lib/spaces/types";
import { useLotOccupancy, useOwnerSpaces } from "@/lib/spaces/use-owner-spaces";
import { cn } from "@/lib/utils";

interface AiCheck {
  imageUrl: string;
  running: boolean;
  result?: InferenceResult;
  error?: string;
}

const RESULT_TONE: Record<string, string> = {
  available: "bg-emerald-500",
  not_available: "bg-red-500",
  unknown: "bg-slate-500",
};

const RESULT_TEXT: Record<string, string> = {
  available: "Slot free",
  not_available: "Slot occupied",
  unknown: "Unclear",
};

function StatValue({ loading, value }: { loading: boolean; value: number }) {
  return loading ? (
    <Skeleton className="my-1 h-6 w-10" />
  ) : (
    <div className="text-2xl font-extrabold tracking-tight">{value}</div>
  );
}

export default function CamerasPage() {
  const { spaces, loading, error, reload } = useOwnerSpaces();
  const occupancy = useLotOccupancy(spaces);
  const [formOpen, setFormOpen] = useState(false);
  const [formLot, setFormLot] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState<Record<string, AiCheck>>({});
  const objectUrls = useRef<string[]>([]);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const cameras = spaces.flatMap((space) => (space.cameras ?? []).map((camera) => ({ camera, space })));
  const online = cameras.filter(({ camera }) => camera.status === "active").length;
  const lotsWithoutCamera = spaces.filter((space) => (space.cameras ?? []).length === 0);

  function openForm(lotId = lotsWithoutCamera[0]?.id ?? spaces[0]?.id ?? "", url = "") {
    setFormLot(lotId);
    setFormUrl(url);
    setFormError(null);
    setFormOpen(true);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formLot) {
      setFormError("Choose a parking lot.");
      return;
    }
    if (!/^rtsps?:\/\/.+/i.test(formUrl.trim())) {
      setFormError("Enter a valid RTSP URL, e.g. rtsp://192.168.1.100:554/stream1");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await parkingSpacesRepository.update(formLot, { rtsp_url: formUrl.trim() });
      setFormOpen(false);
      reload();
    } catch (caught) {
      setFormError(caught instanceof ParkingSpaceError ? caught.message : "Could not save camera");
    } finally {
      setSaving(false);
    }
  }

  async function runAiCheck(key: string, lotId: string, file: File) {
    const imageUrl = URL.createObjectURL(file);
    objectUrls.current.push(imageUrl);
    setChecks((prev) => ({ ...prev, [key]: { imageUrl, running: true } }));
    try {
      const result = await parkingSpacesRepository.inferOccupancy(lotId, file);
      setChecks((prev) => ({ ...prev, [key]: { imageUrl, running: false, result } }));
    } catch (caught) {
      const message = caught instanceof ParkingSpaceError ? caught.message : "AI check failed";
      setChecks((prev) => ({ ...prev, [key]: { imageUrl, running: false, error: message } }));
    }
  }

  return (
    <OwnerShell active="cameras" breadcrumb="Cameras">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Camera management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect RTSP cameras and test the AI occupancy model on a snapshot.
          </p>
        </div>
        <Button variant="brand" className="h-11 rounded-xl" onClick={() => openForm()} disabled={spaces.length === 0}>
          <Plus className="size-4" />
          Add camera
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* add / edit camera */}
      {formOpen && (
        <form onSubmit={onSave} className="mt-5 rounded-2xl border border-brand/35 bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight">Connect a camera</h2>
            <button type="button" aria-label="Close" onClick={() => setFormOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            The API stores one camera per lot — saving replaces the lot’s current stream URL.
          </p>
          {formError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-[240px_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="camera_lot" className="mb-2 block">Parking lot</Label>
              <select
                id="camera_lot"
                value={formLot}
                onChange={(e) => setFormLot(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}{(space.cameras ?? []).length ? " (replace camera)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-0.5">
                <Label htmlFor="camera_url">RTSP stream URL</Label>
                <InfoTip term="rtsp" className="-my-1" />
              </div>
              <div className="relative flex items-center">
                <Link2 className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
                <Input
                  id="camera_url"
                  placeholder="rtsp://192.168.1.100:554/stream1"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" variant="brand" className="h-11" disabled={saving}>
              {saving ? "Saving…" : "Save camera"}
            </Button>
          </div>
        </form>
      )}

      {/* status strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <Cctv className="size-[22px]" />
          </span>
          <div>
            <StatValue loading={loading} value={cameras.length} />
            <div className="text-[13px] text-muted-foreground">Total cameras</div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Wifi className="size-[22px]" />
          </span>
          <div>
            <StatValue loading={loading} value={online} />
            <div className="text-[13px] text-muted-foreground">Streams online</div>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
            <WifiOff className="size-[22px]" />
          </span>
          <div>
            <StatValue loading={loading} value={cameras.length - online} />
            <div className="text-[13px] text-muted-foreground">Offline or in setup</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Browsers can’t play RTSP directly — each tile shows the AI’s live slot readings instead.
        </p>
        <SlotLegend />
      </div>

      {/* camera grid */}
      {loading ? (
        <LoadingRegion label="Loading cameras…">
          <CardGridSkeleton className="mt-4" />
        </LoadingRegion>
      ) : cameras.length === 0 ? (
        spaces.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={ParkingCircle}
            title="Register a parking lot first"
            description="Cameras belong to a parking lot. Register your lot, then connect its CCTV camera here."
            action={
              <Button asChild variant="brand">
                <Link href="/owner/spaces/new">Register a parking lot</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            className="mt-4"
            icon={Cctv}
            title="No cameras connected yet"
            description="Add your CCTV camera's RTSP stream so the AI can watch your slots and tell drivers which ones are free."
            action={
              <Button variant="brand" onClick={() => openForm()}>
                <Plus className="size-4" /> Add camera
              </Button>
            }
          />
        )
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cameras.map(({ camera, space }) => {
            const live = occupancy.byId[space.id];
            const check = checks[camera.id];
            return (
              <div key={camera.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#0b1322_0%,#101b31_100%)]">
                  {check ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                      <img src={check.imageUrl} alt={`Snapshot for ${space.name}`} className="absolute inset-0 size-full object-cover" />
                      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-sm text-white backdrop-blur-sm">
                        {check.running ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Running AI model… (can take ~1 min on a cold server)</span>
                        ) : check.error ? (
                          <span className="text-red-300">{check.error}</span>
                        ) : check.result ? (
                          <span className="flex items-center gap-2">
                            <span className={cn("size-2.5 rounded-full", RESULT_TONE[check.result.status] ?? RESULT_TONE.unknown)} />
                            <b>{RESULT_TEXT[check.result.status] ?? check.result.label}</b>
                            <span className="text-white/75">“{check.result.label}” · {Math.round(check.result.confidence * 100)}% confidence</span>
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="px-4 text-center">
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white">
                        <span className={cn("size-1.5 rounded-full", live && !live.is_stale ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-amber-400")} />
                        {live ? (live.is_stale ? "Stale AI data" : "Live AI") : "No AI data"}
                      </span>
                      {live ? (
                        <SlotGrid slots={live.slot_statuses} className="justify-center [&>span]:bg-white/10 [&>span]:text-white" />
                      ) : (
                        <p className="text-xs text-slate-400">Slot readings appear once the lot is active.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Video className={cn("size-4 shrink-0", camera.status === "active" ? "text-brand" : "text-muted-foreground")} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{camera.label || space.name}</span>
                    <CameraStatusBadge status={camera.status} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="max-w-36 truncate">{space.name}</Badge>
                    <span className="truncate">{camera.rtsp_url}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      ref={(el) => {
                        fileInputs.current[camera.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void runAiCheck(camera.id, space.id, file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="brand"
                      size="sm"
                      disabled={check?.running}
                      onClick={() => fileInputs.current[camera.id]?.click()}
                    >
                      <ScanEye className="size-4" />
                      Run AI check
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openForm(space.id, camera.rtsp_url)}>
                      <Pencil className="size-3.5" />
                      Edit stream
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lotsWithoutCamera.length > 0 && cameras.length > 0 && (
        <p className="mt-5 text-sm text-muted-foreground">
          {lotsWithoutCamera.length} lot{lotsWithoutCamera.length === 1 ? " has" : "s have"} no camera:{" "}
          {lotsWithoutCamera.map((s) => s.name).join(", ")}.
        </p>
      )}
    </OwnerShell>
  );
}

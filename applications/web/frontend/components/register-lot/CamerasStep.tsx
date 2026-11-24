"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  Building,
  Camera,
  Cctv,
  Clapperboard,
  Link2,
  Plus,
  Ruler,
  Sun,
  Trash2,
  Upload,
  Warehouse,
} from "lucide-react";
import { PendingPhoto, PhotoDropzone } from "@/components/PhotoDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DraftCamera } from "@/lib/spaces/layout";
import type { SpaceType } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";
import { Field, SectionTitle } from "./Field";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type LotForm, type LotFormPatch } from "./form-state";
import type { DraftCameras } from "./use-draft-cameras";

const SPACE_TYPES: { id: SpaceType; label: string; icon: typeof Sun }[] = [
  { id: "outdoor", label: "Outdoor", icon: Sun },
  { id: "indoor", label: "Indoor", icon: Warehouse },
  { id: "rooftop", label: "Rooftop", icon: Building },
];

/** Photos per lot sent with the registration. */
const MAX_PHOTOS = 10;

/** MP4 or QuickTime MOV; browsers play either when the video inside is H.264. */
const isDemoVideo = (file: File) =>
  file.type === "video/mp4" || file.type === "video/quicktime" || /\.(mp4|mov)$/i.test(file.name);
const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Step 2: parking type and height, extras, and the cameras (RTSP or a demo MP4/MOV). */
export function CamerasStep({
  form,
  update,
  cams,
  photos,
  setPhotos,
  locked,
}: {
  form: LotForm;
  update: (patch: LotFormPatch) => void;
  cams: DraftCameras;
  photos: File[];
  setPhotos: (change: (prev: File[]) => File[]) => void;
  locked: boolean;
}) {
  const [mode, setMode] = useState<"video" | "rtsp">("video");
  const [rtspUrl, setRtspUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);

  function addVideos(files: File[]) {
    if (!files.length) return;
    const wrongType = files.filter((f) => !isDemoVideo(f));
    const tooBig = files.filter((f) => isDemoVideo(f) && f.size > MAX_VIDEO_BYTES);
    const ok = files.filter((f) => isDemoVideo(f) && f.size <= MAX_VIDEO_BYTES);
    const problems = [
      wrongType.length ? `${wrongType.map((f) => f.name).join(", ")}: only MP4 or MOV videos are supported` : "",
      tooBig.length ? `${tooBig.map((f) => f.name).join(", ")}: larger than 100 MB` : "",
    ].filter(Boolean);
    setNotice(problems.length ? `${problems.join(". ")}.` : null);
    cams.addVideos(ok);
  }

  function addRtsp() {
    const url = rtspUrl.trim();
    if (!/^rtsps?:\/\/\S+$/i.test(url)) {
      setNotice("The stream URL must start with rtsp:// (for example rtsp://192.168.1.100:554/stream1).");
      return;
    }
    setNotice(null);
    cams.addRtsp(url);
    setRtspUrl("");
  }

  /** `files` are already checked and resized by PhotoDropzone. */
  function addPhotos(files: File[]) {
    setPhotos((prev) => [...prev, ...files].slice(0, MAX_PHOTOS));
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!locked) addVideos([...event.dataTransfer.files]);
  }

  return (
    <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* parking setup */}
      <div className="flex min-w-0 flex-col gap-3.5 lg:min-h-0">
        <div>
          <SectionTitle>Parking type</SectionTitle>
          <div role="radiogroup" aria-label="Parking type" className="grid grid-cols-3 gap-2">
            {SPACE_TYPES.map((t) => {
              const on = form.space_type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() => update({ space_type: t.id })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60",
                    on
                      ? "border-brand/60 bg-brand/10 text-teal-600 dark:text-brand"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <t.icon className="size-[18px]" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field
          label="Maximum vehicle height (cm)"
          name="max_height_cm"
          type="number"
          min="50"
          max="1000"
          icon={Ruler}
          placeholder="210 (leave empty if no limit)"
          value={form.max_height_cm}
          onChange={(e) => update({ max_height_cm: e.target.value })}
          disabled={locked}
        />

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
          <div>
            <div className="text-sm font-bold">Open 24/7</div>
            <div className="text-xs text-muted-foreground">Set exact hours later in Settings.</div>
          </div>
          <Switch checked={form.open24h} onCheckedChange={(v) => update({ open24h: v })} disabled={locked} aria-label="Open 24/7" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <Label htmlFor="description" className="mb-1.5 text-[13px]">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Covered parking near Gulshan-1 circle"
            value={form.description}
            disabled={locked}
            onChange={(e) => update({ description: e.target.value })}
            className="min-h-[72px] w-full flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50"
          />
        </div>

        <div>
          <SectionTitle end={<span className="text-[11px] text-muted-foreground">{photos.length}/{MAX_PHOTOS} · resized if large</span>}>
            Photos (optional)
          </SectionTitle>
          <div className="flex flex-wrap items-start gap-1.5">
            {photos.map((file, index) => (
              <PendingPhoto
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                disabled={locked}
                onRemove={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                className="size-14"
              />
            ))}
            <PhotoDropzone
              compact
              className="min-w-36 flex-1 [&>button]:h-14"
              disabled={locked}
              remaining={MAX_PHOTOS - photos.length}
              onFiles={addPhotos}
            >
              Add photos
            </PhotoDropzone>
          </div>
        </div>
      </div>

      {/* cameras */}
      <div className="flex min-w-0 flex-col lg:min-h-0">
        <SectionTitle
          end={
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {cams.cameras.length} added
            </span>
          }
        >
          Cameras
        </SectionTitle>

        {/* add a camera */}
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Camera source" className="inline-flex rounded-lg bg-muted p-0.5">
              {(
                [
                  { id: "video", label: "Demo video (MP4/MOV)", icon: Clapperboard },
                  { id: "rtsp", label: "RTSP stream", icon: Link2 },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => {
                    setMode(tab.id);
                    setNotice(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    mode === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {mode === "rtsp" ? (
              <div className="flex min-w-[240px] flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="RTSP stream URL"
                    placeholder="rtsp://192.168.1.100:554/stream1"
                    value={rtspUrl}
                    disabled={locked}
                    onChange={(e) => setRtspUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRtsp();
                      }
                    }}
                    className="h-9 pl-9 text-sm"
                  />
                </div>
                <Button type="button" size="sm" onClick={addRtsp} disabled={locked || !rtspUrl.trim()}>
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
            ) : (
              <button
                type="button"
                disabled={locked}
                onClick={() => videoInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex min-w-[240px] flex-1 items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                  dragging
                    ? "border-brand bg-brand/10 text-teal-600 dark:text-brand"
                    : "border-border text-muted-foreground hover:border-brand/50 hover:text-foreground",
                )}
              >
                <Upload className="size-4" />
                Drop or choose MP4/MOV files · loops as a demo feed · up to 100 MB
              </button>
            )}
          </div>
          <input
            ref={videoInput}
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            multiple
            className="hidden"
            onChange={(e) => {
              addVideos([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          {notice && <p className="mt-2 text-xs font-medium text-destructive">{notice}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Videos and snapshots are used here to mark slots and are not uploaded: the CityPulse API saves each
            camera’s name, stream URL, frame size and slots, but has no footage upload yet.
          </p>
        </div>

        {/* added cameras */}
        <div className="mt-3 min-h-[200px] lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          {cams.cameras.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
              <Cctv className="size-8 opacity-60" />
              <p className="max-w-xs">
                No cameras yet. Upload a demo video (MP4 or MOV) or add an RTSP stream. You’ll mark the parking slots on each one in the next step.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {cams.cameras.map((camera) => (
                <CameraCard key={camera.key} camera={camera} cams={cams} locked={locked} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CameraCard({ camera, cams, locked }: { camera: DraftCamera; cams: DraftCameras; locked: boolean }) {
  const snapshotInput = useRef<HTMLInputElement>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [unplayable, setUnplayable] = useState(false);

  function chooseSnapshot(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
      setSnapshotError("Use a JPG or PNG up to 5 MB.");
      return;
    }
    setSnapshotError(null);
    cams.setSnapshot(camera.key, file);
  }

  const detail =
    camera.source === "video"
      ? `${camera.video?.name ?? "video"} · ${megabytes(camera.video?.size ?? 0)}`
      : camera.rtsp_url;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-video bg-[#0b1322]">
        {camera.source === "video" && camera.previewUrl && (
          <video
            src={camera.previewUrl}
            autoPlay
            muted
            loop
            playsInline
            className="size-full object-cover"
            onLoadedMetadata={(e) =>
              cams.setFrame(camera.key, { width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
            }
            onError={() => setUnplayable(true)}
          />
        )}
        {unplayable && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b1322]/90 px-4 text-center text-[11px] leading-4 text-amber-300">
            This browser can’t play this video. Export it as MP4 (H.264) and add it again.
          </div>
        )}
        {camera.source === "rtsp" && camera.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img
            src={camera.previewUrl}
            alt={`${camera.label} snapshot`}
            className="size-full object-cover"
            onLoad={(e) =>
              cams.setFrame(camera.key, { width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
            }
          />
        )}
        {camera.source === "rtsp" && !camera.previewUrl && (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 px-4 text-center text-[11px] leading-4 text-slate-300">
            <Cctv className="size-6 text-[#18d6c0]" />
            Browsers can’t play RTSP. Add a snapshot from this camera to mark its slots.
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1 h-7 px-2.5 text-xs"
              disabled={locked}
              onClick={() => snapshotInput.current?.click()}
            >
              <Camera className="size-3.5" />
              Add snapshot
            </Button>
          </div>
        )}

        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
          {camera.source === "video" ? (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-[#18d6c0]" /> Demo loop
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-amber-400" /> RTSP
            </>
          )}
        </span>
        {camera.frame && (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {camera.frame.width}×{camera.frame.height}
          </span>
        )}
        <button
          type="button"
          aria-label={`Remove ${camera.label}`}
          disabled={locked}
          onClick={() => cams.remove(camera.key)}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-destructive disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="space-y-1 p-2.5">
        <input
          aria-label="Camera name"
          value={camera.label}
          maxLength={100}
          disabled={locked}
          onChange={(e) => cams.update(camera.key, { label: e.target.value })}
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold outline-none hover:border-border focus:border-ring"
        />
        {camera.source === "rtsp" ? (
          <input
            aria-label="RTSP stream URL"
            value={camera.rtsp_url}
            disabled={locked}
            onChange={(e) => cams.update(camera.key, { rtsp_url: e.target.value })}
            className="w-full truncate rounded-md border border-transparent bg-transparent px-1 py-0.5 font-mono text-[11px] text-muted-foreground outline-none hover:border-border focus:border-ring"
          />
        ) : (
          <p className="truncate px-1 text-[11px] text-muted-foreground" title={detail}>
            {detail}
          </p>
        )}
        {camera.source === "rtsp" && camera.previewUrl && (
          <button
            type="button"
            disabled={locked}
            onClick={() => snapshotInput.current?.click()}
            className="px-1 text-[11px] font-semibold text-teal-600 hover:underline dark:text-brand"
          >
            Replace snapshot
          </button>
        )}
        {snapshotError && <p className="px-1 text-[11px] text-destructive">{snapshotError}</p>}
      </div>

      <input
        ref={snapshotInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          chooseSnapshot(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

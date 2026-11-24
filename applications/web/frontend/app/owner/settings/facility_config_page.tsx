"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Building2,
  Cctv,
  CircleDollarSign,
  Clock,
  ImagePlus,
  Landmark,
  Layers,
  Link2,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Ruler,
  Save,
  ScanEye,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { InfoTip } from "@/components/InfoTip";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { LocationPicker } from "@/components/maps";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { CameraStatusBadge, LOT_STATUS, LotStatusBadge } from "@/components/portal/owner-widgets";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchQuery } from "@/lib/api/query-store";
import { spaceStatus } from "@/lib/insights/metrics";
import { ParkingSpaceError, parkingSpacesRepository, spaceKeys } from "@/lib/spaces/repository";
import type {
  ApiVehicleType,
  InferenceResult,
  OperatingHours,
  ParkingSpace,
  SpaceCameras,
  SpacePhoto,
  SpaceType,
  UpdateParkingSpaceInput,
} from "@/lib/spaces/types";
import { VEHICLE_TYPES } from "@/lib/spaces/layout";
import { useOwnerSpaces } from "@/lib/spaces/use-owner-spaces";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general", label: "General details" },
  { id: "location", label: "Location" },
  { id: "cameras", label: "Camera setup" },
  { id: "photos", label: "Photos" },
  { id: "pricing", label: "Pricing & payouts" },
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

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
  labelEnd,
  icon: Icon,
  className,
  ...props
}: ComponentProps<typeof Input> & { label: string; labelEnd?: ReactNode; icon: LucideIcon }) {
  const id = props.id ?? props.name;
  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        {labelEnd}
      </div>
      <div className="relative flex items-center">
        <Icon className="pointer-events-none absolute left-3.5 size-[18px] text-teal-600 dark:text-brand" />
        <Input id={id} className="h-[50px] bg-muted/50 pl-11" {...props} />
      </div>
    </div>
  );
}

function ToggleRow({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3.5">
      <div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-[13px] text-muted-foreground">{sub}</div>
      </div>
      {children}
    </div>
  );
}

/**
 * Whether drivers can book the lot. The API's only lot state is the admin
 * approval `status`; it has no owner open/closed setting, so the switch shows
 * the state but cannot change it.
 */
function AvailabilityPanel({ space }: { space: ParkingSpace }) {
  const status = spaceStatus(space);
  const bookable = status === "active";
  return (
    <div id="availability" className="mb-5 scroll-mt-24 rounded-xl border border-border bg-muted/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">Availability for drivers</span>
            <LotStatusBadge space={space} />
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{LOT_STATUS[status].detail}</p>
        </div>
        <label className="flex shrink-0 items-center gap-2.5 text-sm font-semibold">
          <span className={bookable ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
            {bookable ? "Open for bookings" : "Closed to bookings"}
          </span>
          <Switch checked={bookable} disabled aria-label="Open for bookings" />
        </label>
      </div>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        You can’t open or close a lot yourself yet. The CityPulse API only lets an admin change a lot’s status,
        and it has no owner open/closed setting. This switch will work once the backend adds one.
      </p>
    </div>
  );
}

/** Loads a presigned URL for one lot photo. */
function PhotoThumb({ lotId, photo, onDelete }: { lotId: string; photo: SpacePhoto; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    parkingSpacesRepository
      .photoUrl(lotId, photo)
      .then((value) => active && setUrl(value))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [lotId, photo]);

  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned storage URL
        <img src={url} alt="Parking lot photo" className="size-full object-cover" />
      ) : url === undefined ? (
        <Skeleton className="size-full rounded-none" />
      ) : (
        <div className="flex size-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
          {photo.s3_key}
        </div>
      )}
      {photo.is_primary && (
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-bold text-white">Primary</span>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete photo"
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg bg-black/60 text-white/85 hover:bg-destructive hover:text-white"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

const vehicleLabel = (type: ApiVehicleType) =>
  VEHICLE_TYPES.find((v) => v.id === type)?.label ?? type.charAt(0).toUpperCase() + type.slice(1);

/* ---------------- form model ---------------- */

interface LotForm {
  name: string;
  description: string;
  address: string;
  contact_phone: string;
  latitude: string;
  longitude: string;
  space_type: SpaceType;
  total_capacity: string;
  max_height_cm: string;
  rate: string;
  rtsp_url: string;
  is24h: boolean;
  open: string;
  close: string;
}

function formFromSpace(space: ParkingSpace): LotForm {
  const days = Object.values(space.operating_hours ?? {});
  const is24h =
    days.length === 7 && days.every((d) => d.open === "00:00" && (d.close === "23:59" || d.close === "24:00"));
  return {
    name: space.name,
    description: space.description ?? "",
    address: space.address ?? "",
    contact_phone: space.contact_phone ?? "",
    latitude: String(space.latitude),
    longitude: String(space.longitude),
    space_type: space.space_type,
    total_capacity: String(space.total_capacity),
    max_height_cm: space.max_height_cm != null ? String(space.max_height_cm) : "",
    rate: space.base_rate_unit != null ? String(space.base_rate_unit / 100) : "",
    rtsp_url: space.cameras?.[0]?.rtsp_url ?? "",
    is24h,
    open: days[0]?.open ?? "08:00",
    close: days[0]?.close ?? "22:00",
  };
}

function hoursFor(form: LotForm): OperatingHours {
  const slot = form.is24h ? { open: "00:00", close: "23:59" } : { open: form.open, close: form.close };
  return Object.fromEntries(DAYS.map((day) => [day, slot]));
}

/* ---------------- one lot editor ---------------- */

function LotEditor({ lotId, onChanged }: { lotId: string; onChanged: () => void }) {
  const router = useRouter();
  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [form, setForm] = useState<LotForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<InferenceResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const aiInput = useRef<HTMLInputElement>(null);
  /** cameras with their slots and the lot's rate per vehicle type (GET /spaces/:id/cameras) */
  const [layout, setLayout] = useState<SpaceCameras | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  /** vehicle-type rates (BDT text) the owner changed but has not saved */
  const [rateEdits, setRateEdits] = useState<Partial<Record<ApiVehicleType, string>>>({});

  useEffect(() => {
    let active = true;
    fetchQuery(spaceKeys.cameras(lotId), () => parkingSpacesRepository.cameras(lotId))
      .then((data) => {
        if (active) {
          setLayout(data);
          setLayoutError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setLayoutError(error instanceof ParkingSpaceError ? error.message : "Could not load cameras");
      });
    return () => {
      active = false;
    };
  }, [lotId, version]);

  // the lot list already seeded this key, so the editor usually opens without a request
  useEffect(() => {
    let active = true;
    fetchQuery(spaceKeys.one(lotId), () => parkingSpacesRepository.get(lotId))
      .then((data) => {
        if (!active) return;
        setSpace(data);
        // keep unsaved edits when refreshing after a photo upload/delete
        setForm((prev) => (prev ? { ...formFromSpace(data), ...pickUnsaved(prev, data) } : formFromSpace(data)));
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof ParkingSpaceError ? error.message : "Could not load parking lot");
      });
    return () => {
      active = false;
    };
  }, [lotId, version]);

  function set<K extends keyof LotForm>(field: K, value: LotForm[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function fail(error: unknown, fallback: string) {
    setNotice({ ok: false, text: error instanceof ParkingSpaceError ? error.message : fallback });
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !space) return;
    setNotice(null);

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const capacity = Number(form.total_capacity);
    if (!form.name.trim()) return setNotice({ ok: false, text: "Facility name is required." });
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return setNotice({ ok: false, text: "Choose a valid location on the map." });
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      return setNotice({ ok: false, text: "Total capacity must be a whole number of at least 1." });
    }

    const input: UpdateParkingSpaceInput = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      address: form.address.trim() || undefined,
      contact_phone: form.contact_phone.trim() || undefined,
      latitude,
      longitude,
      space_type: form.space_type,
      total_capacity: capacity,
      max_height_cm: form.max_height_cm ? Math.round(Number(form.max_height_cm)) : undefined,
      base_rate_unit: form.rate ? Math.round(Number(form.rate) * 100) : undefined,
      operating_hours: hoursFor(form),
    };
    const rtsp = form.rtsp_url.trim();
    if (rtsp && rtsp !== (space.cameras?.[0]?.rtsp_url ?? "")) input.rtsp_url = rtsp;

    const savedRates = Object.fromEntries((layout?.vehicle_rates ?? []).map((r) => [r.vehicle_type, r.hourly_rate_unit]));
    const rateChanges: { type: ApiVehicleType; paisa: number }[] = [];
    for (const [type, text] of Object.entries(rateEdits) as [ApiVehicleType, string][]) {
      const bdt = Number(text);
      if (!text.trim() || !Number.isFinite(bdt) || bdt <= 0) {
        return setNotice({ ok: false, text: `Enter an hourly rate above 0 for ${vehicleLabel(type)}.` });
      }
      const paisa = Math.round(bdt * 100);
      if (paisa !== savedRates[type]) rateChanges.push({ type, paisa });
    }

    setSaving(true);
    try {
      await parkingSpacesRepository.update(lotId, input);
      for (const change of rateChanges) {
        await parkingSpacesRepository.setVehicleRate(lotId, change.type, change.paisa);
      }
      setRateEdits({});
      setNotice({ ok: true, text: "Changes saved." });
      setForm(null);
      setVersion((v) => v + 1);
      onChanged();
    } catch (error) {
      fail(error, "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  /** `files` are already checked and resized by PhotoDropzone. */
  async function uploadPhotos(files: File[]) {
    if (!files.length) return;
    setBusy("photos");
    try {
      await parkingSpacesRepository.addPhotos(lotId, files);
      setVersion((v) => v + 1);
    } catch (error) {
      fail(error, "Could not upload photos");
    } finally {
      setBusy(null);
    }
  }

  async function deletePhoto(photoId: string) {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await parkingSpacesRepository.deletePhoto(lotId, photoId);
      setVersion((v) => v + 1);
    } catch (error) {
      fail(error, "Could not delete photo");
    }
  }

  async function runAiCheck(file: File | undefined) {
    if (!file) return;
    setBusy("ai");
    setAiResult(null);
    setAiError(null);
    try {
      setAiResult(await parkingSpacesRepository.inferOccupancy(lotId, file));
    } catch (error) {
      setAiError(error instanceof ParkingSpaceError ? error.message : "AI check failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteLot() {
    if (!space || !window.confirm(`Delete “${space.name}”? Drivers will no longer see it.`)) return;
    setBusy("delete");
    try {
      await parkingSpacesRepository.remove(lotId);
      router.push("/owner");
    } catch (error) {
      fail(error, "Could not delete parking lot");
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <Alert variant="destructive" className="mt-5">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }
  if (!space || !form) {
    return <SettingsSkeleton />;
  }

  const layoutCamera = (id: string) => layout?.cameras.find((c) => c.id === id);
  const vehicleRates = layout?.vehicle_rates ?? [];

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const picked = Number.isFinite(lat) && Number.isFinite(lng) && form.latitude && form.longitude ? { lat, lng } : null;

  return (
    <form onSubmit={onSave} className="mt-5 flex flex-col gap-5">
      {notice && (
        <Alert variant={notice.ok ? "success" : "destructive"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}

      {/* general details */}
      <SectionCard id="general" icon={Building2} iconClass="bg-teal-500/15 text-teal-600 dark:text-teal-400" title="General details" sub="Basic information about your parking facility.">
        <AvailabilityPanel space={space} />
        <div className="grid gap-5 lg:grid-cols-2">
          <IconField label="Facility name" name="name" icon={Building2} value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <IconField label="Location or address" name="address" icon={MapPin} value={form.address} onChange={(e) => set("address", e.target.value)} />
          <IconField label="Total parking capacity" name="total_capacity" type="number" min="1" icon={Layers} value={form.total_capacity} onChange={(e) => set("total_capacity", e.target.value)} required />
          <IconField label="Contact number" name="contact_phone" type="tel" icon={Phone} value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
          <div>
            <Label htmlFor="space_type" className="mb-2">Parking type</Label>
            <select
              id="space_type"
              value={form.space_type}
              onChange={(e) => set("space_type", e.target.value as SpaceType)}
              className="h-[50px] w-full rounded-lg border border-input bg-muted/50 px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
              <option value="rooftop">Rooftop</option>
            </select>
          </div>
          <IconField label="Maximum vehicle height (cm)" name="max_height_cm" type="number" min="0" icon={Ruler} placeholder="210" value={form.max_height_cm} onChange={(e) => set("max_height_cm", e.target.value)} />
          <div className="flex flex-col gap-3 lg:col-span-2">
            <ToggleRow title="Open 24/7" sub="Facility stays open around the clock.">
              <Switch checked={form.is24h} onCheckedChange={(checked) => set("is24h", checked)} aria-label="24/7 operations" />
            </ToggleRow>
            {!form.is24h && (
              <div className="grid gap-4 sm:grid-cols-2">
                <IconField label="Opens at (every day)" name="open" type="time" icon={Clock} value={form.open} onChange={(e) => set("open", e.target.value)} />
                <IconField label="Closes at (every day)" name="close" type="time" icon={Clock} value={form.close} onChange={(e) => set("close", e.target.value)} />
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="description" className="mb-2">Description</Label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full resize-y rounded-lg border border-input bg-muted/50 px-3 py-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            />
          </div>
        </div>
      </SectionCard>

      {/* location */}
      <SectionCard id="location" icon={MapPin} iconClass="bg-sky-500/15 text-sky-600 dark:text-sky-400" title="Location" sub="Click the map or drag the pin to move your lot.">
        <LocationPicker
          value={picked}
          onChange={(p) => {
            set("latitude", p.lat.toFixed(6));
            set("longitude", p.lng.toFixed(6));
          }}
          className="h-72"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <IconField label="Latitude" name="latitude" type="number" step="any" icon={Navigation} value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
          <IconField label="Longitude" name="longitude" type="number" step="any" icon={Navigation} value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
        </div>
      </SectionCard>

      {/* camera setup */}
      <SectionCard id="cameras" icon={Cctv} iconClass="bg-violet-500/15 text-violet-600 dark:text-violet-400" title="Camera setup" sub="Connect the CCTV stream used by the AI detection pipeline.">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <IconField label="RTSP stream URL" labelEnd={<InfoTip term="rtsp" className="-my-1" />} name="rtsp_url" icon={Link2} placeholder="rtsp://192.168.1.100:554/stream1" value={form.rtsp_url} onChange={(e) => set("rtsp_url", e.target.value)} />
          <div className="lg:mt-[26px]">
            <input ref={aiInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void runAiCheck(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="outline" size="lg" disabled={busy === "ai"} onClick={() => aiInput.current?.click()} className="w-full border-brand/50 text-teal-600 dark:text-brand lg:w-auto">
              {busy === "ai" ? <Loader2 className="size-4 animate-spin" /> : <ScanEye className="size-4" />}
              Test AI with a snapshot
            </Button>
          </div>
        </div>
        {(aiResult || aiError) && (
          <div className={cn("mt-3 rounded-xl border px-4 py-3 text-sm", aiError ? "border-destructive/35 bg-destructive/10 text-destructive" : "border-brand/35 bg-brand/5")}>
            {aiError ?? (aiResult && (
              <>
                AI result: <b>{aiResult.status === "available" ? "Slot free" : aiResult.status === "not_available" ? "Slot occupied" : "Unclear"}</b>{" "}
                (label “{aiResult.label}”, {Math.round(aiResult.confidence * 100)}% confidence)
                <InfoTip term="confidence" className="-my-1 ml-0.5" />
              </>
            ))}
          </div>
        )}

        <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Connected cameras</div>
        <div className="mt-3 flex flex-col gap-3">
          {(space.cameras ?? []).map((cam) => (
            <div key={cam.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-teal-600 dark:text-brand">
                <Video className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{layoutCamera(cam.id)?.label || cam.label || space.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[
                    cam.rtsp_url || (layoutCamera(cam.id)?.source_type === "video" ? "Demo video camera" : null),
                    layoutCamera(cam.id) && `${layoutCamera(cam.id)!.slots.length} slot${layoutCamera(cam.id)!.slots.length === 1 ? "" : "s"} marked`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </span>
              <CameraStatusBadge status={cam.status} />
            </div>
          ))}
          {(space.cameras ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No camera connected yet — enter an RTSP URL above and save.
            </div>
          )}
        </div>
      </SectionCard>

      {/* photos */}
      <SectionCard id="photos" icon={ImagePlus} iconClass="bg-amber-500/15 text-amber-600 dark:text-amber-400" title="Photos" sub="Photos drivers see for this lot. Large photos are resized automatically.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(space.photos ?? []).map((photo) => (
            <PhotoThumb key={photo.id} lotId={lotId} photo={photo} onDelete={() => deletePhoto(photo.id)} />
          ))}
          <PhotoDropzone
            className="col-span-2 sm:col-span-1 [&>button]:min-h-28 sm:[&>button]:aspect-[4/3]"
            busy={busy === "photos"}
            onFiles={uploadPhotos}
          />
        </div>
      </SectionCard>

      {/* pricing & payouts */}
      <SectionCard id="pricing" icon={CircleDollarSign} iconClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" title="Pricing & payouts" sub="Set your hourly rates.">
        <div className="mb-5">
          <div className="text-sm font-bold">Hourly rate per vehicle type</div>
          <p className="text-[13px] text-muted-foreground">
            What drivers pay per hour for a slot of that vehicle type, unless the slot has its own price.
          </p>
          {layoutError ? (
            <p className="mt-3 text-sm text-destructive">{layoutError}</p>
          ) : !layout ? (
            <Skeleton className="mt-3 h-[50px] w-full rounded-lg" />
          ) : vehicleRates.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              No vehicle rates yet. They are set when slots are marked in the Register wizard.
            </p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicleRates.map((rate) => (
                <IconField
                  key={rate.vehicle_type}
                  label={`${vehicleLabel(rate.vehicle_type)} (BDT / hour)`}
                  name={`rate-${rate.vehicle_type}`}
                  type="number"
                  min="0"
                  step="0.01"
                  icon={CircleDollarSign}
                  value={rateEdits[rate.vehicle_type] ?? String(rate.hourly_rate_unit / 100)}
                  onChange={(e) => setRateEdits((prev) => ({ ...prev, [rate.vehicle_type]: e.target.value }))}
                />
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <IconField label="Base hourly rate (BDT)" name="rate" type="number" min="0" step="0.01" icon={CircleDollarSign} placeholder="50" value={form.rate} onChange={(e) => set("rate", e.target.value)} />
          <IconField label="Payout account" name="payout" icon={Landmark} placeholder="Not available yet" disabled />
          <ToggleRow title="Dynamic surge pricing" sub="Coming soon — needs the pricing-rules API.">
            <Switch disabled aria-label="Dynamic surge pricing" />
          </ToggleRow>
          <ToggleRow title="Weekly auto-payout" sub="Coming soon — needs the payouts API.">
            <Switch disabled aria-label="Weekly auto-payout" />
          </ToggleRow>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={busy === "delete"} onClick={deleteLot} className="border-destructive/40 text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4" />
          {busy === "delete" ? "Deleting…" : "Delete parking lot"}
        </Button>
        <Button type="submit" variant="brand" size="lg" disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function SettingsSkeleton() {
  return (
    <LoadingRegion label="Loading parking lot…" className="mt-5 flex flex-col gap-5">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56 max-w-full" />
            </div>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j}>
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="mt-2 h-[50px] w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Photo/AI refreshes must not wipe fields the owner is still editing. */
function pickUnsaved(prev: LotForm, fresh: ParkingSpace): Partial<LotForm> {
  const saved = formFromSpace(fresh);
  return Object.fromEntries(
    (Object.keys(prev) as (keyof LotForm)[]).filter((k) => prev[k] !== saved[k]).map((k) => [k, prev[k]]),
  ) as Partial<LotForm>;
}

/* ---------------- page ---------------- */

function FacilityConfig() {
  const params = useSearchParams();
  const { spaces, loading, error, reload } = useOwnerSpaces();
  const [chosen, setChosen] = useState<string | null>(null);
  const [tab, setTab] = useState("general");

  const requested = params.get("lot");
  const lotId =
    chosen ?? (requested && spaces.some((s) => s.id === requested) ? requested : spaces[0]?.id ?? null);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Facility settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage facility details, connect AI cameras, and set pricing.
          </p>
        </div>
        {spaces.length > 0 && (
          <select
            aria-label="Choose parking lot"
            value={lotId ?? ""}
            onChange={(e) => setChosen(e.target.value)}
            className="h-11 max-w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
          >
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* tab pills (scroll to section) */}
      <div className="mt-5 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-brand/10 text-teal-600 dark:text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </a>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading ? (
        <SettingsSkeleton />
      ) : !lotId ? (
        <EmptyState
          className="mt-5"
          icon={Building2}
          title="No parking lots to set up yet"
          description="Once you register a lot, you can edit its details, location, camera, photos and prices here."
          action={
            <Button asChild variant="brand">
              <Link href="/owner/spaces/new">Register a parking lot</Link>
            </Button>
          }
        />
      ) : (
        <LotEditor key={lotId} lotId={lotId} onChanged={reload} />
      )}
    </>
  );
}

export default function FacilityConfigPage() {
  return (
    <OwnerShell active="settings" breadcrumb="Settings">
      <Suspense fallback={null}>
        <FacilityConfig />
      </Suspense>
    </OwnerShell>
  );
}

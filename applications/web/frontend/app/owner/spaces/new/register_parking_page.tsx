"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  Building2,
  CircleDollarSign,
  ImagePlus,
  Layers,
  Link2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Ruler,
  Save,
  X,
} from "lucide-react";
import { TextField } from "@/components/form";
import { LocationPicker } from "@/components/maps";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ParkingSpaceError,
  parkingSpacesRepository,
} from "@/lib/spaces/repository";
import type { SpaceType } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";

const AMENITIES = [
  { id: "cctv", label: "CCTV" },
  { id: "covered", label: "Covered" },
  { id: "security_guard", label: "Security guard" },
  { id: "ev_charging", label: "EV charging" },
  { id: "wheelchair_access", label: "Wheelchair access" },
  { id: "washroom", label: "Washroom" },
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function RegisterParkingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [spaceType, setSpaceType] = useState<SpaceType>("outdoor");
  const [capacity, setCapacity] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [open24h, setOpen24h] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const lat = Number(latitude);
  const lng = Number(longitude);
  const picked = latitude && longitude && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  function pick(location: { lat: number; lng: number }) {
    setLatitude(location.lat.toFixed(6));
    setLongitude(location.lng.toFixed(6));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser can’t share its location. Click the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        pick({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Could not get your location. Click the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function addPhotos(files: FileList | null) {
    const chosen = [...(files ?? [])];
    const tooBig = chosen.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig.length) setError(`${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} larger than 5 MB.`);
    setPhotos((prev) => [...prev, ...chosen.filter((f) => f.size <= MAX_PHOTO_BYTES)].slice(0, 10));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedCapacity = Number(capacity);
    const parsedRate = hourlyRate ? Math.round(Number(hourlyRate) * 100) : undefined;

    if (!name.trim() || !picked) {
      setError("Facility name and a location (click the map) are required.");
      return;
    }
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError("Total capacity must be at least 1.");
      return;
    }
    if (rtspUrl.trim() && !/^rtsps?:\/\/.+/i.test(rtspUrl.trim())) {
      setError("The camera URL must start with rtsp://");
      return;
    }

    setSubmitting(true);
    let lotId = createdId;
    try {
      if (!lotId) {
        const created = await parkingSpacesRepository.create({
          name: name.trim(),
          description: description.trim() || undefined,
          address: address.trim() || undefined,
          contact_phone: phone.trim() || undefined,
          latitude: picked.lat,
          longitude: picked.lng,
          space_type: spaceType,
          total_capacity: parsedCapacity,
          base_rate_unit: parsedRate,
          max_height_cm: maxHeight ? Math.round(Number(maxHeight)) : undefined,
          amenities: amenities.length ? amenities : undefined,
          operating_hours: open24h
            ? Object.fromEntries(DAYS.map((d) => [d, { open: "00:00", close: "23:59" }]))
            : undefined,
          rtsp_url: rtspUrl.trim() || undefined,
        });
        lotId = created.id;
        setCreatedId(lotId);
      }
      if (photos.length) await parkingSpacesRepository.addPhotos(lotId, photos);
      router.push("/owner?registered=1");
    } catch (caught) {
      const message = caught instanceof ParkingSpaceError ? caught.message : "Could not register parking lot";
      setError(lotId ? `Your lot was registered, but the photos failed to upload: ${message}` : message);
      setSubmitting(false);
    }
  }

  return (
    <OwnerShell active="register" breadcrumb="Register Parking Lot">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          Register a Parking Lot
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a facility to CityPulse using the live parking API.
        </p>

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>
              {error}
              {createdId && (
                <>
                  {" "}
                  <Link href={`/owner/settings?lot=${createdId}#photos`} className="font-semibold underline">
                    Manage photos in Settings
                  </Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-7"
        >
          <div className="grid gap-x-6 sm:grid-cols-2">
            <TextField label="Facility Name" name="name" icon={Building2} placeholder="Gulshan Parking Zone A" value={name} onChange={(event) => setName(event.target.value)} required disabled={!!createdId} />
            <TextField label="Contact Number" name="contact_phone" type="tel" icon={Phone} placeholder="01712345678" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!!createdId} />
            <TextField label="Address" name="address" icon={MapPin} placeholder="House 12, Road 5, Gulshan" value={address} onChange={(event) => setAddress(event.target.value)} disabled={!!createdId} />
            <TextField label="Total Capacity" name="total_capacity" type="number" min="1" max="10000" icon={Layers} placeholder="50" value={capacity} onChange={(event) => setCapacity(event.target.value)} required disabled={!!createdId} />
          </div>

          {/* location */}
          <div className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label>Location — click the map or drag the pin</Label>
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating || !!createdId}>
                <LocateFixed className="size-4" />
                {locating ? "Locating…" : "Use my location"}
              </Button>
            </div>
            <LocationPicker value={picked} onChange={pick} className="h-72" />
          </div>

          <div className="grid gap-x-6 sm:grid-cols-2">
            <TextField label="Latitude" name="latitude" type="number" step="any" min="-90" max="90" icon={Navigation} placeholder="23.7937" value={latitude} onChange={(event) => setLatitude(event.target.value)} required disabled={!!createdId} />
            <TextField label="Longitude" name="longitude" type="number" step="any" min="-180" max="180" icon={Navigation} placeholder="90.4066" value={longitude} onChange={(event) => setLongitude(event.target.value)} required disabled={!!createdId} />

            <div className="mt-5">
              <Label htmlFor="space_type" className="mb-2 block">
                Parking Type
              </Label>
              <select
                id="space_type"
                name="space_type"
                value={spaceType}
                disabled={!!createdId}
                onChange={(event) => setSpaceType(event.target.value as SpaceType)}
                className="h-[50px] w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
                <option value="rooftop">Rooftop</option>
              </select>
            </div>

            <TextField label="Hourly Rate (BDT)" name="hourly_rate" type="number" min="0" step="0.01" icon={CircleDollarSign} placeholder="50" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} disabled={!!createdId} />
            <TextField label="Max Vehicle Height (cm)" name="max_height_cm" type="number" min="0" icon={Ruler} placeholder="210" value={maxHeight} onChange={(event) => setMaxHeight(event.target.value)} disabled={!!createdId} />
            <TextField label="RTSP Camera URL" name="rtsp_url" icon={Link2} placeholder="rtsp://192.168.1.100:554/stream1" value={rtspUrl} onChange={(event) => setRtspUrl(event.target.value)} disabled={!!createdId} />
          </div>

          {/* amenities + hours */}
          <div className="mt-6">
            <Label className="mb-2 block">Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = amenities.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    disabled={!!createdId}
                    onClick={() => setAmenities((prev) => (on ? prev.filter((x) => x !== a.id) : [...prev, a.id]))}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                      on ? "border-brand/50 bg-brand/10 text-teal-600 dark:text-brand" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3.5">
            <div>
              <div className="text-sm font-bold">Open 24/7</div>
              <div className="text-[13px] text-muted-foreground">You can set exact hours later in Settings.</div>
            </div>
            <Switch checked={open24h} onCheckedChange={setOpen24h} disabled={!!createdId} aria-label="Open 24/7" />
          </div>

          <div className="mt-5">
            <Label htmlFor="description" className="mb-2 block">
              Description
            </Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Covered parking near Gulshan-1 circle"
              value={description}
              disabled={!!createdId}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
          </div>

          {/* photos */}
          <div className="mt-5">
            <Label className="mb-2 block">Photos (optional, up to 10 · 5 MB each)</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex max-w-56 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs">
                  <span className="truncate">{file.name}</span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => photoInput.current?.click()}>
                <ImagePlus className="size-4" />
                Add photos
              </Button>
            </div>
            <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          </div>

          <div className="mt-7 flex justify-end">
            <Button type="submit" variant="brand" size="lg" disabled={submitting}>
              <Save className="size-4" />
              {submitting ? "Registering…" : createdId ? "Retry Photo Upload" : "Register Parking Lot"}
            </Button>
          </div>
        </form>
      </div>
    </OwnerShell>
  );
}

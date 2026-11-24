"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  LocateFixed,
  MapPin,
  MousePointerClick,
  Navigation,
  Phone,
  Search,
} from "lucide-react";
import { LocationPicker, type PickedLocation } from "@/components/maps";
import { Button } from "@/components/ui/button";
import { searchAddress, type GeocodeResult } from "@/lib/geo/geocode";
import { cn } from "@/lib/utils";
import { Field, SectionTitle } from "./Field";
import { AMENITIES, pickedLocation, type LotForm, type LotFormPatch } from "./form-state";

type Lookup =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; results: GeocodeResult[]; applied: GeocodeResult | null }
  | { status: "error" };

/** Step 1: name, contact, address (looked up into coordinates), map, amenities. */
export function DetailsStep({
  form,
  update,
  locked,
}: {
  form: LotForm;
  update: (patch: LotFormPatch) => void;
  locked: boolean;
}) {
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastQuery = useRef("");
  const inFlight = useRef<AbortController | null>(null);
  const picked = pickedLocation(form);

  useEffect(() => () => inFlight.current?.abort(), []);

  function setPin(location: PickedLocation, source: LotForm["pin_source"]) {
    update({
      latitude: location.lat.toFixed(6),
      longitude: location.lng.toFixed(6),
      pin_source: source,
    });
  }

  function applyMatch(match: GeocodeResult, results: GeocodeResult[]) {
    setPin(match, "address");
    setLookup({ status: "done", results, applied: match });
    setMatchesOpen(false);
  }

  /** Looks up the typed address. `force` re-runs it and moves a manually placed pin too. */
  async function locate(force = false) {
    const query = form.address.trim();
    if (locked || query.length < 4 || (!force && query === lastQuery.current)) return;
    lastQuery.current = query;

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLookup({ status: "searching" });
    setMatchesOpen(false);
    try {
      const results = await searchAddress(query, controller.signal);
      if (controller.signal.aborted) return;
      const best = results[0] ?? null;
      // an address lookup never overrides a pin the owner placed, unless asked to
      if (best && (force || form.pin_source !== "manual")) applyMatch(best, results);
      else setLookup({ status: "done", results, applied: null });
    } catch {
      if (!controller.signal.aborted) setLookup({ status: "error" });
    }
  }

  function useMyLocation() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("This browser can’t share its location. Click the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin({ lat: position.coords.latitude, lng: position.coords.longitude }, "manual");
        setLocating(false);
      },
      () => {
        setGpsError("Could not get your location. Click the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const results = lookup.status === "done" ? lookup.results : [];

  return (
    <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      {/* fields */}
      <div className="flex min-w-0 flex-col gap-3.5">
        <Field
          label="Facility name"
          name="name"
          icon={Building2}
          placeholder="Gulshan Parking Zone A"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          disabled={locked}
          autoFocus
          required
        />
        <Field
          label="Contact number"
          name="contact_phone"
          type="tel"
          icon={Phone}
          placeholder="01712345678"
          value={form.contact_phone}
          onChange={(e) => update({ contact_phone: e.target.value })}
          disabled={locked}
        />

        <div className="relative">
          <Field
            label="Address"
            name="address"
            icon={MapPin}
            placeholder="House 12, Road 5, Gulshan, Dhaka"
            autoComplete="street-address"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            onBlur={() => locate()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void locate(true);
              }
            }}
            disabled={locked}
            end={
              <button
                type="button"
                onClick={() => locate(true)}
                disabled={locked || form.address.trim().length < 4}
                aria-label="Find this address on the map"
                title="Find on map"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                {lookup.status === "searching" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </button>
            }
          />

          {/* lookup status, one line so the layout never jumps */}
          <div className="mt-1.5 flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
            {lookup.status === "idle" && <span>Press Enter or leave the field to pin it on the map.</span>}
            {lookup.status === "searching" && <span>Looking up the address…</span>}
            {lookup.status === "error" && <span className="text-warning">Address lookup is unavailable. Click the map instead.</span>}
            {lookup.status === "done" && !results.length && (
              <span className="text-warning">No match found. Click the map to drop the pin.</span>
            )}
            {lookup.status === "done" && results.length > 0 && (
              <>
                {lookup.applied ? (
                  <span className="flex min-w-0 items-center gap-1 text-teal-600 dark:text-brand">
                    <Check className="size-3.5 shrink-0" />
                    <span className="truncate">Pinned: {lookup.applied.label}</span>
                  </span>
                ) : (
                  <span className="truncate">Pin kept where you placed it.</span>
                )}
                {(results.length > 1 || !lookup.applied) && (
                  <button
                    type="button"
                    onClick={() => setMatchesOpen((open) => !open)}
                    disabled={locked}
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 font-semibold text-foreground hover:underline"
                  >
                    {lookup.applied ? `${results.length - 1} other match${results.length > 2 ? "es" : ""}` : "Use address match"}
                    <ChevronDown className="size-3.5" />
                  </button>
                )}
              </>
            )}
          </div>

          {matchesOpen && results.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-popover py-1 text-sm shadow-lg">
              {results.map((match) => (
                <li key={`${match.lat},${match.lng}`}>
                  <button
                    type="button"
                    onClick={() => applyMatch(match, results)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">{match.label}</span>
                    {lookup.status === "done" && lookup.applied === match && (
                      <Check className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-brand" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Latitude"
            name="latitude"
            type="number"
            step="any"
            min="-90"
            max="90"
            icon={Navigation}
            placeholder="23.7937"
            value={form.latitude}
            onChange={(e) => update({ latitude: e.target.value, pin_source: "manual" })}
            disabled={locked}
          />
          <Field
            label="Longitude"
            name="longitude"
            type="number"
            step="any"
            min="-180"
            max="180"
            icon={Navigation}
            placeholder="90.4066"
            value={form.longitude}
            onChange={(e) => update({ longitude: e.target.value, pin_source: "manual" })}
            disabled={locked}
          />
        </div>

        <div>
          <SectionTitle>Amenities</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {AMENITIES.map((a) => {
              const on = form.amenities.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  disabled={locked}
                  onClick={() =>
                    // from the latest form, so quick successive toggles all stick
                    update((prev) => ({
                      amenities: prev.amenities.includes(a.id)
                        ? prev.amenities.filter((x) => x !== a.id)
                        : [...prev.amenities, a.id],
                    }))
                  }
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60",
                    on
                      ? "border-brand/50 bg-brand/10 text-teal-600 dark:text-brand"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* map */}
      <div className="relative h-[300px] min-w-0 lg:h-full lg:min-h-0">
        <LocationPicker
          value={picked}
          onChange={(location) => !locked && setPin(location, "manual")}
          className="h-full"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={locating || locked}
          className="absolute right-3 top-3 z-10 shadow-md"
        >
          <LocateFixed className="size-4" />
          {locating ? "Locating…" : "Use my location"}
        </Button>
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
          <MousePointerClick className="size-3.5 shrink-0 text-teal-600 dark:text-brand" />
          <span className="truncate">
            {gpsError ?? (picked ? "Drag the pin or click the map to fine-tune" : "Click the map to drop the pin")}
          </span>
        </div>
      </div>
    </div>
  );
}

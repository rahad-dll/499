"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Cctv, MousePointer2, Pause, Play, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VEHICLE_TYPES,
  cameraPrefix,
  duplicateLabels,
  newKey,
  nextSlotLabel,
  slotRate,
  vehicleType,
  type DraftSlot,
  type VehicleRates,
} from "@/lib/spaces/layout";
import type { VehicleType } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./Field";
import { MAX_IMAGE_BYTES } from "./form-state";
import { SlotEditor } from "./SlotEditor";
import type { DraftCameras } from "./use-draft-cameras";

/** Step 3: mark slots on each camera's footage, one camera at a time, and price them. */
export function SlotsStep({
  cams,
  rates,
  setRates,
  activeIndex,
  setActiveIndex,
  locked,
}: {
  cams: DraftCameras;
  rates: VehicleRates;
  setRates: (change: (prev: VehicleRates) => VehicleRates) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  locked: boolean;
}) {
  const [drawType, setDrawType] = useState<VehicleType>("car");
  const [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const snapshotInput = useRef<HTMLInputElement>(null);

  const camera = cams.cameras[activeIndex] ?? cams.cameras[0];
  const allSlots = cams.cameras.flatMap((c) => c.slots);
  const dupes = duplicateLabels(cams.cameras);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    if (selected) rowRefs.current.get(selected)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!camera) return null;

  function flash(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }

  function editSlot(key: string, patch: Partial<DraftSlot>) {
    cams.setSlots(camera.key, (slots) => slots.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function deleteSlot(key: string) {
    cams.setSlots(camera.key, (slots) => slots.filter((s) => s.key !== key));
    if (selected === key) setSelected(null);
  }

  const cheapest = allSlots.length
    ? Math.min(...allSlots.map((s) => Number(slotRate(s, rates)) || 0))
    : null;

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      {/* one tab per camera */}
      <div role="tablist" aria-label="Cameras" className="flex shrink-0 gap-2 overflow-x-auto pb-0.5">
        {cams.cameras.map((c, index) => {
          const active = c.key === camera.key;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveIndex(index);
                setSelected(null);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                active
                  ? "border-brand/60 bg-brand/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-md text-[11px] font-extrabold",
                  active ? "bg-brand text-[#0b1322]" : "bg-muted text-muted-foreground",
                )}
              >
                {cameraPrefix(index)}
              </span>
              <span className="max-w-36 truncate">{c.label}</span>
              {c.slots.length ? (
                <span className="rounded-full bg-muted px-1.5 text-[11px] font-bold">{c.slots.length}</span>
              ) : (
                <TriangleAlert className="size-3.5 text-warning" aria-label="no slots yet" />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* footage */}
        <div className="flex min-w-0 flex-col gap-2 lg:min-h-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">Draw as</span>
            {VEHICLE_TYPES.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={drawType === v.id}
                disabled={locked}
                onClick={() => setDrawType(v.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                  drawType === v.id ? "text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
                style={drawType === v.id ? { borderColor: v.color, background: `${v.color}1f` } : undefined}
              >
                <span className="size-2.5 rounded-[3px]" style={{ background: v.color }} />
                {v.label}
              </button>
            ))}
            {camera.source === "video" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto h-7 px-2.5 text-xs"
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                {paused ? "Play" : "Pause"}
              </Button>
            )}
          </div>

          {camera.previewUrl ? (
            <SlotEditor
              key={camera.key}
              camera={camera}
              drawType={drawType}
              selected={selected}
              onSelect={setSelected}
              onCreate={(box) => {
                const slot: DraftSlot = {
                  key: newKey("slot"),
                  label: nextSlotLabel(cameraPrefix(activeIndex), allSlots.map((s) => s.label)),
                  vehicle_type: drawType,
                  rate: "",
                  box,
                };
                cams.setSlots(camera.key, (slots) => [...slots, slot]);
                setSelected(slot.key);
              }}
              onChange={(key, box) => editSlot(key, { box })}
              onDelete={deleteSlot}
              onFrame={(frame) => cams.setFrame(camera.key, frame)}
              onBlocked={flash}
              paused={paused}
              locked={locked}
              className="h-[56vw] max-h-[440px] min-h-[220px] lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1"
            />
          ) : (
            <div className="flex h-[56vw] max-h-[440px] min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl bg-[#0b1322] px-6 text-center text-sm text-slate-300 lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              <Cctv className="size-8 text-[#18d6c0]" />
              <p className="max-w-sm">
                Browsers can’t play RTSP streams. Upload a snapshot from <b>{camera.label}</b> (same view and
                resolution as the stream) to mark its slots.
              </p>
              <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => snapshotInput.current?.click()}>
                <Camera className="size-4" />
                Upload snapshot
              </Button>
              <input
                ref={snapshotInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) flash("Use a JPG or PNG up to 5 MB.");
                  else cams.setSnapshot(camera.key, file);
                }}
              />
            </div>
          )}

          <p
            aria-live="polite"
            className={cn(
              "flex min-h-4 items-center gap-1.5 text-xs",
              notice ? "font-semibold text-destructive" : "text-muted-foreground",
            )}
          >
            {notice ?? (
              <>
                <MousePointer2 className="size-3.5 shrink-0" />
                Drag on the footage to mark a slot · drag a slot to move it, its corners to resize · Delete removes ·
                arrows nudge
              </>
            )}
          </p>
        </div>

        {/* rates + slot list */}
        <aside className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <div className="rounded-xl border border-border p-3">
            <SectionTitle end={<span className="text-[11px] text-muted-foreground">৳ per hour</span>}>
              Rate by vehicle
            </SectionTitle>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {VEHICLE_TYPES.map((v) => (
                <label key={v.id} className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: v.color }} />
                  <span className="w-14 shrink-0 truncate">{v.label}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="decimal"
                    value={rates[v.id]}
                    disabled={locked}
                    onChange={(e) => setRates((prev) => ({ ...prev, [v.id]: e.target.value }))}
                    className="h-7 w-full min-w-0 rounded-md border border-input bg-card px-2 text-right text-xs outline-none focus-visible:border-ring disabled:opacity-50"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex min-h-[200px] flex-col overflow-hidden rounded-xl border border-border lg:min-h-0 lg:flex-1">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <h3 className="truncate text-sm font-bold">Slots · {camera.label}</h3>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                {camera.slots.length}
              </span>
            </div>
            <div className="grid grid-cols-[4px_64px_minmax(0,1fr)_56px_28px] gap-1.5 border-b border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span />
              <span>ID</span>
              <span>Vehicle</span>
              <span className="text-right">৳/hr</span>
              <span />
            </div>
            <ul className="flex-1 overflow-y-auto p-1.5">
              {camera.slots.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No slots yet. Drag a rectangle over each parking space on the footage.
                </li>
              )}
              {camera.slots.map((slot) => {
                const color = vehicleType(slot.vehicle_type).color;
                const duplicate = dupes.has(slot.label.trim().toUpperCase());
                return (
                  <li
                    key={slot.key}
                    ref={(el) => {
                      if (el) rowRefs.current.set(slot.key, el);
                      else rowRefs.current.delete(slot.key);
                    }}
                    onClick={() => setSelected(slot.key)}
                    className={cn(
                      "grid grid-cols-[4px_64px_minmax(0,1fr)_56px_28px] items-center gap-1.5 rounded-lg px-1 py-1",
                      slot.key === selected ? "bg-brand/10 ring-1 ring-brand/40" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="h-6 rounded-full" style={{ background: color }} />
                    <input
                      aria-label="Slot ID"
                      value={slot.label}
                      maxLength={20}
                      disabled={locked}
                      onFocus={() => setSelected(slot.key)}
                      onChange={(e) => editSlot(slot.key, { label: e.target.value.toUpperCase() })}
                      className={cn(
                        "h-7 w-full rounded-md border bg-card px-1.5 font-mono text-xs font-bold uppercase outline-none focus-visible:border-ring disabled:opacity-50",
                        duplicate || !slot.label.trim() ? "border-destructive" : "border-input",
                      )}
                    />
                    <select
                      aria-label="Vehicle type"
                      value={slot.vehicle_type}
                      disabled={locked}
                      onFocus={() => setSelected(slot.key)}
                      onChange={(e) => editSlot(slot.key, { vehicle_type: e.target.value as VehicleType })}
                      className="h-7 w-full min-w-0 rounded-md border border-input bg-card px-1 text-xs outline-none focus-visible:border-ring disabled:opacity-50"
                    >
                      {VEHICLE_TYPES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Hourly rate for this slot (empty uses the vehicle rate)"
                      type="number"
                      min="1"
                      inputMode="decimal"
                      value={slot.rate}
                      placeholder={rates[slot.vehicle_type]}
                      disabled={locked}
                      onFocus={() => setSelected(slot.key)}
                      onChange={(e) => editSlot(slot.key, { rate: e.target.value })}
                      className="h-7 w-full rounded-md border border-input bg-card px-1.5 text-right text-xs outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring disabled:opacity-50"
                    />
                    <button
                      type="button"
                      aria-label={`Delete slot ${slot.label}`}
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlot(slot.key);
                      }}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Lot total: <b className="text-foreground">{allSlots.length}</b> slot{allSlots.length === 1 ? "" : "s"} on{" "}
              {cams.cameras.length} camera{cams.cameras.length === 1 ? "" : "s"}
              {cheapest !== null && cheapest > 0 && (
                <>
                  {" "}· from <b className="text-foreground">৳{cheapest}</b>/hr
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

import type {
  CreateCameraInput,
  CreateParkingSpaceInput,
  OperatingHours,
  SpaceType,
  VehicleRate,
  VehicleType,
} from "./types";

/* ---------- vehicle types ---------- */

export const VEHICLE_TYPES: {
  id: VehicleType;
  label: string;
  color: string;
  /** suggested hourly rate in BDT, editable per lot */
  defaultRate: number;
}[] = [
  { id: "car", label: "Car", color: "#18d6c0", defaultRate: 50 },
  { id: "motorcycle", label: "Bike", color: "#f59e0b", defaultRate: 20 },
  { id: "cng", label: "CNG", color: "#22c55e", defaultRate: 30 },
  { id: "microbus", label: "Microbus", color: "#8b6cff", defaultRate: 80 },
  { id: "bicycle", label: "Bicycle", color: "#38bdf8", defaultRate: 10 },
  { id: "truck", label: "Truck", color: "#f43f5e", defaultRate: 120 },
];

export const vehicleType = (id: VehicleType) =>
  VEHICLE_TYPES.find((v) => v.id === id) ?? VEHICLE_TYPES[0];

/** Hourly rates in BDT keyed by vehicle type, as typed in the form. */
export type VehicleRates = Record<VehicleType, string>;

export const defaultVehicleRates = (): VehicleRates =>
  Object.fromEntries(VEHICLE_TYPES.map((v) => [v.id, String(v.defaultRate)])) as VehicleRates;

/* ---------- geometry ----------
 * Slots are axis-aligned rectangles in the camera frame's own pixels
 * (videoWidth × videoHeight), so the backend can crop frames with them as-is. */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Frame {
  width: number;
  height: number;
}

/** Smallest slot side, as a share of the frame's shorter side. */
const MIN_SIDE_SHARE = 0.02;

export const minSlotSide = (frame: Frame) =>
  Math.max(4, Math.round(Math.min(frame.width, frame.height) * MIN_SIDE_SHARE));

/** Rectangles that only touch along an edge do not overlap. */
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function overlapsAny(box: Box, others: Box[]): boolean {
  return others.some((other) => overlaps(box, other));
}

/** The box spanned by two corner points, clipped to the frame. */
export function boxFromPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
  frame: Frame,
): Box {
  const clampX = (v: number) => Math.min(Math.max(v, 0), frame.width);
  const clampY = (v: number) => Math.min(Math.max(v, 0), frame.height);
  const x1 = clampX(Math.min(a.x, b.x));
  const y1 = clampY(Math.min(a.y, b.y));
  const x2 = clampX(Math.max(a.x, b.x));
  const y2 = clampY(Math.max(a.y, b.y));
  return { x: Math.round(x1), y: Math.round(y1), width: Math.round(x2 - x1), height: Math.round(y2 - y1) };
}

/** `box` moved by (dx, dy), kept fully inside the frame. */
export function moveBox(box: Box, dx: number, dy: number, frame: Frame): Box {
  return {
    ...box,
    x: Math.round(Math.min(Math.max(box.x + dx, 0), frame.width - box.width)),
    y: Math.round(Math.min(Math.max(box.y + dy, 0), frame.height - box.height)),
  };
}

/* ---------- draft state ---------- */

export interface DraftSlot {
  key: string;
  label: string;
  vehicle_type: VehicleType;
  /** per-slot hourly rate in BDT; empty uses the vehicle type's rate */
  rate: string;
  box: Box;
}

export interface DraftCamera {
  key: string;
  label: string;
  source: "rtsp" | "video";
  rtsp_url: string;
  /** the uploaded MP4 (video cameras) */
  video: File | null;
  /** a still frame to mark slots on (RTSP cameras, which browsers can't play) */
  snapshot: File | null;
  /** object URL of `video` or `snapshot` for previews */
  previewUrl: string | null;
  /** native size of the footage, read when it loads */
  frame: Frame | null;
  slots: DraftSlot[];
}

let keySeq = 0;
export const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(keySeq++).toString(36)}`;

/** Camera 1 → "A", camera 2 → "B", … camera 27 → "AA". */
export function cameraPrefix(index: number): string {
  let n = index + 1;
  let prefix = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    prefix = String.fromCharCode(65 + rem) + prefix;
    n = Math.floor((n - 1) / 26);
  }
  return prefix;
}

/** The first free "A01", "A02", … label, checked against every slot in the lot. */
export function nextSlotLabel(prefix: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((label) => label.trim().toUpperCase()));
  for (let n = 1; ; n++) {
    const label = `${prefix}${String(n).padStart(2, "0")}`;
    if (!used.has(label)) return label;
  }
}

/** The API's rule for slot labels (`CameraSlotDto.slot_label`). */
export const SLOT_LABEL_PATTERN = /^[A-Za-z0-9-]{1,20}$/;

/** Labels used more than once across the lot (case-insensitive). */
export function duplicateLabels(cameras: DraftCamera[]): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const slot of cameras.flatMap((c) => c.slots)) {
    const label = slot.label.trim().toUpperCase();
    if (seen.has(label)) dupes.add(label);
    seen.add(label);
  }
  return dupes;
}

/* ---------- payloads ---------- */

const toPaisa = (bdt: string | number) => Math.round(Number(bdt) * 100);

export const isValidRate = (bdt: string) => bdt.trim() !== "" && Number.isFinite(Number(bdt)) && Number(bdt) > 0;

/** The slot's own rate if set, otherwise its vehicle type's rate (BDT text). */
export const slotRate = (slot: DraftSlot, rates: VehicleRates) =>
  slot.rate.trim() ? slot.rate : rates[slot.vehicle_type];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const ALL_DAY: OperatingHours = Object.fromEntries(DAYS.map((d) => [d, { open: "00:00", close: "23:59" }]));

export interface LotDetails {
  name: string;
  contact_phone: string;
  address: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  space_type: SpaceType;
  max_height_cm: string;
  open24h: boolean;
  description: string;
}

/** POST /spaces: the lot itself. Capacity and base rate follow from the marked slots. */
export function buildCreateInput(
  details: LotDetails,
  cameras: DraftCamera[],
  rates: VehicleRates,
): CreateParkingSpaceInput {
  const slots = cameras.flatMap((c) => c.slots);
  const slotRates = slots.map((s) => toPaisa(slotRate(s, rates)));
  return {
    name: details.name.trim(),
    description: details.description.trim() || undefined,
    address: details.address.trim() || undefined,
    contact_phone: details.contact_phone.trim() || undefined,
    latitude: Number(details.latitude.toFixed(6)),
    longitude: Number(details.longitude.toFixed(6)),
    space_type: details.space_type,
    total_capacity: slots.length,
    base_rate_unit: slotRates.length ? Math.min(...slotRates) : undefined,
    max_height_cm: details.max_height_cm ? Math.round(Number(details.max_height_cm)) : undefined,
    amenities: details.amenities.length ? details.amenities : undefined,
    operating_hours: details.open24h ? ALL_DAY : undefined,
  };
}

/** PUT /spaces/:id/rates/:vehicleType, one per vehicle type used by a slot (paisa). */
export function buildVehicleRates(cameras: DraftCamera[], rates: VehicleRates): VehicleRate[] {
  const usedTypes = new Set(cameras.flatMap((c) => c.slots.map((s) => s.vehicle_type)));
  return VEHICLE_TYPES.filter((v) => usedTypes.has(v.id)).map((v) => ({
    vehicle_type: v.id,
    hourly_rate_unit: toPaisa(rates[v.id]),
  }));
}

/**
 * POST /spaces/:id/cameras for one camera: its slot rectangles in frame pixels.
 * A slot sends its own `hourly_rate_unit` only when the owner typed one;
 * otherwise the API charges the lot's rate for its vehicle type.
 * Returns null while the camera's frame size is unknown (nothing to mark on).
 */
export function buildCameraInput(camera: DraftCamera): CreateCameraInput | null {
  if (!camera.frame) return null;
  return {
    label: camera.label.trim(),
    source_type: camera.source,
    rtsp_url: camera.source === "rtsp" ? camera.rtsp_url.trim() : undefined,
    frame_width: Math.round(camera.frame.width),
    frame_height: Math.round(camera.frame.height),
    slots: camera.slots.map((slot) => ({
      slot_label: slot.label.trim().toUpperCase(),
      vehicle_type: slot.vehicle_type,
      ...(slot.rate.trim() ? { hourly_rate_unit: toPaisa(slot.rate) } : {}),
      bbox: { ...slot.box },
    })),
  };
}

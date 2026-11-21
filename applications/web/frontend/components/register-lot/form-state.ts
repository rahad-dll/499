import { isValidBangladeshPhone } from "@/lib/auth/phone";
import {
  SLOT_LABEL_PATTERN,
  duplicateLabels,
  isValidRate,
  vehicleType,
  type DraftCamera,
  type VehicleRates,
} from "@/lib/spaces/layout";
import type { SpaceType } from "@/lib/spaces/types";

export const AMENITIES = [
  { id: "cctv", label: "CCTV" },
  { id: "covered", label: "Covered" },
  { id: "security_guard", label: "Security guard" },
  { id: "ev_charging", label: "EV charging" },
  { id: "wheelchair_access", label: "Wheelchair access" },
  { id: "washroom", label: "Washroom" },
];

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The wizard's lot fields, as typed (cameras, slots, and rates live beside it). */
export interface LotForm {
  name: string;
  contact_phone: string;
  address: string;
  latitude: string;
  longitude: string;
  /** where the pin came from: an address lookup may only move an "address" pin */
  pin_source: "address" | "manual" | null;
  amenities: string[];
  space_type: SpaceType;
  max_height_cm: string;
  open24h: boolean;
  description: string;
}

/** A change to the form: fields to set, or a function of the latest form (for toggles). */
export type LotFormPatch = Partial<LotForm> | ((prev: LotForm) => Partial<LotForm>);

export const EMPTY_FORM: LotForm = {
  name: "",
  contact_phone: "",
  address: "",
  latitude: "",
  longitude: "",
  pin_source: null,
  amenities: [],
  space_type: "outdoor",
  max_height_cm: "",
  open24h: true,
  description: "",
};

export function pickedLocation(form: LotForm): { lat: number; lng: number } | null {
  if (!form.latitude.trim() || !form.longitude.trim()) return null;
  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export type WizardStep = 1 | 2 | 3;

/** Every camera needs at least one marked slot; null when `camera` has one. */
export function cameraSlotProblem(camera: DraftCamera): string | null {
  if (camera.slots.length) return null;
  return camera.source === "rtsp" && !camera.previewUrl
    ? `${camera.label}: upload a snapshot from this camera, then mark its parking slots.`
    : `${camera.label}: mark at least one parking slot on its footage.`;
}

/** The first problem that blocks leaving `step`, or null. */
export function stepError(
  step: WizardStep,
  form: LotForm,
  cameras: DraftCamera[],
  rates: VehicleRates,
): string | null {
  if (step === 1) {
    if (!form.name.trim()) return "Enter the facility name.";
    if (form.contact_phone.trim() && !isValidBangladeshPhone(form.contact_phone)) {
      return "Enter a valid Bangladeshi mobile number (01XXXXXXXXX).";
    }
    if (!pickedLocation(form)) return "Set the location: type the address, click the map, or use your location.";
    return null;
  }

  if (step === 2) {
    if (form.max_height_cm.trim()) {
      const height = Number(form.max_height_cm);
      if (!Number.isInteger(height) || height < 50 || height > 1000) {
        return "Max vehicle height must be a whole number between 50 and 1000 cm.";
      }
    }
    if (!cameras.length) return "Add at least one camera: an RTSP URL or a demo MP4 video.";
    for (const camera of cameras) {
      if (!camera.label.trim()) return "Give every camera a name.";
      if (camera.source === "rtsp" && !/^rtsps?:\/\/\S+$/i.test(camera.rtsp_url.trim())) {
        return `${camera.label}: the stream URL must start with rtsp://`;
      }
    }
    return null;
  }

  for (const camera of cameras) {
    const problem = cameraSlotProblem(camera);
    if (problem) return problem;
  }
  const slots = cameras.flatMap((c) => c.slots);
  for (const type of new Set(slots.map((s) => s.vehicle_type))) {
    if (!isValidRate(rates[type])) return `Set an hourly rate for ${vehicleType(type).label}.`;
  }
  for (const slot of slots) {
    if (!slot.label.trim()) return "Every slot needs an ID.";
    if (slot.label.trim().length > 20) return `Slot ${slot.label}: IDs can be at most 20 characters.`;
    if (!SLOT_LABEL_PATTERN.test(slot.label.trim())) {
      return `Slot ${slot.label}: use only letters, digits and "-" in slot IDs.`;
    }
    if (slot.rate.trim() && !isValidRate(slot.rate)) {
      return `Slot ${slot.label}: enter a rate above 0, or leave it empty to use the ${vehicleType(slot.vehicle_type).label} rate.`;
    }
  }
  const dupes = duplicateLabels(cameras);
  if (dupes.size) return `Slot IDs must be unique: ${[...dupes].join(", ")}.`;
  return null;
}

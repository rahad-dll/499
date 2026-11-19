import { API_URL, ApiError, apiRequest } from "@/lib/api/client";
import { asList, authedRequest } from "@/lib/api/authed";
import { invalidateQuery } from "@/lib/api/query-store";
import { toParkingSpace, type ApiParkingSpace } from "./adapters";
import type {
  ApiVehicleType,
  CameraDetail,
  CreateCameraInput,
  CreateParkingSpaceInput,
  InferenceResult,
  NearbySpace,
  ParkingSpace,
  SpaceCameras,
  UpdateCameraInput,
  UpdateParkingSpaceInput,
  VehicleRate,
} from "./types";

/** Query-store keys for the owner's lots. */
export const spaceKeys = {
  mine: "spaces:mine",
  one: (id: string) => `space:${id}`,
  cameras: (id: string) => `space:${id}:cameras`,
};

/** After a change, cached copies of the lot (and the list) reload. */
function changed(id?: string): void {
  invalidateQuery(spaceKeys.mine);
  if (id) {
    invalidateQuery(spaceKeys.one(id));
    invalidateQuery(spaceKeys.cameras(id));
  }
}

const lotPath = (id: string) => `/spaces/${encodeURIComponent(id)}`;

/**
 * Photos uploaded through POST /spaces/:id/photos are kept on the API server's
 * disk (bucket "local"), which presign refuses; the API serves them statically.
 */
const localPhotoUrl = (s3Key: string) => `${API_URL}/uploads/spaces/${encodeURIComponent(s3Key)}`;

export class ParkingSpaceError extends Error {
  constructor(message: string, public readonly status = 0) {
    super(message);
    this.name = "ParkingSpaceError";
  }
}

function spaceError(error: unknown, fallback: string): ParkingSpaceError {
  if (error instanceof ParkingSpaceError) return error;
  if (error instanceof ApiError) return new ParkingSpaceError(error.message, error.status);
  return new ParkingSpaceError(fallback);
}

async function call<T>(request: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw spaceError(error, fallback);
  }
}

function presignedUrl(payload: unknown): string | null {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    for (const key of ["url", "signed_url", "presigned_url", "signedUrl"]) {
      if (typeof data[key] === "string") return data[key] as string;
    }
  }
  return null;
}

/* ---------- presigned photo URLs (caching Proxy) ---------- */

/** Used when a URL does not say how long it lasts. */
const PHOTO_URL_FALLBACK_TTL_MS = 2 * 60_000;
/** Stop reusing a URL this long before it expires. */
const PHOTO_URL_MARGIN_MS = 60_000;

const photoUrls = new Map<string, { url: Promise<string | null>; reuseUntil: number }>();

/** How long a presigned URL can be reused, from its `X-Amz-Expires` lifetime when present. */
function reuseUntil(url: string | null): number {
  if (!url) return Date.now() + PHOTO_URL_MARGIN_MS;
  let lifetimeMs = PHOTO_URL_FALLBACK_TTL_MS;
  try {
    const seconds = Number(new URL(url).searchParams.get("X-Amz-Expires"));
    if (seconds > 0) lifetimeMs = seconds * 1000;
  } catch {
    // not an absolute URL; keep the fallback
  }
  return Date.now() + Math.max(0, lifetimeMs - PHOTO_URL_MARGIN_MS);
}

export const parkingSpacesRepository = {
  /** GET /spaces: the signed-in owner's lots (with cameras and photos). */
  list(): Promise<ParkingSpace[]> {
    return call(
      async () => asList<ApiParkingSpace>(await authedRequest<unknown>("/spaces")).map(toParkingSpace),
      "Could not load parking lots",
    );
  },

  /** GET /spaces/:id */
  get(id: string): Promise<ParkingSpace> {
    return call(
      async () => toParkingSpace(await authedRequest<ApiParkingSpace>(`/spaces/${encodeURIComponent(id)}`)),
      "Could not load parking lot",
    );
  },

  /** POST /spaces */
  create(input: CreateParkingSpaceInput): Promise<ParkingSpace> {
    return call(async () => {
      const created = await authedRequest<ApiParkingSpace>("/spaces", {
        method: "POST",
        body: JSON.stringify(input),
      });
      changed();
      return toParkingSpace(created);
    }, "Could not register parking lot");
  },

  /** PATCH /spaces/:id. `rtsp_url` updates (or creates) the lot's first camera. */
  update(id: string, input: UpdateParkingSpaceInput): Promise<void> {
    return call(async () => {
      await authedRequest<unknown>(`/spaces/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      changed(id);
    }, "Could not save parking lot");
  },

  /** DELETE /spaces/:id (soft delete on the server). */
  remove(id: string): Promise<void> {
    return call(async () => {
      await authedRequest<unknown>(`/spaces/${encodeURIComponent(id)}`, { method: "DELETE" });
      changed(id);
    }, "Could not delete parking lot");
  },

  /**
   * GET /spaces/nearby: public, live AI occupancy for lots within ~5 km.
   * The API does not filter by status, so pending and suspended lots are included
   * (each item carries its `status`).
   */
  nearby(lat: number, lng: number, signal?: AbortSignal): Promise<NearbySpace[]> {
    const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    return call(
      async () => asList<NearbySpace>(await apiRequest<unknown>(`/spaces/nearby?${query}`, { signal })),
      "Could not load live occupancy",
    );
  },

  /** POST /spaces/:id/infer: run the AI occupancy model on one camera snapshot. */
  inferOccupancy(id: string, image: File): Promise<InferenceResult> {
    const body = new FormData();
    body.append("file", image);
    return call(
      () =>
        authedRequest<InferenceResult>(`/spaces/${encodeURIComponent(id)}/infer`, {
          method: "POST",
          body,
        }),
      "AI check failed",
    );
  },

  /** PUT /spaces/:id/rates/:vehicleType: the lot's hourly price for one vehicle type. */
  setVehicleRate(id: string, vehicleType: ApiVehicleType, hourlyRateUnit: number): Promise<VehicleRate> {
    return call(async () => {
      const saved = await authedRequest<VehicleRate>(
        `${lotPath(id)}/rates/${encodeURIComponent(vehicleType)}`,
        { method: "PUT", body: JSON.stringify({ hourly_rate_unit: hourlyRateUnit }) },
      );
      changed(id);
      return saved;
    }, "Could not save hourly rates");
  },

  /** GET /spaces/:id/cameras: every camera with its slots, plus the lot's vehicle rates. */
  cameras(id: string): Promise<SpaceCameras> {
    return call(
      () => authedRequest<SpaceCameras>(`${lotPath(id)}/cameras`),
      "Could not load cameras",
    );
  },

  /**
   * POST /spaces/:id/cameras: one camera with its slots, saved together or not
   * at all. Slot labels must be unused in the lot, and every vehicle type
   * needs a lot rate (or each slot its own `hourly_rate_unit`).
   */
  createCamera(id: string, input: CreateCameraInput): Promise<CameraDetail> {
    return call(async () => {
      const created = await authedRequest<CameraDetail>(`${lotPath(id)}/cameras`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      changed(id);
      return created;
    }, "Could not save the camera and its slots");
  },

  /** PATCH /spaces/:id/cameras/:cameraId: slots are matched by label; others are left alone. */
  updateCamera(id: string, cameraId: string, input: UpdateCameraInput): Promise<CameraDetail> {
    return call(async () => {
      const updated = await authedRequest<CameraDetail>(
        `${lotPath(id)}/cameras/${encodeURIComponent(cameraId)}`,
        { method: "PATCH", body: JSON.stringify(input) },
      );
      changed(id);
      return updated;
    }, "Could not save the camera");
  },

  /** POST /spaces/:id/photos */
  addPhotos(id: string, files: File[]): Promise<void> {
    const body = new FormData();
    files.forEach((file) => body.append("photos", file));
    return call(async () => {
      await authedRequest<unknown>(`/spaces/${encodeURIComponent(id)}/photos`, {
        method: "POST",
        body,
      });
      changed(id);
    }, "Could not upload photos");
  },

  /** DELETE /spaces/:id/photos/:photoId */
  deletePhoto(id: string, photoId: string): Promise<void> {
    return call(async () => {
      await authedRequest<unknown>(
        `/spaces/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
        { method: "DELETE" },
      );
      photoUrls.delete(photoId);
      changed(id);
    }, "Could not delete photo");
  },

  /**
   * GET /spaces/:id/photos/:photoId/presign: temporary URL for viewing a photo.
   * Proxy: a URL is reused until shortly before it expires, and thumbnails that
   * ask at the same time share one request.
   */
  photoUrl(id: string, photo: { id: string; s3_key: string; s3_bucket?: string }): Promise<string | null> {
    const photoId = photo.id;
    if (photo.s3_bucket === "local") return Promise.resolve(localPhotoUrl(photo.s3_key));
    const cached = photoUrls.get(photoId);
    if (cached && cached.reuseUntil > Date.now()) return cached.url;

    const entry = { reuseUntil: Infinity, url: Promise.resolve<string | null>(null) };
    entry.url = call(async () => {
      try {
        return presignedUrl(
          await authedRequest<unknown>(
            `/spaces/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}/presign`,
          ),
        );
      } catch (error) {
        // GET /spaces leaves out s3_bucket; presign answers 400 for a photo on the server's disk
        if (error instanceof ApiError && error.status === 400) return localPhotoUrl(photo.s3_key);
        throw error;
      }
    }, "Could not load photo").then(
      (url) => {
        entry.reuseUntil = reuseUntil(url);
        return url;
      },
      (error: unknown) => {
        photoUrls.delete(photoId);
        throw error;
      },
    );
    photoUrls.set(photoId, entry);
    return entry.url;
  },
};

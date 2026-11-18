import { ApiError, apiRequest } from "@/lib/api/client";
import { asList, authedRequest } from "@/lib/api/authed";
import { invalidateQuery } from "@/lib/api/query-store";
import { toParkingSpace, type ApiParkingSpace } from "./adapters";
import type {
  CreateParkingSpaceInput,
  InferenceResult,
  NearbySpace,
  ParkingSpace,
  UpdateParkingSpaceInput,
} from "./types";

/** Query-store keys for the owner's lots. */
export const spaceKeys = {
  mine: "spaces:mine",
  one: (id: string) => `space:${id}`,
};

/** After a change, cached copies of the lot (and the list) reload. */
function changed(id?: string): void {
  invalidateQuery(spaceKeys.mine);
  if (id) invalidateQuery(spaceKeys.one(id));
}

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

  /** GET /spaces/nearby: public, live AI occupancy for active lots within ~5 km. */
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
  photoUrl(id: string, photoId: string): Promise<string | null> {
    const cached = photoUrls.get(photoId);
    if (cached && cached.reuseUntil > Date.now()) return cached.url;

    const entry = { reuseUntil: Infinity, url: Promise.resolve<string | null>(null) };
    entry.url = call(
      async () =>
        presignedUrl(
          await authedRequest<unknown>(
            `/spaces/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}/presign`,
          ),
        ),
      "Could not load photo",
    ).then(
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

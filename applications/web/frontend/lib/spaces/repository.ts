import { ApiError, apiRequest } from "@/lib/api/client";
import { asList, authedRequest } from "@/lib/api/authed";
import type {
  CreateParkingSpaceInput,
  InferenceResult,
  NearbySpace,
  ParkingSpace,
  UpdateParkingSpaceInput,
} from "./types";

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

export const parkingSpacesRepository = {
  /** GET /spaces: the signed-in owner's lots (with cameras and photos). */
  list(): Promise<ParkingSpace[]> {
    return call(
      async () => asList<ParkingSpace>(await authedRequest<unknown>("/spaces")),
      "Could not load parking lots",
    );
  },

  /** GET /spaces/:id */
  get(id: string): Promise<ParkingSpace> {
    return call(
      () => authedRequest<ParkingSpace>(`/spaces/${encodeURIComponent(id)}`),
      "Could not load parking lot",
    );
  },

  /** POST /spaces */
  create(input: CreateParkingSpaceInput): Promise<ParkingSpace> {
    return call(
      () =>
        authedRequest<ParkingSpace>("/spaces", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      "Could not register parking lot",
    );
  },

  /** PATCH /spaces/:id. `rtsp_url` updates (or creates) the lot's first camera. */
  update(id: string, input: UpdateParkingSpaceInput): Promise<ParkingSpace> {
    return call(
      () =>
        authedRequest<ParkingSpace>(`/spaces/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      "Could not save parking lot",
    );
  },

  /** DELETE /spaces/:id (soft delete on the server). */
  remove(id: string): Promise<void> {
    return call(async () => {
      await authedRequest<unknown>(`/spaces/${encodeURIComponent(id)}`, { method: "DELETE" });
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
    }, "Could not upload photos");
  },

  /** DELETE /spaces/:id/photos/:photoId */
  deletePhoto(id: string, photoId: string): Promise<void> {
    return call(async () => {
      await authedRequest<unknown>(
        `/spaces/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
        { method: "DELETE" },
      );
    }, "Could not delete photo");
  },

  /** GET /spaces/:id/photos/:photoId/presign: temporary URL for viewing a photo. */
  photoUrl(id: string, photoId: string): Promise<string | null> {
    return call(
      async () =>
        presignedUrl(
          await authedRequest<unknown>(
            `/spaces/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}/presign`,
          ),
        ),
      "Could not load photo",
    );
  },
};

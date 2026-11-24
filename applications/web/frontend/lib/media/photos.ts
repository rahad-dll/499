/**
 * Lot photos are checked, and shrunk when large, in the browser before they
 * are uploaded: the API rejects files over 5 MB, phone photos are often
 * bigger, and smaller files upload faster on mobile data.
 *
 * The pure helpers have no imports so Node's test runner can load this file;
 * `preparePhoto` itself needs a browser (it draws on a canvas).
 */

/** The API's limit per photo (MaxFileSizeValidator on POST /spaces/:id/photos). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Longest side after resizing — sharp on phones and laptops. */
export const MAX_PHOTO_SIDE = 2048;

/** Photos at or under this size are uploaded untouched. */
export const RESIZE_ABOVE_BYTES = 1.5 * 1024 * 1024;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** For `<input accept>`. */
export const PHOTO_ACCEPT = ACCEPTED_TYPES.join(",");

/** Why a file can't be used as a lot photo, or null when its type is fine. */
export function photoTypeProblem(file: { name: string; type: string }): string | null {
  if (ACCEPTED_TYPES.includes(file.type)) return null;
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return `${file.name}: HEIC photos can't be shown to drivers. Save or export it as a JPG first.`;
  }
  return `${file.name}: use a JPG, PNG or WebP image.`;
}

/** Scales width × height down (never up) so the longest side is at most `maxSide`. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** "850 KB", "3.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const asJpgName = (name: string) => `${name.replace(/\.[^./\\]+$/, "") || "photo"}.jpg`;

export type PreparedPhoto =
  | { ok: true; file: File; originalBytes: number; resized: boolean }
  | { ok: false; error: string };

/** Re-encodes a large photo as a JPEG of at most MAX_PHOTO_SIDE px. */
async function shrink(file: File): Promise<File | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const size = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return null;
  }
  // transparent PNG areas would turn black in a JPEG
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size >= file.size) return null;
  return new File([blob], asJpgName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
}

/** Checks one photo and shrinks it if it is large. Never throws. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const problem = photoTypeProblem(file);
  if (problem) return { ok: false, error: problem };
  if (file.size > RESIZE_ABOVE_BYTES) {
    try {
      const smaller = await shrink(file);
      if (smaller && smaller.size <= MAX_PHOTO_BYTES) {
        return { ok: true, file: smaller, originalBytes: file.size, resized: true };
      }
    } catch {
      // the browser couldn't decode it: fall back to the original below
    }
  }
  if (file.size <= MAX_PHOTO_BYTES) return { ok: true, file, originalBytes: file.size, resized: false };
  return {
    ok: false,
    error: `${file.name} is ${formatBytes(file.size)} and couldn't be made smaller than 5 MB. Try a smaller photo.`,
  };
}

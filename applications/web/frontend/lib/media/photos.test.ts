import assert from "node:assert/strict";
import { test } from "node:test";
import { fitWithin, formatBytes, photoTypeProblem, preparePhoto, MAX_PHOTO_BYTES } from "./photos.ts";

test("accepts JPG, PNG and WebP photos", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(photoTypeProblem({ name: "lot", type }), null);
  }
});

test("explains HEIC and other unsupported files", () => {
  assert.match(photoTypeProblem({ name: "IMG_0001.HEIC", type: "" }) ?? "", /HEIC/);
  assert.match(photoTypeProblem({ name: "x.heif", type: "image/heif" }) ?? "", /JPG first/);
  assert.match(photoTypeProblem({ name: "notes.pdf", type: "application/pdf" }) ?? "", /JPG, PNG or WebP/);
});

test("scales the longest side down to the limit, keeping the shape", () => {
  assert.deepEqual(fitWithin(4000, 3000, 2048), { width: 2048, height: 1536 });
  assert.deepEqual(fitWithin(3000, 4000, 2048), { width: 1536, height: 2048 });
});

test("never scales small images up", () => {
  assert.deepEqual(fitWithin(800, 600, 2048), { width: 800, height: 600 });
});

test("formats file sizes", () => {
  assert.equal(formatBytes(870_000), "850 KB");
  assert.equal(formatBytes(3.2 * 1024 * 1024), "3.2 MB");
  assert.equal(formatBytes(10), "1 KB");
});

test("keeps small photos as they are and rejects wrong types", async () => {
  const small = new File([new Uint8Array(2048)], "lot.jpg", { type: "image/jpeg" });
  const kept = await preparePhoto(small);
  assert.equal(kept.ok, true);
  if (kept.ok) {
    assert.equal(kept.file, small);
    assert.equal(kept.resized, false);
  }
  const pdf = await preparePhoto(new File(["%PDF"], "plan.pdf", { type: "application/pdf" }));
  assert.equal(pdf.ok, false);
});

test("rejects a large photo it cannot shrink", async () => {
  // Node has no createImageBitmap, so shrinking fails like an undecodable file would
  const huge = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "huge.png", { type: "image/png" });
  const result = await preparePhoto(huge);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /couldn't be made smaller than 5 MB/);
});

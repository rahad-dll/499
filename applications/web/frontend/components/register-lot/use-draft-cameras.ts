"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { newKey, type DraftCamera, type DraftSlot, type Frame } from "@/lib/spaces/layout";

function nextCameraName(cameras: DraftCamera[]): string {
  const names = new Set(cameras.map((c) => c.label.trim().toLowerCase()));
  for (let n = cameras.length + 1; ; n++) {
    if (!names.has(`camera ${n}`)) return `Camera ${n}`;
  }
}

const blankCamera = (key: string, label: string): DraftCamera => ({
  key,
  label,
  source: "rtsp",
  rtsp_url: "",
  video: null,
  snapshot: null,
  previewUrl: null,
  frame: null,
  slots: [],
});

/** Slots drawn on one frame size, carried over to footage of another size. */
function rescale(slots: DraftSlot[], from: Frame, to: Frame): DraftSlot[] {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  return slots.map((slot) => ({
    ...slot,
    box: {
      x: Math.round(slot.box.x * sx),
      y: Math.round(slot.box.y * sy),
      width: Math.round(slot.box.width * sx),
      height: Math.round(slot.box.height * sy),
    },
  }));
}

/**
 * The wizard's cameras: RTSP streams and demo MP4s, their preview object URLs
 * (revoked when replaced, removed, or on unmount), and the slots drawn on each.
 */
export function useDraftCameras() {
  const [cameras, setCameras] = useState<DraftCamera[]>([]);
  const latest = useRef(cameras);
  const urls = useRef(new Set<string>());

  useEffect(() => {
    latest.current = cameras;
  }, [cameras]);

  useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);

  const objectUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  }, []);

  const release = useCallback((url: string | null) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }, []);

  const update = useCallback((key: string, patch: Partial<DraftCamera>) => {
    setCameras((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }, []);

  const addRtsp = useCallback((rtspUrl: string) => {
    setCameras((prev) => [...prev, { ...blankCamera(newKey("cam"), nextCameraName(prev)), rtsp_url: rtspUrl }]);
  }, []);

  const addVideos = useCallback(
    (files: File[]) => {
      // object URLs are made outside the state updater, which may run twice
      const added = files.map((file) => ({ key: newKey("cam"), file, url: objectUrl(file) }));
      setCameras((prev) => {
        const next = [...prev];
        for (const { key, file, url } of added) {
          next.push({ ...blankCamera(key, nextCameraName(next)), source: "video", video: file, previewUrl: url });
        }
        return next;
      });
    },
    [objectUrl],
  );

  const setSnapshot = useCallback(
    (key: string, file: File) => {
      release(latest.current.find((c) => c.key === key)?.previewUrl ?? null);
      // the frame size is read again when the new image loads
      update(key, { snapshot: file, previewUrl: objectUrl(file) });
    },
    [objectUrl, release, update],
  );

  const setFrame = useCallback((key: string, frame: Frame) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        if (c.frame && c.frame.width === frame.width && c.frame.height === frame.height) return c;
        return { ...c, frame, slots: c.frame ? rescale(c.slots, c.frame, frame) : c.slots };
      }),
    );
  }, []);

  const setSlots = useCallback((key: string, change: (slots: DraftSlot[]) => DraftSlot[]) => {
    setCameras((prev) => prev.map((c) => (c.key === key ? { ...c, slots: change(c.slots) } : c)));
  }, []);

  const remove = useCallback(
    (key: string) => {
      release(latest.current.find((c) => c.key === key)?.previewUrl ?? null);
      setCameras((prev) => prev.filter((c) => c.key !== key));
    },
    [release],
  );

  return useMemo(
    () => ({ cameras, update, addRtsp, addVideos, setSnapshot, setFrame, setSlots, remove }),
    [cameras, update, addRtsp, addVideos, setSnapshot, setFrame, setSlots, remove],
  );
}

export type DraftCameras = ReturnType<typeof useDraftCameras>;

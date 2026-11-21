"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  boxFromPoints,
  minSlotSide,
  moveBox,
  overlapsAny,
  vehicleType,
  type Box,
  type DraftCamera,
  type DraftSlot,
  type Frame,
} from "@/lib/spaces/layout";
import type { VehicleType } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Corner = "nw" | "ne" | "sw" | "se";

type Drag =
  | { kind: "draw"; start: Point; current: Point }
  | { kind: "move"; key: string; origin: Box; start: Point }
  | { kind: "resize"; key: string; anchor: Point };

const CORNERS: { id: Corner; className: string }[] = [
  { id: "nw", className: "-left-[5px] -top-[5px] cursor-nwse-resize" },
  { id: "ne", className: "-right-[5px] -top-[5px] cursor-nesw-resize" },
  { id: "sw", className: "-bottom-[5px] -left-[5px] cursor-nesw-resize" },
  { id: "se", className: "-bottom-[5px] -right-[5px] cursor-nwse-resize" },
];

/** The corner that stays put while `corner` is dragged. */
function oppositeCorner(box: Box, corner: Corner): Point {
  return {
    x: corner === "nw" || corner === "sw" ? box.x + box.width : box.x,
    y: corner === "nw" || corner === "ne" ? box.y + box.height : box.y,
  };
}

/** Largest size with the frame's aspect ratio that fits in `area`. */
function fit(area: { w: number; h: number }, frame: Frame) {
  const ratio = Math.min(area.w / frame.width, area.h / frame.height);
  return { w: Math.max(0, frame.width * ratio), h: Math.max(0, frame.height * ratio) };
}

/**
 * Marks parking slots on one camera's footage: plain axis-aligned rectangles
 * that may touch but never overlap. Boxes are kept in the footage's own pixels.
 */
export function SlotEditor({
  camera,
  drawType,
  selected,
  onSelect,
  onCreate,
  onChange,
  onDelete,
  onFrame,
  onBlocked,
  paused,
  locked,
  className,
}: {
  camera: DraftCamera;
  drawType: VehicleType;
  selected: string | null;
  onSelect: (key: string | null) => void;
  onCreate: (box: Box) => void;
  onChange: (key: string, box: Box) => void;
  onDelete: (key: string) => void;
  onFrame: (frame: Frame) => void;
  onBlocked: (message: string) => void;
  paused: boolean;
  locked: boolean;
  className?: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [unplayable, setUnplayable] = useState(false);
  const frame = camera.frame;
  const isVideo = camera.source === "video";

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    // measured right away (no blank first frame), then again whenever the area resizes
    const measure = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
  }, [paused, camera.previewUrl, frame]);

  const stage = frame && area ? fit(area, frame) : null;
  const scale = stage && frame ? stage.w / frame.width : 1;
  const minSide = frame ? minSlotSide(frame) : 0;
  const othersThan = (key?: string) => camera.slots.filter((s) => s.key !== key).map((s) => s.box);

  function toFrame(event: PointerEvent): Point {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((event.clientX - rect.left) / scale, 0), frame!.width),
      y: Math.min(Math.max((event.clientY - rect.top) / scale, 0), frame!.height),
    };
  }

  function capture(event: PointerEvent) {
    try {
      stageRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // the pointer is already gone (e.g. a cancelled touch); moves still reach the stage
    }
    stageRef.current?.focus({ preventScroll: true });
  }

  function startDraw(event: PointerEvent) {
    if (!frame || event.button !== 0) return;
    onSelect(null);
    if (locked) return;
    capture(event);
    const point = toFrame(event);
    setDrag({ kind: "draw", start: point, current: point });
  }

  function startMove(event: PointerEvent, slot: DraftSlot) {
    if (event.button !== 0) return;
    event.stopPropagation();
    onSelect(slot.key);
    if (locked) return;
    capture(event);
    setDrag({ kind: "move", key: slot.key, origin: slot.box, start: toFrame(event) });
  }

  function startResize(event: PointerEvent, slot: DraftSlot, corner: Corner) {
    if (event.button !== 0 || locked) return;
    event.stopPropagation();
    capture(event);
    setDrag({ kind: "resize", key: slot.key, anchor: oppositeCorner(slot.box, corner) });
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || !frame) return;
    const point = toFrame(event);
    if (drag.kind === "draw") {
      setDrag({ ...drag, current: point });
    } else if (drag.kind === "move") {
      const next = moveBox(drag.origin, point.x - drag.start.x, point.y - drag.start.y, frame);
      // a move into another slot is refused; the box stays at its last free spot
      if (!overlapsAny(next, othersThan(drag.key))) onChange(drag.key, next);
    } else {
      const next = boxFromPoints(drag.anchor, point, frame);
      if (next.width >= minSide && next.height >= minSide && !overlapsAny(next, othersThan(drag.key))) {
        onChange(drag.key, next);
      }
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (stageRef.current?.hasPointerCapture(event.pointerId)) {
      stageRef.current.releasePointerCapture(event.pointerId);
    }
    if (drag?.kind === "draw" && frame) {
      const box = boxFromPoints(drag.start, drag.current, frame);
      if (box.width >= minSide && box.height >= minSide) {
        if (overlapsAny(box, othersThan())) onBlocked("Slots can’t overlap. Draw the slot in a free area.");
        else onCreate(box);
      } else if (box.width > 2 || box.height > 2) {
        onBlocked("That slot is too small. Drag a larger rectangle.");
      }
    }
    setDrag(null);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!selected || !frame) return;
    if (event.key === "Escape") {
      onSelect(null);
      return;
    }
    if (locked) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onDelete(selected);
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    const slot = camera.slots.find((s) => s.key === selected);
    if (!delta || !slot) return;
    event.preventDefault();
    const next = moveBox(slot.box, delta[0], delta[1], frame);
    if (!overlapsAny(next, othersThan(slot.key))) onChange(slot.key, next);
  }

  const draft = drag?.kind === "draw" && frame ? boxFromPoints(drag.start, drag.current, frame) : null;
  const draftBlocked = draft ? overlapsAny(draft, othersThan()) : false;
  const draftColor = draftBlocked ? "#ef4444" : vehicleType(drawType).color;
  const px = (box: Box) => ({
    left: box.x * scale,
    top: box.y * scale,
    width: box.width * scale,
    height: box.height * scale,
  });

  const media = (hidden: boolean) =>
    isVideo ? (
      <video
        ref={hidden ? undefined : videoRef}
        src={camera.previewUrl ?? undefined}
        autoPlay={!hidden}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => onFrame({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })}
        onError={() => setUnplayable(true)}
        className={hidden ? "hidden" : "pointer-events-none absolute inset-0 size-full select-none object-fill"}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
      <img
        src={camera.previewUrl ?? undefined}
        alt=""
        draggable={false}
        onLoad={(e) => onFrame({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
        className={hidden ? "hidden" : "pointer-events-none absolute inset-0 size-full select-none object-fill"}
      />
    );

  return (
    <div ref={areaRef} className={cn("relative flex items-center justify-center overflow-hidden rounded-xl bg-[#0b1322]", className)}>
      {!stage && (
        <div className="flex items-center gap-2 px-6 text-center text-sm text-slate-300">
          {unplayable ? (
            <span className="text-amber-300">
              This browser can’t play {camera.label}’s video. Export it as MP4 (H.264) and replace the camera in step 2.
            </span>
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading footage…
            </>
          )}
          {media(true)}
        </div>
      )}

      {stage && frame && (
        <div
          ref={stageRef}
          role="application"
          aria-label={`${camera.label}: drag to mark parking slots`}
          tabIndex={0}
          onPointerDown={startDraw}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className={cn("relative touch-none outline-none", locked ? "cursor-default" : "cursor-crosshair")}
          style={{ width: stage.w, height: stage.h }}
        >
          {media(false)}

          {camera.slots.map((slot) => {
            const color = vehicleType(slot.vehicle_type).color;
            const isSelected = slot.key === selected;
            const labelInside = slot.box.y * scale < 18;
            return (
              <div
                key={slot.key}
                onPointerDown={(e) => startMove(e, slot)}
                className={cn("absolute", locked ? "cursor-pointer" : "cursor-move")}
                style={{
                  ...px(slot.box),
                  border: `2px solid ${color}`,
                  background: `${color}${isSelected ? "40" : "1f"}`,
                  boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 14px ${color}` : undefined,
                  zIndex: isSelected ? 2 : 1,
                }}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute left-[-2px] whitespace-nowrap px-1 font-mono text-[10px] font-bold leading-4 text-[#0b1322]",
                    labelInside ? "top-0" : "-top-[18px] rounded-t",
                  )}
                  style={{ background: color }}
                >
                  {slot.label || "?"}
                </span>
                {isSelected &&
                  !locked &&
                  CORNERS.map((corner) => (
                    <span
                      key={corner.id}
                      onPointerDown={(e) => startResize(e, slot, corner.id)}
                      className={cn("absolute size-2.5 rounded-[2px] border border-[#0b1322] bg-white", corner.className)}
                    />
                  ))}
              </div>
            );
          })}

          {draft && (
            <div
              className="pointer-events-none absolute border-2 border-dashed"
              style={{ ...px(draft), borderColor: draftColor, background: `${draftColor}26`, zIndex: 3 }}
            >
              <span
                className="absolute -top-[18px] left-[-2px] whitespace-nowrap rounded-t px-1 text-[10px] font-bold leading-4 text-[#0b1322]"
                style={{ background: draftColor }}
              >
                {draftBlocked ? "Overlaps a slot" : `${draft.width}×${draft.height}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

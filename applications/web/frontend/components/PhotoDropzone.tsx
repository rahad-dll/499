"use client";

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { formatBytes, PHOTO_ACCEPT, preparePhoto } from "@/lib/media/photos";
import { cn } from "@/lib/utils";

/**
 * Click-or-drop area for lot photos. Every file is checked (JPG, PNG or WebP)
 * and large ones are resized in the browser to fit the API's 5 MB limit
 * before `onFiles` receives them. Problems are listed under the area.
 */
export function PhotoDropzone({
  onFiles,
  remaining = Infinity,
  disabled = false,
  busy = false,
  busyLabel = "Uploading…",
  compact = false,
  className,
  children,
}: {
  onFiles: (files: File[]) => void | Promise<void>;
  /** how many more photos may be added */
  remaining?: number;
  disabled?: boolean;
  /** e.g. while the parent uploads */
  busy?: boolean;
  busyLabel?: string;
  /** one-line button, for tight layouts */
  compact?: boolean;
  className?: string;
  /** replaces the default "Add photos" label */
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const blocked = disabled || busy || preparing || remaining <= 0;

  async function take(list: File[]) {
    if (!list.length || blocked) return;
    setPreparing(true);
    setNote(null);
    const results = await Promise.all(list.map(preparePhoto));
    const errors = results.flatMap((r) => (r.ok ? [] : [r.error]));
    const ready = results.flatMap((r) => (r.ok ? [r] : []));
    const kept = ready.slice(0, remaining);
    if (ready.length > kept.length) {
      errors.push(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added; the rest were skipped.`);
    }
    const resized = kept.filter((r) => r.resized);
    if (resized.length) {
      const before = resized.reduce((t, r) => t + r.originalBytes, 0);
      const after = resized.reduce((t, r) => t + r.file.size, 0);
      setNote(
        `Resized ${resized.length} large photo${resized.length === 1 ? "" : "s"} to upload faster (${formatBytes(before)} → ${formatBytes(after)}).`,
      );
    }
    setProblems(errors);
    setPreparing(false);
    if (kept.length) await onFiles(kept.map((r) => r.file));
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void take([...event.dataTransfer.files]);
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={blocked}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!blocked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex size-full items-center justify-center rounded-xl border border-dashed px-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "gap-2 py-2 text-xs" : "flex-col gap-1.5 py-3",
          dragging ? "border-brand bg-brand/5 text-foreground" : "border-border",
        )}
      >
        {busy || preparing ? (
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
        ) : (
          <ImagePlus className="size-5" />
        )}
        {preparing ? "Preparing photos…" : busy ? busyLabel : children ?? "Add photos"}
        {!busy && !preparing && !compact && (
          <span className="text-[11.5px] font-normal">Drop images here or click · JPG, PNG or WebP</span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          void take([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <div aria-live="polite">
        {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
        {problems.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-destructive">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Thumbnail of a photo that hasn't been uploaded yet, with a remove button. */
export function PendingPhoto({
  file,
  onRemove,
  disabled = false,
  className,
}: {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}) {
  // the object URL lives exactly as long as the <img> shows this file
  const showFile = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(file);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file],
  );

  return (
    <span className={cn("relative block overflow-hidden rounded-lg border border-border bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
      <img ref={showFile} alt={`Preview of ${file.name}`} className="size-full object-cover" />
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        title={`Remove ${file.name}`}
        disabled={disabled}
        onClick={onRemove}
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/65 text-white hover:bg-destructive disabled:opacity-50"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

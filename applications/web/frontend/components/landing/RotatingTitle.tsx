"use client";

import { useEffect, useState } from "react";
import type { TitlePart } from "@/components/landing/data";
import { cn } from "@/lib/utils";

/** How long a title stays up: longer titles get more reading time (10–25 s). */
function holdMs(title: TitlePart[]): number {
  const chars = title.reduce((n, part) => n + part.text.length, 0);
  return Math.min(25_000, Math.max(10_000, 6_000 + chars * 250));
}

/**
 * Hero headline that cycles through `titles` with a cross-fade.
 *
 * Every title is rendered in the same grid cell, so the heading is always as
 * tall as its longest title and nothing around it moves when the text changes.
 * Inactive titles are invisible and hidden from assistive tech.
 */
export function RotatingTitle({ titles, className }: { titles: TitlePart[][]; className?: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setActive((i) => (i + 1) % titles.length), holdMs(titles[active]));
    return () => window.clearTimeout(id);
  }, [active, titles]);

  return (
    <h1 className={cn("grid", className)}>
      {titles.map((title, i) => (
        <span
          key={i}
          aria-hidden={i !== active}
          className={cn(
            "col-start-1 row-start-1 self-center transition-[opacity,visibility] duration-700 ease-out motion-reduce:transition-none",
            i === active ? "visible opacity-100" : "invisible opacity-0",
          )}
        >
          {title.map((part, j) =>
            part.hl ? (
              <span
                key={j}
                className="bg-gradient-to-r from-[#0cbfa6] to-[#7c5cff] box-decoration-clone bg-clip-text text-transparent dark:from-[#18d6c0] dark:to-[#9b82ff]"
              >
                {part.text}
              </span>
            ) : (
              <span key={j}>{part.text}</span>
            ),
          )}
        </span>
      ))}
    </h1>
  );
}

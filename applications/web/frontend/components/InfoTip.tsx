"use client";

import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import { GLOSSARY, type GlossaryTerm } from "@/lib/insights/glossary";
import { cn } from "@/lib/utils";

/**
 * Small ⓘ button that explains a technical term. It opens on click or tap
 * (not hover) so it works the same on phones, and closes with Escape or an
 * outside click.
 */
export function InfoTip({
  term,
  side = "top",
  align = "center",
  className,
}: {
  term: GlossaryTerm;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const entry = GLOSSARY[term];
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`What does “${entry.title}” mean?`}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-muted data-[state=open]:text-foreground",
            className,
          )}
        >
          <Info className="size-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-72 max-w-[calc(100vw-24px)] rounded-xl border border-border bg-popover p-3.5 text-left font-sans text-popover-foreground shadow-lg outline-none"
        >
          <p className="text-sm font-bold normal-case tracking-normal">{entry.title}</p>
          <p className="mt-1 text-[13px] font-normal normal-case leading-relaxed tracking-normal text-muted-foreground">
            {entry.body}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

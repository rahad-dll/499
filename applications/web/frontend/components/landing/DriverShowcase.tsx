"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DRIVER_SCREENS } from "@/components/landing/data";
import { PhoneFrame } from "@/components/landing/devices";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 1024px)";

/**
 * Driver-app row: the app flow as steps beside one large, readable phone.
 *
 * Desktop: the phone stays pinned while the steps scroll past; the step
 * crossing the middle of the screen becomes active and the phone shows its
 * screen. Phones: intro → phone → steps, and tapping a step swaps the screen.
 */
export function DriverShowcase({ intro, cta }: { intro: React.ReactNode; cta: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    // Active step = the last one whose top has scrolled past the middle of
    // the screen. Measured on every scroll so fast jumps never skip a step.
    const update = () => {
      if (!mq.matches) return;
      const line = window.innerHeight / 2;
      let current = 0;
      stepRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) current = i;
      });
      setActive(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    mq.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      mq.removeEventListener("change", update);
    };
  }, []);

  function select(i: number) {
    setActive(i);
    if (window.matchMedia(DESKTOP).matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stepRefs.current[i]?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
  }

  const last = DRIVER_SCREENS.length - 1;

  return (
    <div className="grid gap-x-16 gap-y-10 lg:grid-cols-2">
      <div className="lg:col-start-1 lg:row-start-1">{intro}</div>

      <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <div
          id="driver-screen"
          aria-live="polite"
          aria-label={`Driver app screen: ${DRIVER_SCREENS[active].title}`}
          className="relative mx-auto w-full max-w-[270px] sm:max-w-[290px] lg:w-[min(300px,calc((100svh-190px)*0.47))] lg:max-w-none"
        >
          <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--brand)_20%,transparent),transparent)]" />
          <PhoneFrame>
            <div className="grid">
              {DRIVER_SCREENS.map((s, i) => (
                <Image
                  key={s.title}
                  src={s.image}
                  alt={s.alt}
                  placeholder="blur"
                  sizes="300px"
                  aria-hidden={i !== active}
                  className={cn(
                    "col-start-1 row-start-1 h-auto w-full transition-opacity duration-300 motion-reduce:transition-none",
                    i === active ? "opacity-100" : "opacity-0",
                  )}
                />
              ))}
            </div>
          </PhoneFrame>
        </div>
      </div>

      {/* bottom padding keeps the pinned phone fully on screen through the last step */}
      <div className="lg:col-start-1 lg:row-start-2 lg:pb-[30vh]">
        <ol className="relative flex flex-col gap-2.5 lg:gap-[16vh] lg:py-[6vh]">
          {/* connector between the step numbers, filled up to the active step */}
          <span
            aria-hidden
            className="absolute bottom-[calc(6vh+2.25rem)] left-8 top-[calc(6vh+2.25rem)] hidden w-0.5 -translate-x-1/2 bg-border lg:block"
          >
            <span
              className="block w-full bg-brand transition-[height] duration-300 motion-reduce:transition-none"
              style={{ height: `${(active / last) * 100}%` }}
            />
          </span>
          {DRIVER_SCREENS.map((s, i) => (
            <li key={s.title}>
              <button
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                type="button"
                aria-current={i === active ? "step" : undefined}
                aria-controls="driver-screen"
                onClick={() => select(i)}
                className={cn(
                  "relative flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-colors duration-300",
                  i === active
                    ? "border-brand/50 bg-[color-mix(in_srgb,var(--brand)_7%,var(--card))]"
                    : "border-border bg-card hover:border-brand/35",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-extrabold",
                    i <= active ? "bg-brand text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span>
                  <span className={cn("block text-[15px] font-bold", i === active ? "text-foreground" : "text-foreground lg:text-muted-foreground")}>
                    {s.title}
                  </span>
                  <span className={cn("mt-0.5 block text-[14px] leading-snug text-muted-foreground", i !== active && "lg:opacity-70")}>
                    {s.desc}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          Real screens from the CityPulse driver app (Flutter) on the live backend.
        </p>
        {cta}
      </div>
    </div>
  );
}

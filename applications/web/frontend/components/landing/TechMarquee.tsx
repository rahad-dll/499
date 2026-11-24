import { TECH_LOGOS, type TechLogo } from "@/components/landing/tech-logos";
import { cn } from "@/lib/utils";

function LogoItem({ logo }: { logo: TechLogo }) {
  return (
    <li
      className="flex shrink-0 items-center gap-2.5 text-[15px] font-bold tracking-tight text-muted-foreground"
      style={{ "--logo": logo.color } as React.CSSProperties}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={cn(
          "size-7 fill-current text-(--logo)",
          !logo.darkSafe && "dark:text-[color-mix(in_srgb,var(--logo)_35%,white)]",
        )}
      >
        <path d={logo.path} />
      </svg>
      {logo.name}
    </li>
  );
}

/**
 * "Built with" logo row that loops slowly to the left. Hovering pauses it;
 * with reduced motion it is a static, wrapped row.
 */
export function TechMarquee() {
  return (
    <section aria-label="Built with" className="border-y border-border bg-card/60">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-5 py-7 lg:flex-row lg:gap-10 lg:px-10">
        <span className="shrink-0 px-5 text-[11.5px] font-bold uppercase tracking-[0.22em] text-muted-foreground lg:px-0">
          Built with
        </span>
        <div className="group w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)] motion-reduce:[mask-image:none]">
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1}
                className={cn(
                  "flex shrink-0 items-center gap-12 pr-12 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-8 motion-reduce:gap-y-4 motion-reduce:px-5",
                  copy === 1 && "motion-reduce:hidden",
                )}
              >
                {TECH_LOGOS.map((logo) => (
                  <LogoItem key={logo.name} logo={logo} />
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

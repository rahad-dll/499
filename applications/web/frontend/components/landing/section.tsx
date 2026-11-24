import { cn } from "@/lib/utils";

/** Content width shared by every public page. */
export const CONTAINER = "mx-auto w-full max-w-[1240px] px-5 sm:px-6 lg:px-10";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[12px] font-bold uppercase tracking-[0.22em] text-brand", className)}>{children}</div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  desc,
  center = false,
  as: Heading = "h2",
}: {
  eyebrow: string;
  title: React.ReactNode;
  desc?: string;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-[680px]", center && "mx-auto text-center")}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading className="mt-3 text-[clamp(28px,3vw,40px)] font-extrabold leading-[1.15] tracking-[-0.02em]">{title}</Heading>
      {desc && <p className="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  );
}

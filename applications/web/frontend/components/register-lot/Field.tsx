import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** A compact labelled input with a leading icon, sized for the no-scroll wizard. */
export function Field({
  label,
  icon: Icon,
  labelEnd,
  end,
  id,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  icon: LucideIcon;
  labelEnd?: ReactNode;
  /** content inside the input's right edge (e.g. a button) */
  end?: ReactNode;
}) {
  const inputId = id ?? props.name;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex min-h-4 items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-[13px]">
          {label}
        </Label>
        {labelEnd}
      </div>
      <div className="relative flex items-center">
        <Icon className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <Input id={inputId} className={cn("h-10 pl-9 text-sm", end && "pr-11", className)} {...props} />
        {end && <span className="absolute right-1">{end}</span>}
      </div>
    </div>
  );
}

/** Small uppercase section heading used inside the wizard steps. */
export function SectionTitle({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{children}</h3>
      {end}
    </div>
  );
}

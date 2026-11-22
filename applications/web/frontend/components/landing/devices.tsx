import { cn } from "@/lib/utils";

/* Device frames for product shots. The bezel is always dark, so the frames
   read as hardware in both themes; screens keep the page theme. */

const BEZEL = "bg-[#0b1220] ring-1 ring-white/10 shadow-[0_40px_80px_-40px_rgba(15,23,42,0.7)]";

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[2.5rem] p-[8px]", BEZEL, className)}>
      <div className="overflow-hidden rounded-[2rem] bg-[#050a14]">
        {/* status-bar strip so the camera island doesn't cover the app */}
        <div className="flex h-7 items-center justify-center">
          <span className="h-[14px] w-[30%] rounded-full bg-black" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function MonitorFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className={cn("rounded-[20px] p-[10px]", BEZEL)}>
        <div className="overflow-hidden rounded-[11px] bg-card">{children}</div>
      </div>
      <div aria-hidden className="mx-auto h-9 w-[14%] bg-[linear-gradient(#1c2638,#0f1728)]" />
      <div aria-hidden className="mx-auto h-2.5 w-[30%] rounded-full bg-[#1c2638]" />
    </div>
  );
}

export function TabletFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[26px] p-[10px]", BEZEL, className)}>
      <div className="overflow-hidden rounded-[16px] bg-card">{children}</div>
    </div>
  );
}

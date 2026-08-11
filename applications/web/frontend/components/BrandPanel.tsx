import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Car,
  Cctv,
  ParkingCircle,
  Waypoints,
} from "lucide-react";
import { Logo } from "./Logo";

const STATUS_CARDS = [
  { icon: Activity, tint: "#18d6c0", bg: "rgba(24,214,192,0.14)", title: "Live tracking active", sub: "Real-time traffic flow monitoring", status: "Live" },
  { icon: Cctv, tint: "#8b6cff", bg: "rgba(139,108,255,0.14)", title: "AI surveillance online", sub: "Smart detection & incident alerts", status: "Online" },
  { icon: ParkingCircle, tint: "#18d6c0", bg: "rgba(24,214,192,0.14)", title: "Parking zones operational", sub: "2,157 / 2,400 slots available", status: "Operational" },
  { icon: BarChart3, tint: "#4db6f5", bg: "rgba(77,182,245,0.14)", title: "System performance optimal", sub: "99.98% uptime in the last 30 days", status: "Optimal" },
];

const STATS = [
  { icon: Car, value: "12.4K+", label: "Vehicles Monitored" },
  { icon: ParkingCircle, value: "2.1K+", label: "Parking Spots" },
  { icon: Cctv, value: "328", label: "Active Cameras" },
  { icon: Waypoints, value: "98%", label: "Traffic Flow Index" },
];

export function BrandPanel({
  eyebrow,
  heading,
  sub,
}: {
  eyebrow?: string;
  heading: ReactNode;
  sub: string;
}) {
  return (
    <aside
      className="relative hidden h-dvh min-h-0 flex-col overflow-hidden px-7 py-5 text-[var(--panel-fg)] lg:flex xl:px-10 xl:py-8 2xl:px-12 2xl:py-10 [@media(max-height:850px)]:py-4"
      style={{ background: "var(--panel-bg)" }}
    >
      <Logo tagline className="text-white" />

      {eyebrow && (
        <div className="mt-5 text-[12px] font-bold uppercase tracking-[0.35em] text-brand xl:mt-8 xl:text-[13px] 2xl:mt-10 [@media(max-height:850px)]:mt-4">
          {eyebrow}
        </div>
      )}
      <h1 className="mt-2.5 text-[clamp(29px,3.2vw,44px)] font-extrabold leading-[1.1] tracking-tight">
        {heading}
      </h1>
      <p className="mt-3 max-w-[460px] text-sm leading-5 text-[var(--panel-muted)] xl:text-[15px] xl:leading-6 2xl:mt-4 2xl:text-base">
        {sub}
      </p>

      <div className="mt-4 flex flex-col gap-2 xl:mt-5 2xl:mt-7 2xl:gap-3 [@media(max-height:850px)]:mt-4">
        {STATUS_CARDS.map((c) => (
          <div
            key={c.title}
            className="flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-3.5 py-2.5 xl:gap-3.5 xl:px-5 xl:py-3 2xl:py-4 [@media(max-height:850px)]:py-2.5"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl xl:size-10 2xl:size-11"
              style={{ background: c.bg, color: c.tint }}
            >
              <c.icon className="size-5" />
            </span>
            <span>
              <div className="text-[15px] font-bold">{c.title}</div>
              <div className="text-[13px] text-[var(--panel-muted)]">{c.sub}</div>
            </span>
            <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-emerald-400">
              <span className="size-[7px] animate-pulse-dot rounded-full bg-current shadow-[0_0_8px_currentColor] motion-reduce:animate-none" />
              {c.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-3.5 py-3 xl:mt-5 xl:gap-3 xl:px-4 xl:py-4 2xl:mt-7 2xl:px-5 2xl:py-5">
        {STATS.map((s) => (
          <div key={s.label}>
            <s.icon className="size-[18px] text-[var(--panel-muted)]" />
            <div className="mt-1 text-lg font-extrabold xl:text-xl 2xl:mt-1.5 2xl:text-2xl">{s.value}</div>
            <div className="mt-0.5 text-[11px] leading-4 text-[var(--panel-muted)] xl:text-[12px] 2xl:text-[12.5px]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* floating glow bubbles */}
      <span className="pointer-events-none absolute left-[60%] top-[13%] hidden size-11 animate-float items-center justify-center rounded-full border-2 border-[#18d6c0] text-[#18d6c0] shadow-[0_0_24px_rgba(24,214,192,0.45),inset_0_0_18px_rgba(24,214,192,0.12)] motion-reduce:animate-none xl:flex 2xl:left-[62%] 2xl:top-[16%] 2xl:size-[52px]">
        <ParkingCircle className="size-5" />
      </span>
      <span className="pointer-events-none absolute left-[78%] top-[21%] hidden size-12 animate-float items-center justify-center rounded-full border-2 border-[#8b6cff] text-[#8b6cff] shadow-[0_0_24px_rgba(139,108,255,0.45),inset_0_0_18px_rgba(139,108,255,0.12)] [animation-delay:1.5s] motion-reduce:animate-none xl:flex 2xl:top-[26%] 2xl:size-14">
        <Cctv className="size-5" />
      </span>
      <span className="pointer-events-none absolute left-[67%] top-[30%] hidden size-11 animate-float items-center justify-center rounded-full border-2 border-[#4db6f5] text-[#4db6f5] shadow-[0_0_24px_rgba(77,182,245,0.45),inset_0_0_18px_rgba(77,182,245,0.12)] [animation-delay:0.8s] motion-reduce:animate-none xl:flex 2xl:top-[36%] 2xl:size-[52px]">
        <Car className="size-5" />
      </span>
    </aside>
  );
}

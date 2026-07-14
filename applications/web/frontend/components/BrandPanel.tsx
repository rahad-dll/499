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
      className="relative hidden flex-col overflow-x-clip px-12 py-10 text-[var(--panel-fg)] lg:flex"
      style={{ background: "var(--panel-bg)" }}
    >
      <Logo tagline className="text-white" />

      {eyebrow && (
        <div className="mt-10 text-[13px] font-bold uppercase tracking-[0.35em] text-brand">
          {eyebrow}
        </div>
      )}
      <h1 className="mt-3 text-[clamp(34px,3.2vw,44px)] font-extrabold leading-[1.12] tracking-tight">
        {heading}
      </h1>
      <p className="mt-4 max-w-[460px] text-base text-[var(--panel-muted)]">
        {sub}
      </p>

      <div className="mt-7 flex flex-col gap-3">
        {STATUS_CARDS.map((c) => (
          <div
            key={c.title}
            className="flex items-center gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-5 py-4"
          >
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: c.bg, color: c.tint }}
            >
              <c.icon className="size-5" />
            </span>
            <span>
              <div className="text-[15px] font-bold">{c.title}</div>
              <div className="text-[13px] text-[var(--panel-muted)]">{c.sub}</div>
            </span>
            <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-emerald-400">
              <span className="size-[7px] animate-pulse-dot rounded-full bg-current shadow-[0_0_8px_currentColor]" />
              {c.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-4 gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-5 py-5">
        {STATS.map((s) => (
          <div key={s.label}>
            <s.icon className="size-[18px] text-[var(--panel-muted)]" />
            <div className="mt-1.5 text-2xl font-extrabold">{s.value}</div>
            <div className="mt-0.5 text-[12.5px] text-[var(--panel-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* floating glow bubbles */}
      <span className="pointer-events-none absolute left-[62%] top-[16%] flex size-[52px] animate-float items-center justify-center rounded-full border-2 border-[#18d6c0] text-[#18d6c0] shadow-[0_0_24px_rgba(24,214,192,0.45),inset_0_0_18px_rgba(24,214,192,0.12)]">
        <ParkingCircle className="size-5" />
      </span>
      <span className="pointer-events-none absolute left-[78%] top-[26%] flex size-[56px] animate-float items-center justify-center rounded-full border-2 border-[#8b6cff] text-[#8b6cff] shadow-[0_0_24px_rgba(139,108,255,0.45),inset_0_0_18px_rgba(139,108,255,0.12)] [animation-delay:1.5s]">
        <Cctv className="size-5" />
      </span>
      <span className="pointer-events-none absolute left-[67%] top-[36%] flex size-[52px] animate-float items-center justify-center rounded-full border-2 border-[#4db6f5] text-[#4db6f5] shadow-[0_0_24px_rgba(77,182,245,0.45),inset_0_0_18px_rgba(77,182,245,0.12)] [animation-delay:0.8s]">
        <Car className="size-5" />
      </span>
    </aside>
  );
}

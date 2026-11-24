import {
  BarChart3,
  Camera,
  CircleParking,
  FileDown,
  LayoutDashboard,
  Map as MapIcon,
  ScanEye,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { ALERT_RULES, PAYMENT_METHODS, SCAN_POINTS } from "@/components/landing/data";
import { cn } from "@/lib/utils";

/* ---------------- shared chrome ---------------- */

function Window({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-36px_rgba(15,23,42,0.5)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[12px] font-semibold text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------------- owner portal ---------------- */

const OWNER_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: CircleParking, label: "Register Lot" },
  { icon: Camera, label: "Cameras" },
  { icon: BarChart3, label: "Revenue" },
  { icon: Settings, label: "Settings" },
];

/* Slot boxes drawn over the camera frame; kind follows the portal's car/bike slots. */
const CAMERA_SLOTS = [
  { x: 6, y: 52, w: 17, h: 34, kind: "car", occupied: true },
  { x: 25, y: 52, w: 17, h: 34, kind: "car", occupied: false },
  { x: 44, y: 52, w: 17, h: 34, kind: "car", occupied: true },
  { x: 63, y: 52, w: 10, h: 34, kind: "bike", occupied: false },
  { x: 75, y: 52, w: 10, h: 34, kind: "bike", occupied: true },
  { x: 87, y: 52, w: 10, h: 34, kind: "bike", occupied: false },
] as const;

/** Owner portal content: camera slot layout, AI check, revenue and payments. */
export function OwnerScreen() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-extrabold">Camera slot layout</div>
          <div className="text-[11.5px] text-muted-foreground">Slots drawn on the camera view</div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand/12 px-2.5 py-1 text-[11px] font-bold text-brand">
          <ScanEye className="size-3.5" /> Run AI check
        </span>
      </div>

      <div className="relative mt-3 aspect-[16/8] overflow-hidden rounded-xl bg-[linear-gradient(160deg,#1b2638,#0d1422)]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <path d="M0 40 L100 40" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.6" />
          <path d="M0 92 L100 92" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.6" />
          {CAMERA_SLOTS.map((s, i) => {
            const color = s.kind === "car" ? "#18d6c0" : "#f59e0b";
            return (
              <g key={i}>
                <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={color} fillOpacity={s.occupied ? 0.1 : 0.04} stroke={color} strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
                {s.occupied && (
                  <rect x={s.x + s.w * 0.18} y={s.y + s.h * 0.16} width={s.w * 0.64} height={s.h * 0.68} rx="2.5" fill="#cbd5e1" fillOpacity="0.55" />
                )}
              </g>
            );
          })}
        </svg>
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 text-[10.5px] font-bold text-white">
          <span className="size-1.5 rounded-full bg-red-500" /> CAM 1
        </span>
        <div className="absolute right-2.5 top-2.5 flex gap-1.5 text-[10.5px] font-bold">
          <span className="rounded-md bg-black/45 px-2 py-1 text-[#18d6c0]">Car</span>
          <span className="rounded-md bg-black/45 px-2 py-1 text-[#f59e0b]">Bike</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-1.5 text-[12px] font-bold">
            <FileDown className="size-3.5 text-brand" /> Revenue history
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">Filter, cancel, export CSV</div>
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="text-[12px] font-bold">Payment methods</div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {PAYMENT_METHODS.map((m) => (
              <span key={m} className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OwnerPreview() {
  return (
    <Window title="CityPulse · Owner portal">
      <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr]">
        <div className="hidden border-r border-border p-3 sm:block">
          {OWNER_NAV.map((item) => (
            <div
              key={item.label}
              className={cn(
                "mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold",
                item.active ? "bg-brand/12 text-brand" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-4" /> {item.label}
            </div>
          ))}
        </div>
        <OwnerScreen />
      </div>
    </Window>
  );
}

/* ---------------- authority command center ---------------- */

const SEVERITY_DOT: Record<(typeof ALERT_RULES)[number]["severity"], string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

/* Places the Dhaka scan points on a simple 100×100 map. */
const LNG = [90.33, 90.46];
const LAT = [23.7, 23.91];
const mapX = (lng: number) => ((lng - LNG[0]) / (LNG[1] - LNG[0])) * 100;
const mapY = (lat: number) => ((LAT[1] - lat) / (LAT[1] - LAT[0])) * 100;

/** Command-center content: live Dhaka map, stress legend and alert rules.
 *  `alertsFirst` puts the alert list on the left (used in the hero, where a
 *  device overlaps the screen's right side). */
export function AuthorityScreen({ alertsFirst = false }: { alertsFirst?: boolean }) {
  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 text-[11.5px] font-semibold">
        {["Command Center", "Zones", "Enforcement", "Analytics"].map((tab, i) => (
          <span
            key={tab}
            className={cn("shrink-0 rounded-md px-2.5 py-1", i === 0 ? "bg-brand/12 text-brand" : "text-muted-foreground")}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className={cn("grid gap-3 p-3", alertsFirst ? "md:grid-cols-[210px_1fr]" : "md:grid-cols-[1fr_210px]")}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-[color-mix(in_srgb,var(--secondary)_70%,var(--card))] md:aspect-auto">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            {/* Turag / Buriganga to the west and south, Balu to the east */}
            <path d="M8 0 C 14 22, 4 44, 12 62 S 10 88, 30 100 L 0 100 L 0 0 Z" fill="#38bdf8" fillOpacity="0.16" />
            <path d="M92 0 C 88 30, 98 52, 90 74 S 94 92, 100 100 L 100 0 Z" fill="#38bdf8" fillOpacity="0.14" />
            <g stroke="var(--muted-foreground)" strokeOpacity="0.28" strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke">
              <path d="M40 0 L 36 30 L 34 55 L 38 100" />
              <path d="M66 0 L 64 40 L 70 70 L 76 100" />
              <path d="M10 46 L 40 42 L 70 50 L 96 48" />
              <path d="M14 76 L 40 80 L 70 74 L 92 82" />
              <path d="M26 20 L 52 30 L 80 22" />
            </g>
          </svg>
          {SCAN_POINTS.map((p) => (
            <div
              key={p.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${mapX(p.lng)}%`, top: `${mapY(p.lat)}%` }}
            >
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-brand text-[11px] font-extrabold text-white shadow-md">
                P
              </span>
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-bold shadow-sm">
                {p.name}
              </span>
            </div>
          ))}
          <div className="absolute right-2 top-2 rounded-lg border border-border bg-card/95 px-2.5 py-2 text-[10.5px]">
            <div className="mb-1 font-bold uppercase tracking-wider text-muted-foreground">Stress level</div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Optimal · under 60%</div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" /> Moderate · 60–84%</div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500" /> Critical · 85%+</div>
          </div>
        </div>
        <div className={cn("text-left", alertsFirst && "md:order-first")}>
          <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-extrabold">
            <ShieldAlert className="size-4 text-red-500" /> Real-time AI alerts
          </div>
          <div className="space-y-2">
            {ALERT_RULES.map((a) => (
              <div key={a.title} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-1.5 text-[11.5px] font-bold">
                  <span className={cn("size-2 rounded-full", SEVERITY_DOT[a.severity])} />
                  {a.title}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{a.rule}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <MapIcon className="size-3.5" /> OpenStreetMap · refreshed every 30 s
          </div>
        </div>
      </div>
    </>
  );
}

export function AuthorityPreview() {
  return (
    <Window title="CityPulse · Command center">
      <AuthorityScreen />
    </Window>
  );
}

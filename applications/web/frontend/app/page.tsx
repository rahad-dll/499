"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Car,
  Cctv,
  CheckCircle2,
  Download,
  Eye,
  Menu,
  ParkingCircle,
  ShieldCheck,
  Waypoints,
  Zap,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------- isometric hero visual ---------- */
const ISO = 30;
const OX = 270;
const OY = 96;
const px = (x: number, y: number, z = 0): [number, number] => [
  OX + (x - y) * ISO,
  OY + (x + y) * ISO * 0.5 - z,
];
const poly = (pts: [number, number][]) =>
  pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function Cuboid({ gx, gy, h }: { gx: number; gy: number; h: number }) {
  const p00 = px(gx, gy, h);
  const p10 = px(gx + 1, gy, h);
  const p11 = px(gx + 1, gy + 1, h);
  const p01 = px(gx, gy + 1, h);
  const b10 = px(gx + 1, gy);
  const b11 = px(gx + 1, gy + 1);
  const b01 = px(gx, gy + 1);
  return (
    <g stroke="var(--border)" strokeWidth="1">
      <polygon points={poly([p01, p11, b11, b01])} fill="var(--muted)" />
      <polygon points={poly([p11, p10, b10, b11])} fill="color-mix(in srgb, var(--foreground) 14%, var(--muted))" />
      <polygon points={poly([p00, p10, p11, p01])} fill="var(--card)" />
    </g>
  );
}

function Pin({ gx, gy, z, color }: { gx: number; gy: number; z: number; color: string }) {
  const [cx, cy] = px(gx, gy, z);
  const [bx, by] = px(gx, gy);
  return (
    <g>
      <line x1={bx} y1={by} x2={cx} y2={cy} stroke={color} strokeWidth="1.5" opacity="0.6" />
      <circle cx={cx} cy={cy} r="7" fill="none" stroke={color} strokeWidth="2" />
      <circle cx={cx} cy={cy} r="2.6" fill={color} />
    </g>
  );
}

function HeroViz() {
  const buildings: [number, number, number][] = [
    [4, 0, 52], [6, 0, 88], [2, 1, 40], [5, 2, 120], [7, 2, 64],
    [1, 3, 58], [3, 4, 96], [6, 4, 44], [2, 6, 68], [4, 6, 36],
  ];
  const road = [px(0, 8.6), px(4, 4.6), px(9, 4.6)];
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border p-4"
      style={{
        background:
          "radial-gradient(110% 100% at 80% 10%, color-mix(in srgb, #8b6cff 14%, transparent) 0%, transparent 55%), radial-gradient(100% 90% at 15% 90%, color-mix(in srgb, #18d6c0 10%, transparent) 0%, transparent 60%), var(--secondary)",
      }}
    >
      <span className="absolute left-[18px] top-[18px] inline-flex items-center gap-2 rounded-full border border-border bg-background/75 px-3 py-1.5 text-[11.5px] font-bold tracking-wider">
        <span className="size-[7px] rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
        LIVE 3D
      </span>
      <svg viewBox="0 0 540 420" fill="none" role="img" aria-label="Isometric city map with live parking markers" className="w-full">
        <g stroke="var(--border)" strokeWidth="0.7" opacity="0.55">
          {Array.from({ length: 10 }, (_, i) => {
            const [x1, y1] = px(i, 0);
            const [x2, y2] = px(i, 9);
            return <line key={`gx${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
          {Array.from({ length: 10 }, (_, i) => {
            const [x1, y1] = px(0, i);
            const [x2, y2] = px(9, i);
            return <line key={`gy${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        <polyline points={poly(road)} fill="none" stroke="#18d6c0" strokeWidth="2" strokeDasharray="7 6" opacity="0.85" />
        {buildings.map(([gx, gy, h]) => (
          <Cuboid key={`${gx}-${gy}`} gx={gx} gy={gy} h={h} />
        ))}
        <Pin gx={5.5} gy={2.5} z={150} color="#18d6c0" />
        <Pin gx={3.5} gy={4.5} z={126} color="#18d6c0" />
      </svg>
      <div className="absolute inset-x-0 bottom-3.5 text-center text-[12.5px] text-muted-foreground">
        Drag to rotate · WebGL
      </div>
    </div>
  );
}

/* ---------- data ---------- */
const FEATURES = [
  { icon: Activity, tint: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/15", title: "Real-time Detection", desc: "Live traffic and slot data streamed to drivers for proactive route optimization — powered by advanced roadside sensing.", highlight: false },
  { icon: Cctv, tint: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/15", title: "AI Surveillance", desc: "Smart AI cameras monitor corridors 24/7, automatically detecting incidents and illegal parking across the city.", highlight: true },
  { icon: BarChart3, tint: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/15", title: "Analytics", desc: "Predictive dashboards turn raw city data into actionable infrastructure planning insights for authorities.", highlight: false },
];

const IMPACTS: { icon: LucideIcon; tint: string; bg: string; name: string; metric: string }[] = [
  { icon: Car, tint: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/15", name: "Congestion Reduction", metric: "−32% average transit time" },
  { icon: ParkingCircle, tint: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/15", name: "Parking Efficiency", metric: "+41% slot utilization" },
  { icon: BarChart3, tint: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", name: "Economic Savings", metric: "৳2.4M saved monthly" },
  { icon: Eye, tint: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/15", name: "Computer Vision", metric: "YOLO detection pipeline" },
  { icon: Waypoints, tint: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15", name: "Machine Learning", metric: "Demand forecasting models" },
  { icon: Zap, tint: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/15", name: "Real-time WebSocket Data", metric: "Sub-second live updates" },
];

const NAV_LINKS = [
  { href: "#portals", label: "Drivers" },
  { href: "#portals", label: "Owners" },
  { href: "#portals", label: "Authorities" },
  { href: "#features", label: "Features" },
  { href: "#tech", label: "Technology" },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 flex items-center gap-7 border-b border-border bg-background/90 px-6 py-3.5 backdrop-blur-md lg:px-12">
        <Logo tagline={false} />
        <div className="mx-auto hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-[14.5px] font-medium text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <Link href="/login" className="hidden text-[14.5px] font-semibold text-foreground hover:text-brand lg:inline">
            Sign In
          </Link>
          <Button asChild variant="brand" size="sm">
            <Link href="/signup">
              Get Started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="flex flex-col border-b border-border bg-background px-5 pb-4 lg:hidden">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="border-b border-border py-2.5 font-semibold last:border-0">
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)} className="py-2.5 font-semibold text-brand">
            Sign In
          </Link>
        </div>
      )}

      {/* Hero */}
      <header className="mx-auto grid max-w-[1240px] items-center gap-14 px-6 py-14 lg:grid-cols-2 lg:px-12 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/45 bg-brand/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand">
            <span className="size-[7px] rounded-full bg-current shadow-[0_0_8px_currentColor]" />
            Smarter cities start here
          </span>
          <h1 className="mt-5 text-[clamp(34px,3.6vw,52px)] font-extrabold leading-[1.1] tracking-tight">
            CityPulse: Intelligent{" "}
            <span className="bg-gradient-to-r from-[#18d6c0] to-[#8b6cff] bg-clip-text text-transparent">
              Parking &amp; Traffic Control
            </span>{" "}
            Platform
          </h1>
          <p className="mt-5 max-w-[460px] text-[16.5px] text-muted-foreground">
            Connecting Drivers, Space Owners &amp; Authorities for Smarter Cities
            — AI camera sensing, live routing and city-scale analytics in one
            platform.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Button asChild variant="brand" size="lg">
              <Link href="/signup">
                Get Started <ArrowRight className="size-[18px]" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#portals">
                <Download className="size-[17px]" /> Download App
              </a>
            </Button>
          </div>
          <div className="mt-10 flex">
            {[
              ["12.4K+", "Vehicles guided daily"],
              ["2.1K+", "Smart parking spots"],
              ["98%", "Traffic flow index"],
            ].map(([v, l], i) => (
              <div key={l} className={cn("pr-7", i > 0 && "border-l border-border pl-7")}>
                <div className="text-[26px] font-extrabold tracking-tight">{v}</div>
                <div className="text-[13px] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <HeroViz />
      </header>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1240px] px-6 py-16 lg:px-12">
        <div className="text-[12.5px] font-bold uppercase tracking-[0.3em] text-brand">
          Platform Feature Suite
        </div>
        <h2 className="mt-2.5 text-[clamp(26px,2.6vw,36px)] font-extrabold tracking-tight">
          Everything a smart city needs
        </h2>
        <p className="mt-2 text-[15.5px] text-muted-foreground">
          Three engines working together — sensing, surveillance and insight.
        </p>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={cn(
                "rounded-2xl border bg-card p-6",
                f.highlight ? "border-violet-500/55 ring-[3px] ring-violet-500/10" : "border-border",
              )}
            >
              <span className={cn("flex size-[46px] items-center justify-center rounded-xl", f.bg, f.tint)}>
                <f.icon className="size-[22px]" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{f.title}</h3>
              <p className="mt-2.5 text-sm text-muted-foreground">{f.desc}</p>
              <a href="#tech" className={cn("mt-4 inline-flex items-center gap-1.5 text-sm", f.highlight ? "text-violet-500" : "text-brand")}>
                Learn more <ArrowRight className="size-[15px]" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="mx-auto max-w-[1240px] px-6 py-16 lg:px-12">
        <div className="text-[12.5px] font-bold uppercase tracking-[0.3em] text-violet-500">
          Integrated User Portals
        </div>
        <h2 className="mt-2.5 text-[clamp(26px,2.6vw,36px)] font-extrabold tracking-tight">
          One ecosystem, three experiences
        </h2>
        <p className="mt-2 text-[15.5px] text-muted-foreground">
          Purpose-built interfaces for every stakeholder in the city.
        </p>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {[
            { title: "Driver App", desc: "Find, book and navigate to verified parking in seconds — with AI-held reservations.", color: "text-brand" },
            { title: "Authority Dashboard", desc: "City-wide congestion heatmaps, real-time AI alerts and warden dispatch in one command center.", color: "text-violet-500" },
            { title: "Owner Portal", desc: "Monetize parking spaces with AI camera feeds, dynamic pricing and automated payouts.", color: "text-brand" },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-4 pb-6">
              <div className="relative h-[190px] overflow-hidden rounded-xl border border-white/[0.07] bg-[linear-gradient(160deg,#0d1526_0%,#101b31_100%)]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[length:44px_44px]" />
                <span className="absolute left-[22%] top-[38%] size-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                <span className="absolute left-[48%] top-[56%] size-3 rounded-full bg-[#18d6c0] shadow-[0_0_12px_#18d6c0]" />
                <span className="absolute left-[72%] top-[30%] size-3 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24]" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <Link href="/signup" className={cn("mt-4 inline-flex items-center gap-1.5 text-sm", p.color)}>
                Explore <ArrowRight className="size-[15px]" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section id="tech" className="mx-auto max-w-[1240px] px-6 py-16 lg:px-12">
        <div className="text-[12.5px] font-bold uppercase tracking-[0.3em] text-brand">
          Project Impact &amp; Core Technologies
        </div>
        <h2 className="mt-2.5 text-[clamp(26px,2.6vw,36px)] font-extrabold tracking-tight">
          Built to move a whole city
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IMPACTS.map((t) => (
            <div key={t.name} className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
              <span className={cn("flex size-[42px] shrink-0 items-center justify-center rounded-xl", t.bg, t.tint)}>
                <t.icon className="size-5" />
              </span>
              <span>
                <div className="text-[15px] font-bold">{t.name}</div>
                <div className={cn("text-[13px]", t.tint)}>{t.metric}</div>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section className="px-6 pb-16 pt-10 text-center lg:px-12">
        <div className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">
          Our Partners &amp; Capitalization
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 text-muted-foreground">
          {[
            [Activity, "CityPulse"],
            [Waypoints, "BTRC"],
            [ShieldCheck, "Dhaka North City Corporation"],
            [CheckCircle2, "roboflow"],
            [Cctv, "AI Lab BD"],
          ].map(([Icon, name]) => {
            const I = Icon as LucideIcon;
            return (
              <span key={name as string} className="inline-flex items-center gap-2.5 text-[15.5px] font-bold opacity-85">
                <I className="size-[18px]" /> {name as string}
              </span>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-[color-mix(in_srgb,var(--secondary)_45%,var(--background))]">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-12">
          <div>
            <Logo tagline={false} />
            <p className="mt-4 max-w-[280px] text-sm text-muted-foreground">
              Intelligent Parking &amp; Traffic Control Platform for smarter,
              smoother cities.
            </p>
          </div>
          {[
            { title: "Explore CityPulse", links: ["Solutions", "Case Studies", "API Docs", "Support"] },
            { title: "Legal & Compliance", links: ["Terms of Service", "Privacy Policy", "Security", "Compliance"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-[14.5px] font-extrabold">{col.title}</div>
              {col.links.map((l) => (
                <a key={l} href="#" className="mt-3 block text-sm font-medium text-muted-foreground hover:text-foreground">
                  {l}
                </a>
              ))}
            </div>
          ))}
          <div>
            <div className="text-[14.5px] font-extrabold">Contact Us</div>
            <p className="mt-3 text-sm text-muted-foreground">Dhaka North City Corporation</p>
            <p className="mt-3 text-sm text-muted-foreground">House 12, Gulshan Ave, Dhaka 1212</p>
            <p className="mt-3 text-sm text-muted-foreground">info@citypulse.com</p>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-4 border-t border-border px-6 py-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center lg:px-12">
          <span>© 2026 CityPulse — Intelligent Parking &amp; Traffic Control Platform</span>
          <span>Made in Dhaka · Powered by AI</span>
        </div>
      </footer>
    </div>
  );
}

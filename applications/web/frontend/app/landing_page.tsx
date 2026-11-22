import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  Building2,
  BookOpen,
  Bus,
  Cctv,
  Check,
  ChartLine,
  ChevronDown,
  ChevronRight,
  CircleParking,
  Clock,
  Cpu,
  Database,
  Gauge,
  GraduationCap,
  HeartPulse,
  KeyRound,
  Leaf,
  LockKeyhole,
  Landmark,
  MapPinned,
  Network,
  ReceiptText,
  Route,
  ScanLine,
  ShieldAlert,
  Smartphone,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { MonitorFrame, PhoneFrame, TabletFrame } from "@/components/landing/devices";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { MapPattern } from "@/components/landing/MapPattern";
import { LandingNav } from "@/components/landing/LandingNav";
import { DownloadAppButton } from "@/components/landing/DownloadAppButton";
import { DriverShowcase } from "@/components/landing/DriverShowcase";
import { jakarta } from "@/components/landing/font";
import { AuthorityPreview, AuthorityScreen, OwnerPreview, OwnerScreen } from "@/components/landing/previews";
import { RotatingTitle } from "@/components/landing/RotatingTitle";
import { CONTAINER, Eyebrow, SectionHeader } from "@/components/landing/section";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { TechMarquee } from "@/components/landing/TechMarquee";
import {
  ACCURACY_COMPARISON,
  ANNOUNCEMENT,
  AUTHORITY_POINTS,
  EFFECT_CHAIN,
  FAQ,
  FEATURES,
  HERO_STATS,
  HERO_TITLES,
  IMPACT_CONTEXT,
  OWNER_POINTS,
  PIPELINE,
  PROBLEMS,
  REPO_URL,
  RESULTS,
  SOCIETY_BENEFITS,
  SYSTEM_BENEFITS,
  TEAM,
  type EffectKey,
  type FeatureKey,
  type SocietyKey,
  type SystemKey,
} from "@/components/landing/data";
import { cn } from "@/lib/utils";
import driverMap from "@/public/landing/driver-map.webp";
import lprBlue from "@/public/landing/lpr-blue.webp";
import lprRed from "@/public/landing/lpr-red.webp";
import lprStreet from "@/public/landing/lpr-street.webp";

const FEATURE_ICON: Record<FeatureKey, { icon: LucideIcon; tint: string }> = {
  detection: { icon: Cctv, tint: "bg-teal-500/12 text-teal-600 dark:text-teal-400" },
  lpr: { icon: ScanLine, tint: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  command: { icon: MapPinned, tint: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  enforcement: { icon: ShieldAlert, tint: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
  bookings: { icon: ReceiptText, tint: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  security: { icon: KeyRound, tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
};

/* one per PIPELINE step: camera → inference → API → apps */
const PIPELINE_ICONS: LucideIcon[] = [Cctv, Cpu, Database, Smartphone];

/* crops of applications/ai/ai-models/plate-recognition/training-output/yolov26-stock/yolo26n/val_batch0_pred.jpg */
const LPR_SAMPLES = [
  { src: lprRed, alt: "Plate detector marking a Dhaka Metro licence plate with confidence 1.0" },
  { src: lprBlue, alt: "Plate detector marking a Chattogram Metro licence plate with confidence 0.9" },
  { src: lprStreet, alt: "Plate detector finding a licence plate in a busy street scene" },
];

/* ---------------- small building blocks ---------------- */

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px]">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- sections ---------------- */

function AnnouncementPill() {
  return (
    <a
      href={ANNOUNCEMENT.href}
      className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card/90 py-1 pl-1 pr-3.5 text-[13px] font-semibold shadow-[0_8px_24px_-20px_rgba(15,23,42,0.5)] backdrop-blur transition-colors hover:border-brand/50"
    >
      <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11.5px] font-bold text-white">{ANNOUNCEMENT.tag}</span>
      {ANNOUNCEMENT.text}
      <ArrowRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-brand" />
    </a>
  );
}

function TrustLine() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <GraduationCap className="size-4 text-brand" /> Built at North South University
      </span>
      <span aria-hidden className="hidden h-3.5 w-px bg-border sm:block" />
      <span>CSE499 Project Group 03</span>
      <span aria-hidden className="hidden h-3.5 w-px bg-border sm:block" />
      <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-brand">
        <GithubIcon className="size-4" /> Code on GitHub
      </a>
    </div>
  );
}

function Hero() {
  return (
    <header className="relative isolate overflow-hidden">
      <MapPattern className="absolute inset-0 -z-10 size-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] bg-[radial-gradient(50%_60%_at_50%_70%,color-mix(in_srgb,var(--brand)_10%,transparent),transparent_75%)]" />
      <div className={cn(CONTAINER, "pb-16 pt-12 text-center lg:pb-20 lg:pt-16")}>
        <AnnouncementPill />
        <RotatingTitle
          titles={HERO_TITLES}
          className="mx-auto mt-6 max-w-[960px] text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.06] tracking-[-0.03em]"
        />
        <HeroShowcase
          trust={<TrustLine />}
          devices={{
            driver: (
              <PhoneFrame>
                <Image
                  src={driverMap}
                  alt="CityPulse driver app showing nearby parking lots on a map of Banani"
                  placeholder="blur"
                  loading="eager"
                  sizes="(min-width: 768px) 190px, 250px"
                  className="h-auto w-full"
                />
              </PhoneFrame>
            ),
            owner: (
              <TabletFrame>
                <OwnerScreen />
              </TabletFrame>
            ),
            authority: (
              <MonitorFrame>
                <AuthorityScreen alertsFirst />
              </MonitorFrame>
            ),
          }}
        />
        <dl className="mx-auto mt-16 grid max-w-[760px] grid-cols-3 gap-y-6">
          {HERO_STATS.map((s, i) => (
            <div key={s.label} className={cn("px-3 sm:px-6", i > 0 && "border-l border-border")}>
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-[clamp(22px,2.6vw,32px)] font-extrabold tracking-tight">{s.value}</dd>
              <dd className="mt-1 text-[12.5px] leading-snug text-muted-foreground sm:text-[13.5px]">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

function Problem() {
  return (
    <section id="problem" className={cn(CONTAINER, "scroll-mt-20 py-20 lg:py-24")}>
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <SectionHeader
            eyebrow="The problem"
            title="One roadside-parked car can jam a road for hours."
            desc="Illegal roadside parking is one of the leading causes of traffic congestion in urban Bangladesh. CityPulse attacks it at the source: make organized parking easy to find, and make the roadside visible."
          />
          <div className="mt-8 space-y-4">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[13px] font-extrabold text-muted-foreground">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold">{p.title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="rounded-3xl border border-border bg-[linear-gradient(160deg,color-mix(in_srgb,var(--brand)_8%,var(--card)),var(--card))] p-7 sm:p-9">
            <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Today in Dhaka
            </div>
            <div className="mt-4 text-[64px] font-extrabold leading-none tracking-tight">202</div>
            <p className="mt-3 text-[15.5px] leading-relaxed text-muted-foreground">
              on-street spots are covered by Dhaka&apos;s first app-based parking pilot (DNCC, Gulshan, 2023) —
              and occupancy is still reported by booth operators. No computer vision, no plate recognition,
              one neighbourhood.
            </p>
            <div className="my-6 h-px bg-border" />
            <div className="text-[15px] font-bold">CityPulse automates the manual work:</div>
            <CheckList
              items={[
                "Slot occupancy read by AI from existing CCTV",
                "Bangladeshi licence plates detected automatically",
                "Any owner's lot can join, anywhere in the city",
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="platform" className="scroll-mt-20 bg-[color-mix(in_srgb,var(--secondary)_45%,var(--background))] py-20 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader
          eyebrow="Platform features"
          title="Everything a smart city needs"
          desc="Six building blocks that turn ordinary cameras into a city-wide parking and traffic network."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const { icon: Icon, tint } = FEATURE_ICON[f.key];
            return (
              <div
                key={f.key}
                className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand/45"
              >
                <div className="flex items-center justify-between">
                  <span className={cn("flex size-11 items-center justify-center rounded-xl", tint)}>
                    <Icon className="size-[22px]" />
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 text-[18px] font-extrabold">{f.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type PortalCopy = { icon: LucideIcon; eyebrow: string; title: string; desc: string };

function PortalIntro({ icon: Icon, eyebrow, title, desc }: PortalCopy) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand/12 text-brand">
          <Icon className="size-[18px]" />
        </span>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h3 className="mt-4 text-[clamp(24px,2.4vw,32px)] font-extrabold leading-tight tracking-[-0.02em]">{title}</h3>
      <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function PortalCta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-bold text-brand hover:underline">
      {label} <ArrowRight className="size-4" />
    </Link>
  );
}

function PortalRow({
  id,
  points,
  cta,
  visual,
  reverse = false,
  ...copy
}: PortalCopy & {
  id: string;
  points: string[];
  cta: { href: string; label: string };
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div id={id} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn(reverse && "lg:order-2")}>
        <PortalIntro {...copy} />
        <CheckList items={points} />
        <PortalCta {...cta} />
      </div>
      <div className={cn(reverse && "lg:order-1")}>{visual}</div>
    </div>
  );
}

function Portals() {
  return (
    <section id="portals" className={cn(CONTAINER, "scroll-mt-20 py-20 lg:py-24")}>
      <SectionHeader
        center
        eyebrow="For every stakeholder"
        title="One ecosystem, three experiences"
        desc="A mobile app for drivers and two web portals for owners and authorities — all running on the same live API."
      />
      <div className="mt-16 space-y-24">
        <div id="driver" className="scroll-mt-24">
          <DriverShowcase
            intro={
              <PortalIntro
                icon={Smartphone}
                eyebrow="Driver app"
                title="Find. Book. Park."
                desc="Drivers search any place in Dhaka, see which lots have free slots right now and book before they arrive — no more circling the block."
              />
            }
            cta={
              <div className="mt-7 flex flex-wrap items-start gap-x-6 gap-y-4">
                <DownloadAppButton />
                <Link
                  href="/signup?role=driver"
                  className="inline-flex h-12 items-center gap-1.5 text-[15px] font-bold text-brand hover:underline"
                >
                  Create a driver account <ArrowRight className="size-4" />
                </Link>
              </div>
            }
          />
        </div>
        <PortalRow
          id="owner"
          reverse
          icon={Building2}
          eyebrow="Parking-owner portal"
          title="Turn idle space into verified revenue."
          desc="Owners register lots, draw slots on their own camera view and let the AI keep availability honest — every booking and taka tracked in one place."
          points={OWNER_POINTS}
          cta={{ href: "/signup?role=owner", label: "Register your parking lot" }}
          visual={<OwnerPreview />}
        />
        <PortalRow
          id="authority"
          icon={Landmark}
          eyebrow="Traffic-authority command center"
          title="See the whole city's parking at a glance."
          desc="Live occupancy from every connected lot becomes zones, alerts and an enforcement log — without installing new hardware on the street."
          points={AUTHORITY_POINTS}
          cta={{ href: "/login", label: "Sign in to the command center" }}
          visual={<AuthorityPreview />}
        />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-[color-mix(in_srgb,var(--secondary)_45%,var(--background))] py-20 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader
          center
          eyebrow="How it works"
          title="From camera frame to free slot"
          desc="Four steps, one pipeline — from the camera on the pole to the app in a driver's hand."
        />
        <div className="relative mt-14">
          {/* connector between the step icons */}
          <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[31px] hidden border-t-2 border-dashed border-brand/35 lg:block" />
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((s, i) => {
              const Icon = PIPELINE_ICONS[i];
              return (
                <li key={s.step} className="relative">
                  <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0cc9ae] to-[#26b7e8] text-white shadow-[0_14px_30px_-14px_rgba(12,201,174,0.7)] ring-8 ring-[color-mix(in_srgb,var(--secondary)_45%,var(--background))]">
                    <Icon className="size-7" />
                  </span>
                  <div className="mt-5 rounded-2xl border border-border bg-card p-5">
                    <div className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-brand">Step {s.step}</div>
                    <h3 className="mt-1.5 text-[17px] font-extrabold">{s.title}</h3>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{s.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {s.tech.map((t) => (
                        <span key={t} className="rounded-md bg-muted px-2 py-1 text-[11.5px] font-semibold text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Results() {
  return (
    <section id="results" className={cn(CONTAINER, "scroll-mt-20 py-20 lg:py-24")}>
      <SectionHeader
        eyebrow="AI results"
        title="Measured on real data, not promised."
        desc="Every figure below comes from the project's own training and test runs, published in the GitHub repository."
      />
      <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {RESULTS.map((r) => (
          <div key={r.title} className="bg-card p-7">
            <div className="inline-block bg-gradient-to-r from-[#0cbfa6] to-[#7c5cff] bg-clip-text pb-1 text-[40px] font-extrabold leading-none tracking-tight text-transparent dark:from-[#18d6c0] dark:to-[#9b82ff]">
              {r.value}
            </div>
            <div className="mt-3 text-[15.5px] font-bold">{r.title}</div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{r.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="rounded-3xl border border-border bg-card p-7">
          <h3 className="text-[17px] font-extrabold">Accuracy on a parking lot the model never saw</h3>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Transfer learning from ImageNet is what closes the gap.
          </p>
          <div className="mt-6 divide-y divide-border">
            {ACCURACY_COMPARISON.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <span className={cn("text-[14.5px]", row.ours ? "font-bold" : "text-muted-foreground")}>{row.label}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[14.5px] font-extrabold tabular-nums",
                    row.ours ? "bg-brand/12 text-brand" : "bg-muted",
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-muted-foreground">
            Validation set: UFPR05, a lot kept entirely out of training.
          </p>
        </div>

        <figure className="flex flex-col rounded-3xl border border-border bg-card p-7">
          <h3 className="text-[17px] font-extrabold">Bangla plate detection on real roads</h3>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Trained on 8,236 images merged from public Bangladeshi licence-plate datasets.
          </p>
          <div className="mt-6 grid flex-1 content-center gap-3 sm:grid-cols-3">
            {LPR_SAMPLES.map((s) => (
              <Image
                key={s.alt}
                src={s.src}
                alt={s.alt}
                placeholder="blur"
                sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 90vw"
                className="aspect-[454/218] h-auto w-full rounded-xl object-cover"
              />
            ))}
          </div>
          <figcaption className="mt-5 flex items-start gap-2 text-[12.5px] text-muted-foreground">
            <ScanLine className="mt-0.5 size-4 shrink-0 text-brand-purple" />
            Validation output of the CityPulse YOLO26n plate detector — the scores are the model&apos;s own
            confidence.
          </figcaption>
        </figure>
      </div>

      <Link
        href="/research"
        className="group mt-8 flex items-center gap-4 rounded-3xl border border-border bg-card p-6 transition-colors hover:border-brand/45 sm:p-7"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-400">
          <BookOpen className="size-[22px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-extrabold">Datasets and research behind these results</span>
          <span className="mt-0.5 block text-[14px] text-muted-foreground">
            The public datasets we train on, the papers we build on, and the project reports.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-brand transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    </section>
  );
}

const EFFECT_ICONS: Record<EffectKey, LucideIcon> = {
  visible: CircleParking,
  circling: Route,
  roadside: Ban,
  moving: Gauge,
  saved: Leaf,
};

const SOCIETY_ICONS: Record<SocietyKey, LucideIcon> = {
  time: Clock,
  roads: Bus,
  air: Wind,
  police: HeartPulse,
  privacy: LockKeyhole,
};

const SYSTEM_ICONS: Record<SystemKey, LucideIcon> = {
  enforcement: ShieldAlert,
  data: ChartLine,
  supply: Building2,
  cost: Cctv,
  scale: Network,
};

function BenefitColumn({
  icon: HeaderIcon,
  eyebrow,
  title,
  items,
  icons,
  tint,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  items: readonly { key: string; title: string; desc: string }[];
  icons: Record<string, LucideIcon>;
  tint: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 items-center justify-center rounded-xl", tint)}>
          <HeaderIcon className="size-[22px]" />
        </span>
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h3 className="mt-1 text-[20px] font-extrabold tracking-tight">{title}</h3>
        </div>
      </div>
      <ul className="mt-6 divide-y divide-border">
        {items.map((item) => {
          const Icon = icons[item.key];
          return (
            <li key={item.key} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <div className="text-[15.5px] font-bold">{item.title}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Impact() {
  return (
    <section id="impact" className="scroll-mt-20 bg-[color-mix(in_srgb,var(--secondary)_45%,var(--background))] py-20 lg:py-24">
      <div className={CONTAINER}>
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16">
          <SectionHeader
            eyebrow="Impact"
            title="Better streets for everyone — not just drivers."
            desc="Parking is where much of Dhaka's traffic problem starts. Fix it at the source and the benefits reach the whole city: commuters, traffic police, parking owners and the systems that run the roads."
          />
          <dl className="grid grid-cols-2 gap-4">
            {IMPACT_CONTEXT.map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
                <dt className="sr-only">{c.label}</dt>
                <dd className="text-[30px] font-extrabold leading-none tracking-tight">{c.value}</dd>
                <dd className="mt-2 text-[13.5px] font-semibold leading-snug">{c.label}</dd>
                <dd className="mt-1 text-[12px] text-muted-foreground">{c.source}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* cause and effect, left to right */}
        <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-5">
          {EFFECT_CHAIN.map((step, i) => {
            const Icon = EFFECT_ICONS[step.key];
            return (
              <li key={step.key} className="relative flex gap-4 bg-card p-5 md:flex-col md:gap-0 md:p-6">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    i === EFFECT_CHAIN.length - 1
                      ? "bg-gradient-to-br from-[#0cc9ae] to-[#26b7e8] text-white"
                      : "bg-brand/12 text-brand",
                  )}
                >
                  <Icon className="size-[22px]" />
                </span>
                <div className="md:mt-4">
                  <div className="text-[15px] font-bold leading-snug">{step.title}</div>
                  <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{step.desc}</p>
                </div>
                {i < EFFECT_CHAIN.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-3 top-[38px] z-10 hidden size-6 items-center justify-center rounded-full border border-border bg-card text-brand md:flex"
                  >
                    <ChevronRight className="size-3.5" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <BenefitColumn
            icon={Users}
            eyebrow="For society"
            title="Healthier, fairer streets"
            items={SOCIETY_BENEFITS}
            icons={SOCIETY_ICONS}
            tint="bg-teal-500/12 text-teal-600 dark:text-teal-400"
          />
          <BenefitColumn
            icon={Landmark}
            eyebrow="For the city system"
            title="A traffic system that scales"
            items={SYSTEM_BENEFITS}
            icons={SYSTEM_ICONS}
            tint="bg-violet-500/12 text-violet-600 dark:text-violet-400"
          />
        </div>

        <div className="mt-6 flex flex-col items-start gap-5 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#fd9d24] text-white">
            <span className="text-[10px] font-bold uppercase tracking-wider">SDG</span>
            <span className="text-[24px] font-extrabold leading-none">11</span>
          </span>
          <div>
            <div className="text-[17px] font-extrabold">Aligned with UN Sustainable Development Goal 11</div>
            <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">
              Sustainable cities and communities: less circling and less roadside parking, with privacy risk reduced
              by design — the consequences the project set out to deliver in its CSE499B review.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Team() {
  return (
    <section id="team" className={cn(CONTAINER, "scroll-mt-20 py-20 lg:py-24")}>
      <SectionHeader
        center
        eyebrow="The team"
        title="Built by CSE499 Project Group 03"
        desc="CSE499A/B · Section 15 · Department of ECE, North South University. Four engineers across AI/ML, backend, mobile and web."
      />
      <div className="mx-auto mt-12 grid max-w-[1000px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TEAM.map((m) => {
          const words = m.name.replace(/^md\.?\s+/i, "").split(/\s+/);
          const initials = words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "");
          return (
            <div key={m.name} className="rounded-2xl border border-border bg-card p-6 text-center">
              {m.photo ? (
                <Image
                  src={m.photo}
                  alt={`Photo of ${m.name}`}
                  width={128}
                  height={128}
                  className="mx-auto size-16 rounded-full object-cover ring-2 ring-brand/30"
                />
              ) : (
                <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0cc9ae] to-[#7c5cff] text-[20px] font-extrabold text-white">
                  {initials}
                </span>
              )}
              <div className="mt-4 text-[15.5px] font-extrabold">{m.name}</div>
              <div className="mt-1 text-[13.5px] text-muted-foreground">{m.role}</div>
              {(m.github || m.linkedin) && (
                <div className="mt-3 flex justify-center gap-4">
                  {m.github && (
                    <a
                      href={m.github}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${m.name} on GitHub`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
                    >
                      <GithubIcon className="size-4" /> GitHub
                    </a>
                  )}
                  {m.linkedin && (
                    <a
                      href={m.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${m.name} on LinkedIn`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
                    >
                      <LinkedinIcon className="size-4" /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-[color-mix(in_srgb,var(--secondary)_45%,var(--background))] py-20 lg:py-24">
      <div className={cn(CONTAINER, "grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16")}>
        <SectionHeader
          eyebrow="FAQ"
          title="Questions, answered"
          desc="Straight answers about what CityPulse does today and what is still in progress."
        />
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-card px-5 open:border-brand/40 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-bold">
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="pb-5 text-[14.5px] leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* deterministic skyline for the CTA band */
const SKYLINE = [38, 62, 46, 88, 54, 120, 72, 96, 58, 140, 84, 66, 108, 50, 92, 74, 130, 60, 44, 82];

function CallToAction() {
  return (
    <section className="px-5 pb-20 sm:px-6 lg:px-10">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] bg-[#0b1324] px-6 py-14 text-white sm:px-12 lg:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_85%_100%,rgba(24,214,192,0.22),transparent_70%),radial-gradient(40%_60%_at_100%_0%,rgba(139,108,255,0.2),transparent_70%)]" />
        <svg
          aria-hidden
          viewBox="0 0 600 160"
          preserveAspectRatio="xMaxYMax meet"
          className="pointer-events-none absolute bottom-0 right-0 hidden h-[75%] w-[55%] opacity-60 md:block"
        >
          {SKYLINE.map((h, i) => (
            <g key={i}>
              <rect x={i * 30 + 2} y={160 - h} width="26" height={h} fill="#14203a" stroke="#1f2d4d" />
              {Array.from({ length: Math.floor(h / 22) }, (_, k) => (
                <rect key={k} x={i * 30 + 9} y={160 - h + 10 + k * 22} width="12" height="3" rx="1" fill="#18d6c0" opacity={(i + k) % 3 === 0 ? 0.7 : 0.18} />
              ))}
            </g>
          ))}
          <rect x="0" y="156" width="600" height="4" fill="#18d6c0" opacity="0.5" />
        </svg>

        <div className="relative max-w-[600px]">
          <div className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#18d6c0]">Get started</div>
          <h2 className="mt-3 text-[clamp(28px,3.2vw,42px)] font-extrabold leading-[1.12] tracking-[-0.02em]">
            Ready to make your city&apos;s parking smarter?
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-slate-300">
            Download the Android driver app, or create an account as a parking owner or a traffic
            authority. Every model, service and report is also on GitHub.
          </p>
          <div className="mt-8 flex flex-wrap items-start gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href="/signup">
                Create account <ArrowRight className="size-[18px]" />
              </Link>
            </Button>
            <DownloadAppButton
              buttonClassName="border border-white/25 bg-white/5 text-white shadow-none hover:bg-white/10"
              captionClassName="text-slate-400"
            />
            <Button
              asChild
              size="lg"
              className="border border-white/25 bg-white/5 text-white hover:bg-white/10"
            >
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <GithubIcon className="size-[18px]" /> View on GitHub
              </a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-slate-300">
            {["Works with existing CCTV", "Built for Dhaka's roads", "Code public on GitHub"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <Check className="size-4 text-[#18d6c0]" strokeWidth={3} /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className={cn(jakarta.className, "min-h-screen overflow-x-clip bg-background text-foreground")}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <Hero />
        <TechMarquee />
        <Problem />
        <Features />
        <Portals />
        <HowItWorks />
        <Results />
        <Impact />
        <Team />
        <Faq />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  );
}

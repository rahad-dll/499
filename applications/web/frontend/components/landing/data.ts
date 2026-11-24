/**
 * Landing-page copy and figures.
 *
 * Every number here comes from the project repository
 * (https://github.com/rahad-dll/499). The source file is noted next to each
 * group so figures can be re-checked when the models or docs change.
 */

import driverBook from "@/public/landing/driver-book.webp";
import driverBooked from "@/public/landing/driver-booked.webp";
import driverMap from "@/public/landing/driver-map.webp";
import driverSpace from "@/public/landing/driver-space.webp";

export const REPO_URL = "https://github.com/rahad-dll/499";
const REPO_FILE = `${REPO_URL}/blob/main`;

/* ---------------- hero titles ----------------
   Rotated by <RotatingTitle>. `hl: true` parts get the brand gradient. */
export type TitlePart = { text: string; hl?: boolean };

export const HERO_TITLES: TitlePart[][] = [
  [{ text: "CityPulse: Intelligent " }, { text: "Parking & Traffic Control", hl: true }, { text: " Platform" }],
  [{ text: "Find a free parking slot " }, { text: "before you reach the jam.", hl: true }],
  [{ text: "Your existing CCTV, now a " }, { text: "smart parking sensor.", hl: true }],
  [{ text: "Stop circling the block. " }, { text: "Start parking.", hl: true }],
  [{ text: "AI that reads " }, { text: "every parking slot", hl: true }, { text: " in real time." }],
  [{ text: "Bangla licence plates, " }, { text: "detected by AI", hl: true }, { text: " in milliseconds." }],
  [{ text: "One platform for " }, { text: "drivers, owners and authorities.", hl: true }],
  [{ text: "Turn idle parking space into " }, { text: "verified revenue.", hl: true }],
  [{ text: "A live command center for " }, { text: "Dhaka's streets.", hl: true }],
  [{ text: "Clear the roadside. " }, { text: "Clear the traffic.", hl: true }],
  [{ text: "Parking detection with " }, { text: "99.18% accuracy", hl: true }, { text: " on an unseen lot." }],
  [{ text: "Smarter parking today. " }, { text: "Smoother cities tomorrow.", hl: true }],
];

/* ---------------- hero audience switcher ---------------- */
export const HERO_AUDIENCES = [
  {
    key: "driver",
    label: "Drivers",
    device: "Driver app",
    pitch: "Find a free parking slot near you before you set off, book it by the hour and drive straight there — no more circling the block.",
    cta: { label: "Create a driver account", href: "/signup?role=driver" },
  },
  {
    key: "owner",
    label: "Parking owners",
    device: "Owner portal",
    pitch: "Turn the CCTV your lot already has into live slot monitoring, take bookings and track every taka you earn.",
    cta: { label: "Create an owner account", href: "/signup?role=owner" },
  },
  {
    key: "authority",
    label: "Traffic authorities",
    device: "Command center",
    pitch: "Watch live occupancy across Dhaka, get alerts for crowded lots and stale cameras, and log occupied slots with no booking.",
    cta: { label: "Open the command center", href: "/login" },
  },
] as const;

export type AudienceKey = (typeof HERO_AUDIENCES)[number]["key"];

/* Source: applications/ai/ai-models/plate-recognition/README.md (latest model work) */
export const ANNOUNCEMENT = { tag: "New", text: "Bangla plate detection at 98.1% precision", href: "#results" };

/* ---------------- headline figures ----------------
   Sources: README.md (CSE499A summary),
   applications/ai/ai-models/parking-occupancy/mobilenetv2/README.md,
   applications/ai/ai-models/plate-recognition/README.md */
export const HERO_STATS = [
  { value: "99.18%", label: "Slot-occupancy accuracy on an unseen lot" },
  { value: "808,991", label: "Parking images used to train the model" },
  { value: "98.1%", label: "Bangla plate-detection precision" },
];

export const RESULTS = [
  {
    value: "99.18%",
    title: "Slot-occupancy accuracy",
    detail: "MobileNetV2, validated on UFPR05 — a parking lot the model never saw in training.",
  },
  {
    value: "808,991",
    title: "Training images",
    detail: "PKLot (695,851) and CNRPark+EXT (113,140): sunny, overcast and rainy lots.",
  },
  {
    value: "+1.90 pp",
    title: "Gained by full fine-tuning",
    detail: "Head-only training reached 97.28%; unlocking every layer lifted it to 99.18%.",
  },
  {
    value: "98.53%",
    title: "VPS-Net occupancy stage",
    detail: "Published slot-detection pipeline reproduced as an alternate model.",
  },
  {
    value: "98.1%",
    title: "Plate-detection precision",
    detail: "YOLO26n on 865 test images with 742 Bangladeshi plates; 95.4% recall.",
  },
  {
    value: "3.0 ms",
    title: "Per image, plate detector",
    detail: "YOLO26n has only 2.4M parameters — small enough for edge hardware.",
  },
];

/* Source: mobilenetv2/README.md ("Why MobileNetV2", training tables) */
export const ACCURACY_COMPARISON = [
  { label: "Custom CNNs in published work", value: "≈ 93%", ours: false },
  { label: "CityPulse, phase 1 (head only)", value: "97.28%", ours: false },
  { label: "CityPulse, phase 2 (full fine-tune)", value: "99.18%", ours: true },
];

/* ---------------- problem ----------------
   Sources: README.md (Overview),
   others/499A/paper-reviews/dncc-smart-parking-review.md */
export const PROBLEMS = [
  {
    title: "Roadside parking blocks lanes",
    desc: "With no organized parking in sight, drivers stop wherever they can — and one blocked lane triggers chain jams that last for hours.",
  },
  {
    title: "Drivers circle with no information",
    desc: "Nobody knows which lot has a free slot until they arrive, so cars keep looping through already crowded streets.",
  },
  {
    title: "Manual policing doesn't scale",
    desc: "Posting traffic police at every busy intersection is unsustainable in extreme heat and heavy rain.",
  },
];

/* ---------------- platform features ---------------- */
export const FEATURES = [
  {
    key: "detection",
    title: "Real-time slot detection",
    desc: "Owners connect the CCTV they already have. A MobileNetV2 model classifies every slot as empty or occupied — no ground sensors to install.",
    tag: "Computer vision",
  },
  {
    key: "lpr",
    title: "Bangla licence-plate recognition",
    desc: "A YOLO detector finds Bangladeshi plates in camera frames, ready for two-line Bangla OCR at entry, exit and enforcement points.",
    tag: "Computer vision",
  },
  {
    key: "command",
    title: "Live command center",
    desc: "Authorities watch occupancy across Dhaka on an OpenStreetMap view that refreshes every 30 seconds, with zones and analytics.",
    tag: "Authorities",
  },
  {
    key: "enforcement",
    title: "Enforcement insights",
    desc: "Any slot the AI sees as occupied without a booking becomes an incident — possible unpaid parking, flagged automatically.",
    tag: "Authorities",
  },
  {
    key: "bookings",
    title: "Bookings & revenue",
    desc: "Drivers book by the hour; owners track every booking, cancellation and taka earned, then export revenue history to CSV.",
    tag: "Drivers & owners",
  },
  {
    key: "security",
    title: "Secure, role-based access",
    desc: "JWT sessions with rotating refresh tokens, per-role permissions and signed-in device management for every account.",
    tag: "Platform",
  },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];

/* ---------------- portals ----------------
   Sources: README.md (CSE499A summary), applications/web/frontend/README.md,
   applications/mobile/lib/screens, applications/web/backend/prisma/schema.prisma */
/* Real screens from applications/mobile/docs/images for CSE499A running project (9–12.jpeg) */
export const DRIVER_SCREENS = [
  {
    image: driverMap,
    title: "Find lots near you",
    desc: "Search any place — nearby lots appear on the map with their free slots.",
    alt: "Driver app map of Banani showing nearby parking lots and how many slots are free",
  },
  {
    image: driverSpace,
    title: "Check before you go",
    desc: "Free slots, hourly rate, distance and amenities for every lot.",
    alt: "Parking lot details with available slots, hourly rate, distance, amenities and a Book Now button",
  },
  {
    image: driverBook,
    title: "Book in seconds",
    desc: "Pick 1 to 8 hours and a start time; the total is shown up front.",
    alt: "Booking sheet with duration options, scheduled time, hourly rate and total",
  },
  {
    image: driverBooked,
    title: "Park with confidence",
    desc: "The booking lands in My Bookings, ready to view, navigate to or cancel.",
    alt: "Booking confirmed dialog showing hours booked and distance to the lot",
  },
];

export const OWNER_POINTS = [
  "Register a lot with an OpenStreetMap location picker and photos",
  "Draw car and bike slots right on the camera view, each with its own rate",
  "Run an AI occupancy check on any camera, on demand",
  "Revenue history with filters, cancellations and CSV export",
];

export const AUTHORITY_POINTS = [
  "Live map of Uttara, Mirpur, Gulshan, Dhanmondi and Motijheel",
  "Alerts for high occupancy, stale cameras and unclassified slots",
  "Zones ranked by stress: optimal, moderate or critical",
  "Enforcement log of occupied slots with no booking",
];

/* Stress thresholds and alert rules: applications/web/frontend/lib/insights/metrics.ts */
export const ALERT_RULES = [
  { severity: "critical", title: "High occupancy", rule: "85% or more of a lot's slots occupied" },
  { severity: "warning", title: "Occupied without booking", rule: "Logged as an enforcement incident" },
  { severity: "warning", title: "Camera data stale", rule: "No fresh AI reading from the lot" },
  { severity: "info", title: "Slot not classified", rule: "AI could not read the slot yet" },
] as const;

/* Scan points polled by the command center: lib/spaces/use-live-spaces.ts */
export const SCAN_POINTS = [
  { name: "Uttara", lat: 23.8759, lng: 90.3795 },
  { name: "Mirpur", lat: 23.8223, lng: 90.3654 },
  { name: "Gulshan / Banani", lat: 23.7937, lng: 90.4066 },
  { name: "Dhanmondi", lat: 23.7461, lng: 90.3742 },
  { name: "Motijheel", lat: 23.733, lng: 90.4172 },
];

/* ---------------- how it works ---------------- */
export const PIPELINE = [
  {
    step: "01",
    title: "Connect a camera",
    desc: "An owner registers the lot, pins it on the map and links an existing CCTV camera.",
    tech: ["Owner portal", "RTSP camera"],
  },
  {
    step: "02",
    title: "AI reads every slot",
    desc: "The inference service classifies each cropped slot as empty or occupied and logs every result.",
    tech: ["FastAPI", "PyTorch", "MongoDB"],
  },
  {
    step: "03",
    title: "One API syncs everyone",
    desc: "Lots, slots, bookings and payments live in one database behind role-based access.",
    tech: ["NestJS", "Prisma", "PostgreSQL"],
  },
  {
    step: "04",
    title: "Drivers park, cities act",
    desc: "Drivers see free slots and book; authorities see zones, alerts and enforcement.",
    tech: ["Flutter", "Next.js", "OpenStreetMap"],
  },
];

/* Payment methods modelled in the database: prisma/schema.prisma (enum payment_method) */
export const PAYMENT_METHODS = ["bKash", "Nagad", "Card", "Cash"];

/* ---------------- impact ----------------
   Sources: others/499A/CSE499A-project-proposal-report.pdf and
   CSE499A-project-final-report.pdf (Introduction, Problem Statement),
   others/CSE499B-review-report.pdf (consequences: SDG 11; privacy design),
   others/499A/paper-reviews/laws/bd-surveillance-legal-regulatory-framework.md */
export const IMPACT_CONTEXT = [
  { value: "≈7 km/h", label: "Average traffic speed in Dhaka", source: "World Bank, cited in the CSE499A report" },
  { value: "180M+", label: "Mobile subscribers in Bangladesh (2024)", source: "The reach of an app-first fix" },
];

/* how one free slot on a map turns into a smoother city */
export const EFFECT_CHAIN = [
  { key: "visible", title: "Free slots are visible", desc: "Drivers see live availability before they set off." },
  { key: "circling", title: "Fewer cars circling", desc: "Search traffic stops adding to the jam." },
  { key: "roadside", title: "The roadside stays clear", desc: "Cars park in lots instead of in a lane." },
  { key: "moving", title: "Traffic keeps moving", desc: "Open lanes mean fewer chain jams." },
  { key: "saved", title: "Time, fuel and air saved", desc: "Less idling, less exhaust, less stress." },
] as const;

export const SOCIETY_BENEFITS = [
  {
    key: "time",
    title: "Less time lost in traffic",
    desc: "Knowing where a free slot is before arriving ends the slow loop around crowded blocks — for the driver and everyone stuck behind them.",
  },
  {
    key: "roads",
    title: "Roads shared fairly again",
    desc: "Every car parked in a lot instead of on the road keeps a lane open for buses, rickshaws and pedestrians.",
  },
  {
    key: "air",
    title: "Cleaner air, less fuel burned",
    desc: "Shorter searches and fewer stop-and-go jams mean less idling — and less exhaust in one of the world's densest cities.",
  },
  {
    key: "police",
    title: "Healthier work for traffic police",
    desc: "Officers no longer need to stand at every junction in extreme heat, monsoon rain and polluted air. The cameras watch; people respond where needed.",
  },
  {
    key: "privacy",
    title: "Privacy built in, not bolted on",
    desc: "Designed around Bangladesh's Personal Data Protection Ordinance 2025: AI logs delete themselves after 30 days, and plate data is planned to be authority-only, logged on every lookup and kept for a fixed period.",
  },
] as const;

export const SYSTEM_BENEFITS = [
  {
    key: "enforcement",
    title: "Enforcement that scales",
    desc: "Every occupied slot without a booking is flagged automatically, so officers go where incidents are instead of patrolling every street.",
  },
  {
    key: "data",
    title: "Decisions from data, not guesswork",
    desc: "Live occupancy ranked by zone shows where demand outgrows supply, and every AI reading is stored for future demand forecasting.",
  },
  {
    key: "supply",
    title: "Unlocks idle private parking",
    desc: "Private and organizational lots that sit half empty become visible and bookable, turning unused space into income for owners.",
  },
  {
    key: "cost",
    title: "Low cost to roll out",
    desc: "No ground sensors and no new cameras: the AI reads the CCTV lots already have, and the models are small enough for edge hardware.",
  },
  {
    key: "scale",
    title: "Built for the whole country",
    desc: "Any owner's lot can join, and the data model already follows Bangladesh's division → district → thana → area hierarchy for jurisdiction-level views.",
  },
] as const;

export type SocietyKey = (typeof SOCIETY_BENEFITS)[number]["key"];
export type SystemKey = (typeof SYSTEM_BENEFITS)[number]["key"];
export type EffectKey = (typeof EFFECT_CHAIN)[number]["key"];

/* ---------------- team ----------------
   Source: README.md (Team Structure).
   `photo`: a square image in public/team/, e.g. "/team/rahad.webp" (shown
   instead of the initials). `linkedin`: the full profile URL. */
export interface TeamMember {
  name: string;
  role: string;
  github: string | null;
  linkedin: string | null;
  photo: string | null;
}

export const TEAM: TeamMember[] = [
  { name: "Md. Rahad Hossain", role: "AI/ML · Backend", github: "https://github.com/rahad-dll", linkedin: null, photo: null },
  { name: "Md. Yousuf", role: "AI/ML · Mobile", github: null, linkedin: null, photo: null },
  { name: "MD. Rokib Hasan Oli", role: "AI/ML · Frontend", github: "https://github.com/Rokib-Hasan-Oli", linkedin: null, photo: null },
  { name: "Safayat Ibrahim", role: "Joined in CSE499B", github: null, linkedin: null, photo: null },
];

/* ---------------- footer resources ---------------- */
export const RESOURCES = [
  { label: "GitHub repository", href: REPO_URL },
  { label: "CSE499A final report", href: `${REPO_FILE}/others/499A/CSE499A-project-final-report.pdf` },
  { label: "CSE499B review report", href: `${REPO_FILE}/others/CSE499B-review-report.pdf` },
  { label: "One-minute demo video", href: `${REPO_FILE}/others/499A/demo-1min.mp4` },
];

/* ---------------- datasets & research ----------------
   Sources: applications/ai/ai-models/<model>/README.md (occupancy, VPS-Net,
   plate recognition),
   others/499A/paper-reviews/ */
export const DATASETS = [
  { name: "PKLot", detail: "695,851 slot images from 3 lots in sun, overcast and rain", href: null },
  { name: "CNRPark+EXT", detail: "113,140 slot images from 9 camera angles", href: null },
  {
    name: "Parking Occupancy Merged",
    detail: "Our combined training set, published on Kaggle",
    href: "https://www.kaggle.com/datasets/raahad/parking-occupancy-merged",
  },
  {
    name: "Bangladeshi License Plate Recognition",
    detail: "Full frames with plate and character boxes",
    href: "https://www.kaggle.com/datasets/syednahinhossain/bangladeshi-license-plate-recognition-dataset",
  },
  { name: "BLPD", detail: "Bangla licence-plate frames and crops", href: "https://github.com/prosensarker4/BLPD" },
];

export const RESEARCH = [
  { name: "MobileNetV2", detail: "Sandler et al., CVPR 2018 — the occupancy backbone", href: null },
  {
    name: "VPS-Net",
    detail: "Li et al., Sensors 2020 — slot detection + occupancy",
    href: "https://www.mdpi.com/1424-8220/20/7/2138",
  },
  {
    name: "Parking occupancy in Bangladesh",
    detail: "Prova et al., IEEE IEMTRONICS 2022 — 86–90% transfer to local footage",
    href: "https://doi.org/10.1109/IEMTRONICS55184.2022.9795771",
  },
  {
    name: "Improved MobileNetV3 parking",
    detail: "Yuldashev et al., Sensors 2023",
    href: "https://doi.org/10.3390/s23177642",
  },
  {
    name: "Intelligent traffic signaling in Dhaka",
    detail: "Azam et al., BUET, 2025 — field test at Palashi intersection",
    href: "https://arxiv.org/abs/2510.16622",
  },
];

/* ---------------- FAQ ---------------- */
export const FAQ = [
  {
    q: "Do parking owners need new cameras or sensors?",
    a: "No. Owners link the CCTV camera they already have, draw the slots on its view, and the AI reads each slot from the video. No ground sensors are installed.",
  },
  {
    q: "How accurate is the parking detection?",
    a: "The MobileNetV2 model scored 99.18% on UFPR05, a parking lot it never saw during training. A further fine-tuning pass on footage from a Dhaka site is planned next.",
  },
  {
    q: "Which parts of Dhaka does the command center cover?",
    a: "It checks Uttara, Mirpur, Gulshan / Banani, Dhanmondi and Motijheel every 30 seconds and shows every connected lot it finds there on an OpenStreetMap view.",
  },
  {
    q: "Can drivers download the app today?",
    a: "Yes, on Android. The Flutter driver app runs on the live backend — search, booking, booking history and profile. Press “Download the app” in the driver section of this page to get the latest build.",
  },
  {
    q: "How do payments work?",
    a: "Each booking records its payment method: bKash, Nagad, card or cash. Sandbox bKash and Nagad payments and demand-based pricing are planned next.",
  },
  {
    q: "How is account data protected?",
    a: "Sign-in uses JWT access tokens with rotating refresh tokens, role-based permissions and per-device session management. The AI service sits behind its own token, and its inference logs are deleted automatically after 30 days.",
  },
];

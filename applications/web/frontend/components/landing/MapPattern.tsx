import { cn } from "@/lib/utils";

/* A faint, static street-map pattern for the hero background: a river,
   a few arterial roads, neighbourhood street grids at different angles (like
   Dhaka's mix of planned sectors) and some parking pins. It is inline SVG,
   so it paints with the first frame — no image request. */

const W = 1440;
const H = 900;

// [centre x, centre y, rotation°, radius]
const GRIDS: [number, number, number, number][] = [
  [210, 200, 12, 170],
  [640, 150, -8, 150],
  [1110, 210, 20, 190],
  [380, 560, -15, 160],
  [930, 500, 5, 175],
  [1290, 600, -20, 150],
  [150, 790, 8, 140],
  [720, 830, 0, 130],
];
const STREET_GAP = 34;

const ARTERIALS = [
  "M -40 330 C 300 300, 520 380, 820 340 S 1250 280, 1480 320",
  "M -40 690 C 260 640, 560 700, 860 650 S 1260 600, 1480 660",
  "M 470 -40 C 440 220, 520 420, 480 940",
  "M 1000 -40 C 1040 260, 960 520, 1020 940",
  "M -40 120 L 1480 40",
];

const RIVER = "M -60 470 C 220 430, 300 520, 560 500 S 980 420, 1180 470 S 1400 540, 1500 520";

const PINS: [number, number][] = [
  [470, 330], [1000, 330], [488, 672], [1010, 640], [820, 340], [260, 652],
];

function StreetGrid({ cx, cy, angle, r, id }: { cx: number; cy: number; angle: number; r: number; id: string }) {
  const lines: number[] = [];
  for (let d = -r; d <= r; d += STREET_GAP) lines.push(d);
  return (
    <g clipPath={`url(#${id})`}>
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        {lines.map((d) => (
          <g key={d}>
            <line x1={cx - r} y1={cy + d} x2={cx + r} y2={cy + d} />
            <line x1={cx + d} y1={cy - r} x2={cx + d} y2={cy + r} />
          </g>
        ))}
      </g>
    </g>
  );
}

export function MapPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        "pointer-events-none [mask-image:radial-gradient(ellipse_60%_55%_at_50%_32%,transparent_25%,black_80%)]",
        className,
      )}
    >
      <defs>
        {GRIDS.map(([cx, cy, , r], i) => (
          <clipPath key={i} id={`cp-street-${i}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        ))}
      </defs>

      <path d={RIVER} fill="none" stroke="#26b7e8" strokeOpacity="0.1" strokeWidth="46" strokeLinecap="round" />

      <g stroke="var(--border)" strokeWidth="1.2" opacity="0.9">
        {GRIDS.map(([cx, cy, angle, r], i) => (
          <StreetGrid key={i} cx={cx} cy={cy} angle={angle} r={r} id={`cp-street-${i}`} />
        ))}
      </g>

      {/* arterial roads: an edge line with the page colour inside */}
      <g fill="none" strokeLinecap="round">
        {ARTERIALS.map((d) => (
          <g key={d}>
            <path d={d} stroke="var(--border)" strokeWidth="11" />
            <path d={d} stroke="var(--background)" strokeWidth="8" />
          </g>
        ))}
      </g>

      <g>
        {PINS.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="11" fill="var(--brand)" fillOpacity="0.14" stroke="var(--brand)" strokeOpacity="0.4" />
            <circle cx={x} cy={y} r="3.5" fill="var(--brand)" fillOpacity="0.55" />
          </g>
        ))}
      </g>
    </svg>
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Share card shown when a CityPulse link is posted on social apps.
// Figures come from the project repository (see components/landing/data.ts).
export const alt = "CityPulse — Intelligent Parking & Traffic Control Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STATS = [
  ["99.18%", "slot-occupancy accuracy"],
  ["808,991", "training images"],
  ["98.1%", "Bangla plate-detection precision"],
];

// Same family as the landing page (Plus Jakarta Sans, SIL OFL — see _og-fonts/OFL.txt)
const font = (weight: 400 | 800) =>
  readFile(join(process.cwd(), `app/_og-fonts/plus-jakarta-sans-latin-${weight}-normal.woff`));

export default async function OpengraphImage() {
  const [regular, extraBold] = await Promise.all([font(400), font(800)]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#f8fafc",
          fontFamily: "Plus Jakarta Sans",
          backgroundColor: "#0b1324",
          backgroundImage:
            "radial-gradient(circle at 88% 8%, rgba(24,214,192,0.30), transparent 45%), radial-gradient(circle at 10% 100%, rgba(139,108,255,0.28), transparent 45%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
          <span>City</span>
          <span style={{ color: "#18d6c0" }}>Pulse</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, maxWidth: 900 }}>
            Intelligent Parking &amp; Traffic Control for Dhaka
          </div>
          <div style={{ marginTop: 20, fontSize: 28, color: "#94a3b8", maxWidth: 900 }}>
            AI reads existing CCTV to find free slots, detect Bangla licence plates and flag roadside parking.
          </div>
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          {STATS.map(([value, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: "#18d6c0" }}>{value}</div>
              <div style={{ fontSize: 22, color: "#94a3b8" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plus Jakarta Sans", data: regular, weight: 400, style: "normal" },
        { name: "Plus Jakarta Sans", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}

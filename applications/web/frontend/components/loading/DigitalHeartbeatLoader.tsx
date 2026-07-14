"use client";

import { motion } from "framer-motion";
import "./loader.css";

/**
 * "Digital City Heartbeat" — CityPulse loading indicator.
 *
 * Two synchronized layers:
 *  1. An EKG heartbeat line whose glowing stroke travels left → right,
 *     cycling Red → Yellow → Green.
 *  2. A minimalist city skyline that pulses (opacity surge + scaleY bounce
 *     + stroke flash) exactly when the EKG spike passes the center.
 *
 * `flatline` freezes everything into the red offline state.
 */

const LOOP = 2.4; // one heartbeat cycle, seconds — shared by every layer
const RYG = ["#EF4444", "#EAB308", "#22C55E", "#EF4444"];

// Flat line → classic EKG spike in the center → flat line
const EKG_PATH =
  "M0 86 H150 L163 86 L172 62 L186 106 L200 34 L214 100 L224 78 L232 86 H400";
const FLAT_PATH = "M0 86 H400";

// x, width, height — five abstract buildings sitting on the EKG baseline
const BUILDINGS: [number, number, number][] = [
  [96, 26, 34],
  [132, 34, 52],
  [176, 40, 68],
  [226, 30, 44],
  [266, 24, 26],
];

// The spike crosses the center at ~50% of the loop
const PULSE_TIMES = [0, 0.42, 0.5, 0.62, 1];

function Building({
  x,
  width,
  height,
  index,
}: {
  x: number;
  width: number;
  height: number;
  index: number;
}) {
  return (
    <motion.rect
      x={x}
      y={84 - height}
      width={width}
      height={height}
      rx={2}
      fill="currentColor"
      strokeWidth={1.5}
      style={{ originY: "84px", originX: `${x + width / 2}px` }}
      animate={{
        fillOpacity: [0.1, 0.1, 0.8, 0.15, 0.1],
        scaleY: [1, 1, 1.08, 1.01, 1],
        stroke: ["#EF4444", "#EF4444", "#EAB308", "#22C55E", "#EF4444"],
        strokeOpacity: [0.25, 0.25, 1, 0.4, 0.25],
      }}
      transition={{
        duration: LOOP,
        times: PULSE_TIMES,
        repeat: Infinity,
        ease: "easeOut",
        // tiny stagger so the skyline ripples outward from the spike
        delay: Math.abs(index - 2) * 0.045,
      }}
    />
  );
}

export function DigitalHeartbeatLoader({
  flatline = false,
  size = 260,
}: {
  flatline?: boolean;
  size?: number;
}) {
  return (
    <div
      className={`hb-frame ${flatline ? "hb-flatline" : ""}`}
      style={{ width: size }}
      role="status"
      aria-label={flatline ? "Connection lost" : "Loading CityPulse"}
    >
      <svg viewBox="0 0 400 130" fill="none" aria-hidden>
        {/* ---- skyline ---- */}
        {flatline
          ? BUILDINGS.map(([x, w, h]) => (
              <rect
                key={x}
                x={x}
                y={84 - h}
                width={w}
                height={h}
                rx={2}
                fill="#EF4444"
                fillOpacity={0.12}
                stroke="#EF4444"
                strokeOpacity={0.35}
                strokeWidth={1.5}
              />
            ))
          : BUILDINGS.map(([x, w, h], i) => (
              <Building key={x} x={x} width={w} height={h} index={i} />
            ))}

        {/* ---- faint full EKG track ---- */}
        <path
          d={flatline ? FLAT_PATH : EKG_PATH}
          stroke={flatline ? "#EF4444" : "currentColor"}
          strokeOpacity={flatline ? 0.9 : 0.14}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ---- traveling glowing segment ---- */}
        {!flatline && (
          <motion.path
            d={EKG_PATH}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hb-glow"
            initial={{ pathLength: 0.22, pathOffset: 0 }}
            animate={{
              pathOffset: [0, 0.78],
              stroke: RYG,
            }}
            transition={{
              duration: LOOP,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </svg>
    </div>
  );
}

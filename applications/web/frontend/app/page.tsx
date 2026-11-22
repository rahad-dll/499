import type { Metadata } from "next";

// Route entry — Next.js reserves the filename "page.tsx".
// Implementation: ./landing_page.tsx
export { default } from "./landing_page";

export const metadata: Metadata = {
  title: "CityPulse — Intelligent Parking & Traffic Control Platform",
  description:
    "CityPulse connects drivers, parking owners and traffic authorities. AI reads existing CCTV to find free parking slots, detect Bangla licence plates and flag roadside parking in Dhaka.",
};

/**
 * Plain-language explanations for the technical words the portals use,
 * shown by <InfoTip>. Thresholds match `stressOf` in ./metrics.ts.
 */
export const GLOSSARY = {
  rtsp: {
    title: "RTSP stream URL",
    body: "The network address of a CCTV camera's live video. It starts with rtsp:// and is listed in the camera or DVR/NVR settings — or ask whoever installed your cameras. CityPulse reads this stream to see which slots are free.",
  },
  stale: {
    title: "Stale camera data",
    body: "CityPulse hasn't had a fresh AI reading from this lot's camera recently, so the slot status shown may be out of date. Check that the camera is powered on and connected.",
  },
  unbooked: {
    title: "Unbooked occupancy",
    body: "A slot the AI sees as occupied that has no CityPulse booking. It may be unpaid parking, or a driver who paid another way — treat it as something to check, not as proof.",
  },
  stress: {
    title: "Parking stress",
    body: "How full parking is, using the slots the AI could classify: Optimal below 60%, Moderate from 60% to 84%, Critical at 85% or more.",
  },
  confidence: {
    title: "AI confidence",
    body: "How sure the AI model is about its reading, from 0 to 100%. Low scores usually mean the camera view is blocked, dark or blurry.",
  },
  unknown: {
    title: "Unknown slots",
    body: "Slots the AI couldn't classify as free or occupied, often because the view is blocked or too dark. They are left out of occupancy percentages.",
  },
  occupancy: {
    title: "Live occupancy",
    body: "The share of AI-classified slots that are occupied right now. Slots the AI couldn't classify aren't counted.",
  },
  freshData: {
    title: "Fresh AI data",
    body: "The share of lots whose cameras have sent a recent AI reading. The rest are stale and may show out-of-date slot status.",
  },
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;

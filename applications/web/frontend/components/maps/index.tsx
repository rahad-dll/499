"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

/* Leaflet reads `window` when it loads, so the maps are client-only. */

function MapSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-secondary/60", className)} />;
}

export const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => <MapSkeleton className="absolute inset-0" />,
});

export const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <MapSkeleton className="h-72 rounded-xl" />,
});

export type { LiveMapProps } from "./LiveMap";
export type { PickedLocation } from "./LocationPicker";

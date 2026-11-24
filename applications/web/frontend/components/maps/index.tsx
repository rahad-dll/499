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

/* Role maps: Google Maps (with an OpenStreetMap fallback when no key is set). */
export const OwnerMap = dynamic(() => import("./owner/OwnerMap"), {
  ssr: false,
  loading: () => <MapSkeleton className="absolute inset-0" />,
});

export const AuthorityMap = dynamic(() => import("./authority/AuthorityMap"), {
  ssr: false,
  loading: () => <MapSkeleton className="absolute inset-0" />,
});

export type { LiveMapProps } from "./LiveMap";
export type { OwnerMapProps } from "./owner/OwnerMap";
export type { AuthorityMapProps } from "./authority/AuthorityMap";
export type { PickedLocation } from "./LocationPicker";

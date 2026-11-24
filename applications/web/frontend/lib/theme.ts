"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's theme choice. Light is the default; "system" follows the
 * operating system's dark-mode setting and updates when it changes.
 *
 * The choice is stored under `cp-theme`; the resolved theme ("light" or
 * "dark") is written to `data-theme` on <html>, which the CSS reads. The
 * pre-paint script in app/layout.tsx applies it before first paint.
 */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_KEY = "cp-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "system" || saved === "light") return saved;
  } catch {
    // storage blocked: fall back to the default
  }
  return "light";
}

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function apply(preference: ThemePreference) {
  // useDarkTheme observes this attribute
  document.documentElement.dataset.theme = resolve(preference);
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    // storage blocked: the choice lasts until the page is closed
  }
  apply(preference);
  listeners.forEach((notify) => notify());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readThemePreference() === "system") apply("system");
  };
  // a choice made in another tab
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    apply(readThemePreference());
    onChange();
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The saved theme choice; "light" during server rendering and hydration. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readThemePreference, () => "light");
}

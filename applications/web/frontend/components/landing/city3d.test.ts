import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTO_3D_SCRIPT, CITY_3D_URL, LANDING_PREF_KEY } from "./city3d.ts";

const FINE_POINTER = "(pointer: fine) and (hover: hover) and (min-width: 1024px)";

type Env = {
  pathname?: string;
  search?: string;
  stored?: string | null;
  storageBlocked?: boolean;
  userAgent?: string;
  webdriver?: boolean;
  mobileUA?: boolean;
  media?: string[]; // media queries that match
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } | null;
  webgl2?: boolean;
  renderer?: string;
};

/** A laptop on Wi-Fi in desktop Chrome: every condition passes. */
const CAPABLE: Env = {
  pathname: "/",
  search: "",
  stored: null,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
  media: [FINE_POINTER],
  deviceMemory: 8,
  hardwareConcurrency: 12,
  connection: { effectiveType: "4g", downlink: 10, rtt: 50, saveData: false },
  webgl2: true,
  renderer: "ANGLE (NVIDIA GeForce RTX 3060)",
};

/** Runs the head script against a mocked browser; returns what it did. */
function run(overrides: Env = {}) {
  const env = { ...CAPABLE, ...overrides };
  const out: { redirect: string | null; stored: Record<string, string>; url: string | null } = {
    redirect: null,
    stored: {},
    url: null,
  };
  const storage = {
    getItem: (k: string) => {
      if (env.storageBlocked) throw new Error("blocked");
      return k === LANDING_PREF_KEY ? (env.stored ?? null) : null;
    },
    setItem: (k: string, v: string) => {
      out.stored[k] = v;
    },
  };
  const navigator: Record<string, unknown> = {
    userAgent: env.userAgent,
    webdriver: env.webdriver ?? false,
    userAgentData: { mobile: env.mobileUA ?? false },
    hardwareConcurrency: env.hardwareConcurrency,
    connection: env.connection ?? undefined,
  };
  if (env.deviceMemory !== undefined) navigator.deviceMemory = env.deviceMemory;
  const gl = {
    getExtension: (name: string) =>
      name === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: 1 } : name === "WEBGL_lose_context" ? { loseContext() {} } : null,
    getParameter: () => env.renderer,
  };
  const document = { createElement: () => ({ getContext: () => (env.webgl2 ? gl : null) }) };
  const location = {
    pathname: env.pathname,
    search: env.search,
    hash: "",
    replace: (u: string) => {
      out.redirect = u;
    },
  };
  const history = {
    replaceState: (_s: unknown, _t: string, u: string) => {
      out.url = u;
    },
  };
  const matchMedia = (q: string) => ({ matches: (env.media ?? []).includes(q) });
  new Function("navigator", "matchMedia", "location", "localStorage", "history", "document", AUTO_3D_SCRIPT)(
    navigator,
    matchMedia,
    location,
    storage,
    history,
    document,
  );
  return out;
}

describe("auto-open 3D landing page", () => {
  it("opens the 3D city on a capable laptop on a fast link (desktop Chrome hides the link type)", () => {
    assert.equal(run().redirect, CITY_3D_URL);
  });

  it("opens it on Wi-Fi or Ethernet when the browser reports the link type", () => {
    assert.equal(run({ connection: { type: "wifi", effectiveType: "4g", downlink: 3, rtt: 200 } }).redirect, CITY_3D_URL);
    assert.equal(run({ connection: { type: "ethernet" } }).redirect, CITY_3D_URL);
  });

  it("stays classic on mobile data, slow links and data saver", () => {
    assert.equal(run({ connection: { type: "cellular", effectiveType: "4g", downlink: 10, rtt: 50 } }).redirect, null);
    assert.equal(run({ connection: { effectiveType: "3g", downlink: 1.5, rtt: 300 } }).redirect, null);
    assert.equal(run({ connection: { effectiveType: "4g", downlink: 2, rtt: 50 } }).redirect, null);
    assert.equal(run({ connection: { effectiveType: "4g", downlink: 10, rtt: 50, saveData: true } }).redirect, null);
  });

  it("stays classic when the device can't be confirmed as high-end (Safari and Firefox hide memory)", () => {
    assert.equal(run({ deviceMemory: undefined }).redirect, null);
    assert.equal(run({ connection: null }).redirect, null);
    assert.equal(run({ deviceMemory: 4 }).redirect, null);
    assert.equal(run({ hardwareConcurrency: 4 }).redirect, null);
  });

  it("stays classic on phones and tablets", () => {
    assert.equal(run({ media: [] }).redirect, null);
    assert.equal(run({ mobileUA: true }).redirect, null);
  });

  it("stays classic when the browser restricts motion, data or WebGL", () => {
    assert.equal(run({ media: [FINE_POINTER, "(prefers-reduced-motion: reduce)"] }).redirect, null);
    assert.equal(run({ media: [FINE_POINTER, "(prefers-reduced-data: reduce)"] }).redirect, null);
    assert.equal(run({ webgl2: false }).redirect, null);
    assert.equal(run({ renderer: "Google SwiftShader" }).redirect, null);
    assert.equal(run({ storageBlocked: true }).redirect, null);
  });

  it("never redirects bots or automated browsers", () => {
    assert.equal(run({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" }).redirect, null);
    assert.equal(run({ webdriver: true }).redirect, null);
  });

  it("remembers the classic choice and tidies the URL", () => {
    const fromClassicLink = run({ search: "?view=classic" });
    assert.equal(fromClassicLink.redirect, null);
    assert.equal(fromClassicLink.stored[LANDING_PREF_KEY], "classic");
    assert.equal(fromClassicLink.url, "/");
    assert.equal(run({ stored: "classic" }).redirect, null);
  });

  it("only acts on the landing page", () => {
    assert.equal(run({ pathname: "/login" }).redirect, null);
  });
});

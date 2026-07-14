"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NetworkAwareLoader } from "@/components/loading/NetworkAwareLoader";
import {
  useNetworkStatus,
  type NetworkStatus,
} from "@/components/loading/useNetworkStatus";

const STATES: NetworkStatus[] = ["FAST", "MEDIUM", "SLOW", "OFFLINE"];

export default function LoaderDemoPage() {
  const [simulated, setSimulated] = useState<NetworkStatus>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const { status: real } = useNetworkStatus();

  return (
    <div className="dash-shell">
      <nav className="top-nav">
        <Logo />
        <div className="top-nav-links">
          <span className="hide-sm">
            Detected network: <b>{real}</b>
          </span>
          <ThemeToggle />
        </div>
      </nav>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          padding: "10px 18px",
        }}
      >
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            className={s === simulated ? "btn btn-gradient btn-cta-sm" : "btn btn-outline btn-cta-sm"}
            onClick={() => setSimulated(s)}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-outline btn-cta-sm"
          onClick={() => setLoading((v) => !v)}
        >
          {loading ? "Finish loading" : "Start loading"}
        </button>
      </div>

      <main className="dash-main" style={{ alignItems: "stretch" }}>
        <div style={{ width: "100%" }}>
          <NetworkAwareLoader
            isLoading={loading}
            forceStatus={simulated}
            onRetry={() => setSimulated("FAST")}
          >
            <div className="auth-card" style={{ margin: "40px auto", textAlign: "center" }}>
              <h1 className="auth-title">Content loaded!</h1>
              <p className="auth-sub">
                This is the wrapped page content, revealed with a smooth
                crossfade once loading finishes.
              </p>
            </div>
          </NetworkAwareLoader>
        </div>
      </main>
    </div>
  );
}

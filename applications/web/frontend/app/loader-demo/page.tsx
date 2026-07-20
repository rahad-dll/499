"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NetworkAwareLoader } from "@/components/loading/NetworkAwareLoader";
import {
  useNetworkStatus,
  type NetworkStatus,
} from "@/components/loading/useNetworkStatus";
import { Button } from "@/components/ui/button";

const STATES: NetworkStatus[] = ["FAST", "MEDIUM", "SLOW", "OFFLINE"];

export default function LoaderDemoPage() {
  const [simulated, setSimulated] = useState<NetworkStatus>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const { status: real } = useNetworkStatus();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="hidden sm:inline">
            Detected network: <b className="text-foreground">{real}</b>
          </span>
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex flex-wrap justify-center gap-2.5 px-4 py-2.5">
        {STATES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === simulated ? "brand" : "outline"}
            onClick={() => setSimulated(s)}
          >
            {s}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => setLoading((v) => !v)}>
          {loading ? "Finish loading" : "Start loading"}
        </Button>
      </div>

      <main className="flex flex-1 items-stretch">
        <div className="w-full">
          <NetworkAwareLoader
            isLoading={loading}
            forceStatus={simulated}
            onRetry={() => setSimulated("FAST")}
          >
            <div className="mx-auto my-10 w-full max-w-[440px] rounded-3xl border border-border bg-card p-9 text-center text-card-foreground">
              <h1 className="text-3xl font-extrabold tracking-tight">
                Content loaded!
              </h1>
              <p className="mt-1.5 text-[15px] text-muted-foreground">
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

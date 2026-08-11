import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

/** Split-screen auth layout: dark brand panel on the left (desktop only),
 *  centered content on the right with a floating theme toggle. */
export function AuthShell({
  brand,
  children,
}: {
  brand: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[minmax(0,1.25fr)_minmax(410px,1fr)] lg:overflow-hidden">
      {brand}
      <div className="min-w-0 bg-background lg:min-h-0 lg:overflow-y-auto">
        <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-5 sm:px-8 sm:py-8 lg:min-h-full lg:px-5 lg:py-5 xl:px-6 xl:py-6 2xl:px-8">
          <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
            <ThemeToggle />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

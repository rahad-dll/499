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
    <div className="grid min-h-screen lg:grid-cols-[1.25fr_1fr]">
      {brand}
      <div className="relative flex flex-col items-center justify-center bg-background px-4 py-20 sm:px-8">
        <div className="absolute right-5 top-6 z-10">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}

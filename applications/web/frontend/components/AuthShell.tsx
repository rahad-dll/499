import type { ReactNode } from "react";
import { Car, Cctv, ParkingCircle } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/** Auth page layout (login, forgot and reset password): the logo in the
 *  top-left corner, the theme toggle in the top-right, and the content
 *  centered on the page. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh" style={{ background: "var(--panel-bg)" }}>
      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4 py-4 text-[var(--panel-fg)] sm:px-7 sm:py-5 xl:px-10 xl:py-8">
        <Logo tagline taglineClassName="hidden sm:block" />
        <ThemeToggle />
      </header>
      {/* glow bubbles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block">
        <span className="absolute left-[19%] top-[24%] flex size-11 items-center justify-center rounded-full border-2 border-[#18d6c0] text-[#18d6c0] shadow-[0_0_24px_rgba(24,214,192,0.45),inset_0_0_18px_rgba(24,214,192,0.12)]">
          <ParkingCircle className="size-5" />
        </span>
        <span className="absolute right-[18%] top-[34%] flex size-12 items-center justify-center rounded-full border-2 border-[#8b6cff] text-[#8b6cff] shadow-[0_0_24px_rgba(139,108,255,0.45),inset_0_0_18px_rgba(139,108,255,0.12)]">
          <Cctv className="size-5" />
        </span>
        <span className="absolute bottom-[22%] left-[24%] flex size-11 items-center justify-center rounded-full border-2 border-[#4db6f5] text-[#4db6f5] shadow-[0_0_24px_rgba(77,182,245,0.45),inset_0_0_18px_rgba(77,182,245,0.12)]">
          <Car className="size-5" />
        </span>
      </div>
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 pb-8 pt-24 sm:px-8 [@media(max-height:700px)]:pt-20">
        {children}
      </main>
    </div>
  );
}

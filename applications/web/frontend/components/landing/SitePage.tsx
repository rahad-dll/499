import { jakarta } from "@/components/landing/font";
import { LandingNav } from "@/components/landing/LandingNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { cn } from "@/lib/utils";

/** Frame of every public page: skip link, top navigation, content, footer. */
export function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(jakarta.className, "min-h-screen overflow-x-clip bg-background text-foreground")}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

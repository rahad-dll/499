import Link from "next/link";
import { GithubIcon } from "@/components/brand-icons";
import { Logo } from "@/components/Logo";
import { DOWNLOAD_APP_HREF } from "@/components/landing/DownloadAppButton";
import { Explore3DLink } from "@/components/landing/Explore3DLink";
import { RESOURCES, REPO_URL } from "@/components/landing/data";
import { CONTAINER } from "@/components/landing/section";
import { cn } from "@/lib/utils";

/* "/#…" links scroll on the landing page and open it from every other page.
   Those and the app download (a route that redirects to the file) are plain
   links; the rest use client-side navigation. */
const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#platform", label: "Features" },
      { href: "/#portals", label: "Portals" },
      { href: "/#how", label: "How it works" },
      { href: "/#results", label: "AI results" },
      { href: "/#impact", label: "Impact" },
      { href: "/research", label: "Research & datasets" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: DOWNLOAD_APP_HREF, label: "Download the Android app" },
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
      { href: "/owner", label: "Owner portal" },
      { href: "/command-center", label: "Command center" },
    ],
  },
];

const LINK = "mt-3 block text-[14px] text-muted-foreground hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[color-mix(in_srgb,var(--secondary)_40%,var(--background))]">
      <div className={cn(CONTAINER, "grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]")}>
        <div>
          <Logo tagline={false} />
          <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-muted-foreground">
            Intelligent Parking &amp; Traffic Control Platform — connecting drivers, parking owners and authorities
            for smarter cities.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="CityPulse on GitHub"
            className="mt-5 inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon className="size-5" />
          </a>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="text-[14px] font-extrabold">{col.title}</div>
            {col.links.map((l) =>
              l.href.startsWith("/#") || l.href === DOWNLOAD_APP_HREF ? (
                <a key={l.href} href={l.href} className={LINK}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} className={LINK}>
                  {l.label}
                </Link>
              ),
            )}
            {col.title === "Product" && <Explore3DLink variant="link" className={LINK} />}
          </div>
        ))}
        <div>
          <div className="text-[14px] font-extrabold">Project</div>
          {RESOURCES.map((r) => (
            <a key={r.href} href={r.href} target="_blank" rel="noreferrer" className={LINK}>
              {r.label}
            </a>
          ))}
        </div>
      </div>
      <div
        className={cn(
          CONTAINER,
          "flex flex-col gap-2 border-t border-border py-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <span>© 2026 CityPulse · CSE499A/B Project Group 03</span>
        <span className="flex gap-5">
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
        </span>
      </div>
    </footer>
  );
}

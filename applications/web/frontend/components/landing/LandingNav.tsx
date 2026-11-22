"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Download, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Explore3DLink } from "@/components/landing/Explore3DLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#portals", label: "Portals" },
  { href: "#how", label: "How it works" },
  { href: "#results", label: "AI results" },
  { href: "#impact", label: "Impact" },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The section under the sticky nav, so its link can be highlighted. */
function useCurrentSection(): string | null {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      let found: string | null = null;
      for (const { href } of NAV_LINKS) {
        const el = document.querySelector(href);
        if (el && el.getBoundingClientRect().top <= 120) found = href;
      }
      // past the end of the last section: nothing is highlighted
      const last = document.querySelector(NAV_LINKS[NAV_LINKS.length - 1].href);
      if (last && last.getBoundingClientRect().bottom < 120) found = null;
      setCurrent(found);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return current;
}

/**
 * While the phone menu is open: the page behind it doesn't scroll, Tab and
 * Shift+Tab stay inside the nav bar and menu, and Escape closes the menu and
 * returns focus to its button. Widening the window to desktop closes it.
 */
function useMenuBehaviour(
  open: boolean,
  close: () => void,
  regionRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
  buttonRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
        return;
      }
      const region = regionRef.current;
      if (event.key !== "Tab" || !region) return;
      const items = [...region.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !region.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !region.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => {
      if (desktop.matches) close();
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
      body.style.overflow = previousOverflow;
    };
  }, [open, close, regionRef, panelRef, buttonRef]);
}

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = useCurrentSection();
  // section links scroll on the landing page and open it from other pages
  const onHome = usePathname() === "/";
  const sectionHref = (hash: string) => (onHome ? hash : `/${hash}`);

  const regionRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setMenuOpen(false), []);
  useMenuBehaviour(menuOpen, close, regionRef, panelRef, buttonRef);

  return (
    <>
      <div ref={regionRef} className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1240px] items-center gap-8 px-5 sm:px-6 lg:px-10">
          <Logo tagline={false} />
          <div className="mx-auto hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={sectionHref(l.href)}
                aria-current={current === l.href ? "location" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors hover:text-foreground",
                  current === l.href ? "bg-brand/10 text-foreground" : "text-muted-foreground",
                )}
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <Explore3DLink variant="nav" className="hidden lg:inline-flex" />
            <Explore3DLink variant="icon" className="lg:hidden" />
            <Link
              href="/login"
              className="hidden px-2 text-[14px] font-semibold text-foreground transition-colors hover:text-brand sm:inline"
            >
              Sign in
            </Link>
            <Button asChild variant="brand" size="sm" className="hidden sm:inline-flex">
              <Link href="/signup">
                Create account <ArrowRight className="size-4" />
              </Link>
            </Button>
            <ThemeToggle />
            <button
              ref={buttonRef}
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div
            ref={panelRef}
            id="landing-menu"
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-5 pb-5 lg:hidden"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={sectionHref(l.href)}
                onClick={close}
                className={cn(
                  "block border-b border-border py-3 font-semibold",
                  current === l.href && "text-brand",
                )}
              >
                {l.label}
              </a>
            ))}
            <Explore3DLink variant="menu" className="mt-4" onNavigate={close} />
            {/* /download/apk redirects to the newest APK; the phone downloads it */}
            <a
              href="/download/apk"
              onClick={close}
              className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 font-semibold"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand">
                <Download className="size-4" />
              </span>
              <span>
                Download the driver app
                <span className="block text-[12px] font-normal text-muted-foreground">Android APK · latest build</span>
              </span>
              <ArrowRight className="ml-auto size-4 text-brand" />
            </a>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button asChild variant="outline">
                <Link href="/login" onClick={close}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="brand">
                <Link href="/signup" onClick={close}>
                  Create account
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Dims the page behind the open menu; tapping it closes the menu. It sits
          outside the nav bar because the bar's backdrop blur would otherwise
          become the containing block of this fixed layer. */}
      {menuOpen && (
        <div aria-hidden onClick={close} className="fixed inset-0 z-30 bg-background/60 backdrop-blur-[2px] lg:hidden" />
      )}
    </>
  );
}

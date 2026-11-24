import Link from "next/link";
import { CONTAINER, Eyebrow } from "@/components/landing/section";
import { SitePage } from "@/components/landing/SitePage";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Plain-language policy page (terms, privacy): intro, contents list, numbered sections. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  /** e.g. "31 October 2026" */
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <SitePage>
      <article className={cn(CONTAINER, "py-16 lg:py-20")}>
        <div className="max-w-[760px]">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.12] tracking-[-0.02em]">{title}</h1>
          <p className="mt-3 text-[14px] text-muted-foreground">Last updated {updated}</p>
          <div className="mt-6 text-[16.5px] leading-relaxed text-muted-foreground">{intro}</div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[220px_minmax(0,760px)] lg:gap-16">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground">On this page</div>
            <ol className="mt-3 space-y-2 text-[14px]">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-muted-foreground hover:text-foreground">
                    {i + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-10">
            {sections.map((section, i) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-[20px] font-extrabold tracking-tight">
                  {i + 1}. {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15.5px] leading-relaxed text-muted-foreground [&_a]:font-semibold [&_a]:text-brand [&_a:hover]:underline [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {section.body}
                </div>
              </section>
            ))}
            <p className="border-t border-border pt-6 text-[14px] text-muted-foreground">
              See also:{" "}
              <Link href="/terms" className="font-semibold text-brand hover:underline">
                Terms of Service
              </Link>{" "}
              ·{" "}
              <Link href="/privacy" className="font-semibold text-brand hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </article>
    </SitePage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DATASETS, RESEARCH, RESOURCES } from "@/components/landing/data";
import { ReferenceList } from "@/components/landing/ReferenceList";
import { CONTAINER, SectionHeader } from "@/components/landing/section";
import { SitePage } from "@/components/landing/SitePage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Research & datasets — CityPulse",
  description:
    "The public datasets CityPulse's parking-occupancy and Bangla licence-plate models are trained on, the research they build on, and the project reports.",
};

const DOCUMENTS = RESOURCES.map((r) => ({ name: r.label, detail: "On GitHub", href: r.href }));

export default function ResearchPage() {
  return (
    <SitePage>
      <section className={cn(CONTAINER, "py-16 lg:py-20")}>
        <Link
          href="/#results"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to AI results
        </Link>
        <div className="mt-6">
          <SectionHeader
            as="h1"
            eyebrow="Research"
            title="The data and papers behind CityPulse"
            desc="Every model on the CityPulse landing page is trained on public data and builds on published work. These are the sources, so the results can be checked and reproduced."
          />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <ReferenceList title="Datasets we train on" items={DATASETS} />
          <ReferenceList title="Research we build on" items={RESEARCH} />
        </div>

        <div className="mt-8 lg:max-w-[calc(50%-1rem)]">
          <ReferenceList title="Project documents" items={DOCUMENTS} />
        </div>
      </section>
    </SitePage>
  );
}

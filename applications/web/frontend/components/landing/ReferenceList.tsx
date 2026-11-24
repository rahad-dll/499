import { ArrowUpRight } from "lucide-react";

/** Titled list of datasets, papers or documents, each with an optional link. */
export function ReferenceList({
  title,
  items,
}: {
  title: string;
  items: readonly { name: string; detail: string; href: string | null }[];
}) {
  return (
    <div>
      <h2 className="text-[13px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((item) => (
          <li key={item.name} className="flex items-start justify-between gap-4 px-5 py-3.5">
            <div>
              <div className="text-[14.5px] font-bold">{item.name}</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">{item.detail}</div>
            </div>
            {item.href && (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${item.name}`}
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-brand/50 hover:text-brand"
              >
                <ArrowUpRight className="size-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

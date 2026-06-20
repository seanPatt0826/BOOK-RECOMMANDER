import Link from "next/link";
import Card from "@/components/ui/Card";
import type { UapCase } from "@/lib/uap/types";

export default function CaseCard({ uapCase }: { uapCase: UapCase }) {
  return (
    <Card
      as={Link}
      href={`/uap/${encodeURIComponent(uapCase.slug)}`}
      className="group flex flex-col gap-2 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-ink transition group-hover:text-accent">
          {uapCase.name}
        </h3>
        <span className="flex-shrink-0 text-xs text-muted">
          {uapCase.dateLabel}
        </span>
      </div>
      <p className="text-xs text-accent">{uapCase.location}</p>
      <p className="text-sm leading-relaxed text-ink/80">{uapCase.summary}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {uapCase.tags.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
}

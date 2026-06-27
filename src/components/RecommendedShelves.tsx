import Carousel from "@/components/Carousel";
import SectionHeader from "@/components/ui/SectionHeader";
import type { RecommendedRow } from "@/lib/recommend";

/** Renders the "Recommended for you" genre rows, or nothing when there are none. */
export default function RecommendedShelves({
  rows,
}: {
  rows: RecommendedRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-16">
      <SectionHeader accent="accent" size="xl" className="mb-1">
        Recommended for you
      </SectionHeader>
      <p className="mb-6 text-sm text-muted">
        Picked from the genres you&rsquo;ve been saving.
      </p>

      <div className="flex flex-col gap-10">
        {rows.map((row) => (
          <div key={row.subject}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 className="text-lg font-semibold">{row.label}</h3>
              <span className="text-xs text-muted">{row.reason}</span>
            </div>
            <Carousel items={row.items} />
          </div>
        ))}
      </div>
    </section>
  );
}

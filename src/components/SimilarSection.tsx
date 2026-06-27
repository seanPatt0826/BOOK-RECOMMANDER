import { getSimilarTitles } from "@/lib/similar";
import Carousel from "@/components/Carousel";
import SectionHeader from "@/components/ui/SectionHeader";
import type { MediaDetail } from "@/lib/sources/types";

/**
 * Async server component: a "More like this" shelf for the title page. Streams
 * in its own <Suspense> so its Open Library lookups don't block the detail
 * render, and returns nothing when there's no reliable similarity signal.
 */
export default async function SimilarSection({
  detail,
}: {
  detail: MediaDetail;
}) {
  const shelf = await getSimilarTitles(detail);
  if (!shelf) return null;

  return (
    <section className="mt-12">
      <SectionHeader accent="violet" size="lg" className="mb-1">
        More like this
      </SectionHeader>
      <p className="mb-5 text-sm text-muted">{shelf.label}</p>
      <Carousel items={shelf.items} />
    </section>
  );
}

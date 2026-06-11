import { getGenreShelves } from "@/lib/home";
import Carousel from "@/components/Carousel";

// A stack of genre shelves ("Fantasy", "Romance", …), each a scrollable row.
// Rendered inside a <Suspense> on the home page so its fetches don't block the
// hero and main carousel from painting.
export default async function GenreShelves() {
  const shelves = await getGenreShelves();
  if (shelves.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-violet" />
        <h2 className="text-2xl font-semibold">Browse by genre</h2>
      </div>

      <div className="space-y-10">
        {shelves.map((shelf) => (
          <div key={shelf.subject}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-ink">{shelf.label}</h3>
              <span className="chip">{shelf.items.length} books</span>
            </div>
            <Carousel items={shelf.items} />
          </div>
        ))}
      </div>
    </section>
  );
}

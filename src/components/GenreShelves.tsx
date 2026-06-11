import { getGenreShelves } from "@/lib/home";
import GenreBrowser from "@/components/GenreBrowser";

// Fetches the genre shelves on the server, then hands them to the client-side
// GenreBrowser which renders the filter pills + shelves. Rendered inside a
// <Suspense> on the home page so its fetches don't block the hero.
export default async function GenreShelves() {
  const shelves = await getGenreShelves();
  if (shelves.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-violet" />
        <h2 className="text-2xl font-semibold">Browse by genre</h2>
      </div>

      <GenreBrowser shelves={shelves} />
    </section>
  );
}

import { getGenreShelves } from "@/lib/home";
import GenreBrowser from "@/components/GenreBrowser";
import type { SearchResult } from "@/lib/sources/types";

// Fetches the genre shelves on the server, then hands them to the client-side
// GenreBrowser which lays out the content + side nav. The Discover shelf is
// passed through so it sits in the main column alongside the genre shelves.
// Rendered inside a <Suspense> on the home page so its fetches don't block.
export default async function GenreShelves({
  discover,
}: {
  discover: SearchResult[];
}) {
  const shelves = await getGenreShelves();
  if (shelves.length === 0) return null;

  return (
    <section className="mt-14">
      <GenreBrowser shelves={shelves} discover={discover} />
    </section>
  );
}

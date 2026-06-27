import { fetchBookSubjects, tallyGenres } from "@/lib/recommend";
import { getBooksBySubject } from "@/lib/sources/googleBooks";
import { searchMovies } from "@/lib/sources/tmdb";
import type { MediaDetail, SearchResult } from "@/lib/sources/types";

/** A "More like this" shelf: a labeled row of related titles. */
export interface SimilarShelf {
  /** e.g. "More Science Fiction". */
  label: string;
  items: SearchResult[];
}

/**
 * Find titles similar to the one on the detail page.
 *
 * Books: infer the work's dominant genre from its Open Library subjects (the
 * same tally used by "Recommended for you") and pull that genre's shelf.
 * Movies: use the detail's genres when present — keyless movies carry none, so
 * this returns null there; the path activates if a TMDB key is ever configured.
 *
 * Returns null when there's no reliable signal (non-OL book id, no genre match,
 * or an empty shelf) so the caller can hide the section instead of showing junk.
 */
export async function getSimilarTitles(
  detail: MediaDetail,
  limit = 12,
): Promise<SimilarShelf | null> {
  const selfKey = `${detail.type}:${detail.id}`;
  const exclude = (items: SearchResult[]): SearchResult[] =>
    items.filter((item) => `${item.type}:${item.id}` !== selfKey).slice(0, limit);

  if (detail.type === "book") {
    const { subjects } = await fetchBookSubjects(detail.id, detail.title);
    const votes = tallyGenres([{ title: detail.title, subjects }]);
    if (votes.length === 0) return null;
    const top = votes[0];
    let items: SearchResult[] = [];
    try {
      items = await getBooksBySubject(top.subject);
    } catch {
      items = [];
    }
    const fresh = exclude(items);
    if (fresh.length === 0) return null;
    return { label: `More ${top.label}`, items: fresh };
  }

  // Movie: only when the detail exposes genres (i.e. a TMDB-keyed lookup).
  const genre = detail.creators[0];
  if (!genre) return null;
  let items: SearchResult[] = [];
  try {
    items = await searchMovies(genre);
  } catch {
    items = [];
  }
  const fresh = exclude(items);
  if (fresh.length === 0) return null;
  return { label: `More ${genre}`, items: fresh };
}

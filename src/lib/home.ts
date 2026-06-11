import { getFeaturedItems } from "@/lib/featured";
import { getPopularBooks, getBooksBySubject } from "@/lib/sources/googleBooks";
import { getPopularMovies } from "@/lib/sources/tmdb";
import { interleave } from "@/lib/interleave";
import type { SearchResult } from "@/lib/sources/types";

function dedupe(items: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Featured first, then interleaved popular books+movies, deduped, capped. */
export function combineCarousel(
  featured: SearchResult[],
  books: SearchResult[],
  movies: SearchResult[],
  limit = 20,
): SearchResult[] {
  const popular = interleave(books, movies);
  return dedupe([...featured, ...popular]).slice(0, limit);
}

// Genre shelves shown on the home page. `subject` uses Open Library's
// underscore form (also valid for Google Books).
export const BOOK_GENRES: { label: string; subject: string }[] = [
  { label: "Fantasy", subject: "fantasy" },
  { label: "Mystery & Thriller", subject: "thriller" },
  { label: "Science Fiction", subject: "science_fiction" },
  { label: "Romance", subject: "romance" },
  { label: "Horror", subject: "horror" },
  { label: "History", subject: "history" },
  { label: "Young Adult", subject: "young_adult_fiction" },
  { label: "Biography", subject: "biography" },
  { label: "Comics & Graphic Novels", subject: "comics_and_graphic_novels" },
  { label: "Poetry", subject: "poetry" },
  { label: "Adventure", subject: "adventure" },
  { label: "Classics", subject: "classics" },
  { label: "Cooking", subject: "cooking" },
  { label: "Self-Help", subject: "self-help" },
];

export interface GenreShelf {
  label: string;
  subject: string;
  items: SearchResult[];
}

// Prefer titles that have a cover so the shelves look full; dedupe, cap.
function tidyShelf(items: SearchResult[], limit = 12): SearchResult[] {
  const deduped = dedupe(items);
  const withCover = deduped.filter((i) => i.coverUrl);
  const withoutCover = deduped.filter((i) => !i.coverUrl);
  return [...withCover, ...withoutCover].slice(0, limit);
}

/** Fetch each genre's books in parallel. A failing genre is dropped, not fatal. */
export async function getGenreShelves(): Promise<GenreShelf[]> {
  const results = await Promise.allSettled(
    BOOK_GENRES.map((g) => getBooksBySubject(g.subject)),
  );
  return BOOK_GENRES.map((g, i) => {
    const r = results[i];
    const items = r.status === "fulfilled" ? tidyShelf(r.value) : [];
    return { ...g, items };
  }).filter((shelf) => shelf.items.length > 0);
}

/** Assemble carousel content. Resilient: a failing source contributes []. */
export async function getCarouselItems(limit = 20): Promise<SearchResult[]> {
  const [featured, books, movies] = await Promise.allSettled([
    getFeaturedItems(),
    getPopularBooks(),
    getPopularMovies(),
  ]);
  return combineCarousel(
    featured.status === "fulfilled" ? featured.value : [],
    books.status === "fulfilled" ? books.value : [],
    movies.status === "fulfilled" ? movies.value : [],
    limit,
  );
}

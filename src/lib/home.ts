import { getFeaturedItems } from "@/lib/featured";
import { getPopularBooks } from "@/lib/sources/googleBooks";
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

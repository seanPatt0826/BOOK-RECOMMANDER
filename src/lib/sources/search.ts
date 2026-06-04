import { searchBooks } from "./googleBooks";
import { searchMovies } from "./tmdb";
import type { SearchResult } from "./types";

function settledOrEmpty(
  result: PromiseSettledResult<SearchResult[]>,
): SearchResult[] {
  return result.status === "fulfilled" ? result.value : [];
}

/** Interleave two lists: a0, b0, a1, b1, … keeping leftovers in order. */
function interleave(a: SearchResult[], b: SearchResult[]): SearchResult[] {
  const out: SearchResult[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/** Query both sources in parallel. Never throws; a failing source yields []. */
export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const [books, movies] = await Promise.allSettled([
    searchBooks(query),
    searchMovies(query),
  ]);
  return interleave(settledOrEmpty(books), settledOrEmpty(movies));
}

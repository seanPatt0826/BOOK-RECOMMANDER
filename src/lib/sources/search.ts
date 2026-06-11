import { searchBooks } from "./googleBooks";
import { searchMovies } from "./tmdb";
import { interleave } from "@/lib/interleave";
import { rankByRelevance } from "./relevance";
import type { SearchResult } from "./types";

function settledOrEmpty(
  result: PromiseSettledResult<SearchResult[]>,
): SearchResult[] {
  return result.status === "fulfilled" ? result.value : [];
}

/** Query both sources in parallel. Never throws; a failing source yields []. */
export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const [books, movies] = await Promise.allSettled([
    searchBooks(query),
    searchMovies(query),
  ]);
  // Filter each source to titles that actually match the query, best first,
  // then interleave so books and movies both surface near the top.
  const rankedBooks = rankByRelevance(query, settledOrEmpty(books));
  const rankedMovies = rankByRelevance(query, settledOrEmpty(movies));
  return interleave(rankedBooks, rankedMovies);
}

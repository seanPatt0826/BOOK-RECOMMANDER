import { searchBooks } from "./googleBooks";
import { searchMovies } from "./tmdb";
import { interleave } from "@/lib/interleave";
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
  return interleave(settledOrEmpty(books), settledOrEmpty(movies));
}

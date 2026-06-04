import { getSuggestions } from "@/lib/history";
import { getRecommendationSeeds } from "@/lib/ai/recommend";
import type { RecommendationSeed } from "@/lib/ai/recommend";
import { searchBooks } from "@/lib/sources/googleBooks";
import { searchMovies } from "@/lib/sources/tmdb";
import type { SearchResult, MediaType } from "@/lib/sources/types";

export interface Recommendation {
  title: string;
  type: MediaType;
  reason: string;
  /** Enriched first match (cover + real id), or null if lookup failed. */
  item: SearchResult | null;
}

/**
 * Personalized recommendations for the signed-in user's home page.
 * Returns [] when there's no history or the AI is unavailable.
 */
export async function getHomeRecommendations(): Promise<Recommendation[]> {
  const queries = await getSuggestions(8);
  if (queries.length === 0) return [];

  let seeds: RecommendationSeed[];
  try {
    seeds = await getRecommendationSeeds(queries);
  } catch {
    return []; // key missing or API error — degrade silently
  }

  return Promise.all(
    seeds.map(async (seed) => {
      let item: SearchResult | null = null;
      try {
        const results =
          seed.type === "book"
            ? await searchBooks(seed.title)
            : await searchMovies(seed.title);
        item = results[0] ?? null;
      } catch {
        item = null;
      }
      return { title: seed.title, type: seed.type, reason: seed.reason, item };
    }),
  );
}

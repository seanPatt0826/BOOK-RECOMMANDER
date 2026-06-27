import { getRecommendations } from "@/lib/recommend";
import RecommendedShelves from "@/components/RecommendedShelves";
import type { SearchResult } from "@/lib/sources/types";

/**
 * Async server component: turns the user's saved list into recommendation rows.
 * Rendered inside a <Suspense> on the home page so its handful of Open Library
 * lookups stream in without blocking the rest of the page.
 */
export default async function RecommendedSection({
  saved,
}: {
  saved: SearchResult[];
}) {
  const rows = await getRecommendations(saved);
  return <RecommendedShelves rows={rows} />;
}

export type MediaType = "book" | "movie";

/** A single item as shown in search results. */
export interface SearchResult {
  id: string;
  type: MediaType;
  title: string;
  /** Absolute https URL, or null if the source has no image. */
  coverUrl: string | null;
  /** 4-digit year as a string, or null if unknown. */
  year: string | null;
  /** Normalized to a 0–5 scale, or null if unrated. */
  rating: number | null;
}

/** A fully detailed item shown on the title page. */
export interface MediaDetail extends SearchResult {
  description: string | null;
  /** Book authors or movie genres — short descriptive chips. */
  creators: string[];
}

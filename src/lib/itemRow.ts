import type { SearchResult, MediaType } from "@/lib/sources/types";

/** The common columns that saved_items and featured_items share. */
export interface ItemRow {
  item_id: string;
  item_type: MediaType;
  title: string;
  cover_url: string | null;
}

/** Map a DB item row to the shared SearchResult shape (year/rating unknown). */
export function itemRowToResult(row: ItemRow): SearchResult {
  return {
    id: row.item_id,
    type: row.item_type,
    title: row.title,
    coverUrl: row.cover_url,
    year: null,
    rating: null,
  };
}

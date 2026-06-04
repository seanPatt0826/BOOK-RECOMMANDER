import { createClient } from "@/lib/supabase/server";
import { itemRowToResult, type ItemRow } from "@/lib/itemRow";
import type { SearchResult } from "@/lib/sources/types";

/** Owner-curated featured picks, ordered by sort_order. */
export async function getFeaturedItems(): Promise<SearchResult[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("featured_items")
    .select("item_id, item_type, title, cover_url")
    .order("sort_order", { ascending: true });
  return (data ?? []).map((row) => itemRowToResult(row as ItemRow));
}

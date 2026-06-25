import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { itemRowToResult, type ItemRow } from "@/lib/itemRow";
import type { SearchResult, MediaType } from "@/lib/sources/types";

/** The signed-in user's saved list, newest first. [] when logged out. */
export async function getSavedItems(): Promise<SearchResult[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_items")
    .select("item_id, item_type, title, cover_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => itemRowToResult(row as ItemRow));
}

/** Whether the signed-in user has saved this item. false when logged out. */
export async function isSaved(
  itemId: string,
  itemType: MediaType,
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .maybeSingle();
  return data !== null;
}

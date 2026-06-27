import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { itemRowToResult, type ItemRow } from "@/lib/itemRow";
import type { MediaType } from "@/lib/sources/types";
import {
  type ReadingStatus,
  type SavedItem,
  isReadingStatus,
  DEFAULT_READING_STATUS,
} from "@/lib/readingStatus";

type SavedRow = ItemRow & { status?: string | null };

/** The signed-in user's saved list, newest first. [] when logged out. */
export async function getSavedItems(): Promise<SavedItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();

  // Prefer selecting the reading status. If the column isn't there yet (the
  // 0002 migration hasn't been applied), the query errors — fall back to the
  // base columns so the shelf keeps working; everything lands in "Want to read".
  const withStatus = await supabase
    .from("saved_items")
    .select("item_id, item_type, title, cover_url, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let rows: SavedRow[];
  if (withStatus.error) {
    const base = await supabase
      .from("saved_items")
      .select("item_id, item_type, title, cover_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    rows = (base.data ?? []) as SavedRow[];
  } else {
    rows = (withStatus.data ?? []) as SavedRow[];
  }

  return rows.map((row) => ({
    ...itemRowToResult(row),
    status: isReadingStatus(row.status) ? row.status : DEFAULT_READING_STATUS,
  }));
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

/**
 * The reading status of a saved item. Returns DEFAULT_READING_STATUS when the
 * item is saved but has no (or an unreadable) status — e.g. before the 0002
 * migration — and null when it isn't saved. Callers needing strict saved-ness
 * should use isSaved(); this is for seeding the status control.
 */
export async function getSavedStatus(
  itemId: string,
  itemType: MediaType,
): Promise<ReadingStatus | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_items")
    .select("status")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .maybeSingle();
  if (error || !data) return null;
  const status = (data as { status?: string | null }).status;
  return isReadingStatus(status) ? status : DEFAULT_READING_STATUS;
}

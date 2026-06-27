"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SearchResult, MediaType } from "@/lib/sources/types";
import { type ReadingStatus, isReadingStatus } from "@/lib/readingStatus";

/** Save (or upsert) an item to the signed-in user's list. No-op when logged out. */
export async function saveItem(item: SearchResult): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("saved_items").upsert(
    {
      user_id: user.id,
      item_id: item.id,
      item_type: item.type,
      title: item.title,
      cover_url: item.coverUrl,
    },
    { onConflict: "user_id,item_id,item_type" },
  );
  if (error) console.error("saveItem failed:", error.message);
  revalidatePath("/");
}

/** Remove an item from the signed-in user's list. No-op when logged out. */
export async function removeItem(id: string, type: MediaType): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", id)
    .eq("item_type", type);
  if (error) console.error("removeItem failed:", error.message);
  revalidatePath("/");
}

/**
 * Move a saved item to a different reading shelf. No-op when logged out, for an
 * unknown status, or when the item isn't saved (zero rows updated).
 */
export async function setReadingStatus(
  id: string,
  type: MediaType,
  status: ReadingStatus,
): Promise<void> {
  if (!isReadingStatus(status)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("saved_items")
    .update({ status })
    .eq("user_id", user.id)
    .eq("item_id", id)
    .eq("item_type", type);
  if (error) console.error("setReadingStatus failed:", error.message);
  revalidatePath("/");
}

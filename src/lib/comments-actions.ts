"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MediaType } from "@/lib/sources/types";

/** Post a comment on a title. No-op when logged out or body is blank. */
export async function createTitleComment(
  itemId: string,
  itemType: MediaType,
  body: string,
): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("title_comments").insert({
    user_id: user.id,
    item_id: itemId,
    item_type: itemType,
    body: text.slice(0, 4000),
  });
  revalidatePath(`/title/${itemType}/${itemId}`);
}

/** Delete one of the user's own title comments. No-op otherwise. */
export async function deleteTitleComment(
  id: string,
  itemId: string,
  itemType: MediaType,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("title_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath(`/title/${itemType}/${itemId}`);
}

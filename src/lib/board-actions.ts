"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Create a board post or reply (parentId null = top-level). No-op when logged out. */
export async function createBoardPost(
  parentId: string | null,
  body: string,
): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("board_posts").insert({
    user_id: user.id,
    parent_id: parentId,
    body: text.slice(0, 4000),
  });
  revalidatePath("/community");
}

/** Delete one of the user's own posts (its replies cascade via the FK). */
export async function deleteBoardPost(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("board_posts").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/community");
}

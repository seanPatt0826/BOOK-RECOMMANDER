import { createClient } from "@/lib/supabase/server";
import {
  buildAuthorMap,
  toCommentViews,
  type CommentRow,
  type ProfileRow,
  type CommentView,
} from "@/lib/comments-core";
import type { MediaType } from "@/lib/sources/types";

/** All comments for one title, oldest first, with author names. */
export async function getTitleComments(
  itemId: string,
  itemType: MediaType,
): Promise<CommentView[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("title_comments")
    .select("id, user_id, body, created_at")
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .order("created_at", { ascending: true });
  const list = (rows ?? []) as CommentRow[];
  if (list.length === 0) return [];
  const ids = [...new Set(list.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  return toCommentViews(list, buildAuthorMap((profiles ?? []) as ProfileRow[]));
}

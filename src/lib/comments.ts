import { createClient } from "@/lib/supabase/server";
import {
  fetchAuthorMap,
  toCommentViews,
  type CommentRow,
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
  const authors = await fetchAuthorMap(supabase as never, list);
  return toCommentViews(list, authors);
}

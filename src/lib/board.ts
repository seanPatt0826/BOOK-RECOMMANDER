import { createClient } from "@/lib/supabase/server";
import {
  fetchAuthorMap,
  buildThread,
  type BoardRow,
  type BoardThreadItem,
} from "@/lib/comments-core";

/** The full board as top-level posts (oldest first) each with their replies. */
export async function getBoardThread(): Promise<BoardThreadItem[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("board_posts")
    .select("id, user_id, body, created_at, parent_id")
    .order("created_at", { ascending: true });
  const list = (rows ?? []) as BoardRow[];
  if (list.length === 0) return [];
  const authors = await fetchAuthorMap(supabase as never, list);
  return buildThread(list, authors);
}

import { createClient } from "@/lib/supabase/server";
import {
  buildAuthorMap,
  buildThread,
  type BoardRow,
  type ProfileRow,
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
  const ids = [...new Set(list.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  return buildThread(list, buildAuthorMap((profiles ?? []) as ProfileRow[]));
}

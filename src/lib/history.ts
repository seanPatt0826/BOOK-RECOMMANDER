import { createClient } from "@/lib/supabase/server";
import type { MediaType } from "@/lib/sources/types";

export interface HistoryRow {
  query: string;
}

/** Case-insensitive de-dupe, newest-first order preserved, capped at `limit`. */
export function buildSuggestions(rows: HistoryRow[], limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const key = row.query.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row.query);
    if (out.length >= limit) break;
  }
  return out;
}

/** Record a search for the signed-in user. No-op when logged out. */
export async function recordSearch(
  query: string,
  clicked?: { id: string; type: MediaType },
): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("search_history").insert({
    user_id: user.id,
    query: trimmed,
    clicked_item_id: clicked?.id ?? null,
    clicked_item_type: clicked?.type ?? null,
  });
}

/** Recent-search suggestions for the signed-in user. [] when logged out. */
export async function getSuggestions(limit = 6): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("search_history")
    .select("query")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);
  return buildSuggestions((data ?? []) as HistoryRow[], limit);
}

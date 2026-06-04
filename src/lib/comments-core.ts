export interface ProfileRow {
  id: string;
  display_name: string | null;
}

export interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface BoardRow extends CommentRow {
  parent_id: string | null;
}

export interface CommentView {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export interface BoardThreadItem extends CommentView {
  replies: CommentView[];
}

/** Map user id → display name, falling back to "Reader" for blank/null. */
export function buildAuthorMap(profiles: ProfileRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of profiles) {
    map.set(p.id, p.display_name?.trim() || "Reader");
  }
  return map;
}

function viewOf(row: CommentRow, authors: Map<string, string>): CommentView {
  return {
    id: row.id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    authorName: authors.get(row.user_id) ?? "Reader",
  };
}

export function toCommentViews(
  rows: CommentRow[],
  authors: Map<string, string>,
): CommentView[] {
  return rows.map((row) => viewOf(row, authors));
}

/** Group board rows into top-level posts each with their replies (one level). */
export function buildThread(
  rows: BoardRow[],
  authors: Map<string, string>,
): BoardThreadItem[] {
  const repliesByParent = new Map<string, CommentView[]>();
  for (const row of rows) {
    if (row.parent_id) {
      const list = repliesByParent.get(row.parent_id) ?? [];
      list.push(viewOf(row, authors));
      repliesByParent.set(row.parent_id, list);
    }
  }
  const tops: BoardThreadItem[] = [];
  for (const row of rows) {
    if (!row.parent_id) {
      tops.push({ ...viewOf(row, authors), replies: repliesByParent.get(row.id) ?? [] });
    }
  }
  return tops;
}

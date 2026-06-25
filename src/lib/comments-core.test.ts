import { describe, it, expect } from "vitest";
import {
  buildAuthorMap,
  toCommentViews,
  buildThread,
  fetchAuthorMap,
  type CommentRow,
  type BoardRow,
  type ProfileRow,
} from "./comments-core";

const profiles: ProfileRow[] = [
  { id: "u1", display_name: "Ada" },
  { id: "u2", display_name: "  " },
  { id: "u3", display_name: null },
];

describe("buildAuthorMap", () => {
  it("maps ids to names, falling back to Reader for blank/null", () => {
    const m = buildAuthorMap(profiles);
    expect(m.get("u1")).toBe("Ada");
    expect(m.get("u2")).toBe("Reader");
    expect(m.get("u3")).toBe("Reader");
  });
});

describe("toCommentViews", () => {
  it("attaches author names and falls back when the author is unknown", () => {
    const rows: CommentRow[] = [
      { id: "c1", user_id: "u1", body: "hi", created_at: "2026-01-01" },
      { id: "c2", user_id: "ghost", body: "boo", created_at: "2026-01-02" },
    ];
    const views = toCommentViews(rows, buildAuthorMap(profiles));
    expect(views[0]).toEqual({
      id: "c1",
      userId: "u1",
      body: "hi",
      createdAt: "2026-01-01",
      authorName: "Ada",
    });
    expect(views[1].authorName).toBe("Reader");
  });
});

describe("buildThread", () => {
  it("groups replies under their top-level parent, preserving order", () => {
    const rows: BoardRow[] = [
      { id: "p1", user_id: "u1", body: "post 1", created_at: "1", parent_id: null },
      { id: "r1", user_id: "u2", body: "reply 1", created_at: "2", parent_id: "p1" },
      { id: "p2", user_id: "u3", body: "post 2", created_at: "3", parent_id: null },
      { id: "r2", user_id: "u1", body: "reply 2", created_at: "4", parent_id: "p1" },
    ];
    const thread = buildThread(rows, buildAuthorMap(profiles));
    expect(thread.map((t) => t.id)).toEqual(["p1", "p2"]);
    expect(thread[0].replies.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(thread[0].authorName).toBe("Ada");
    expect(thread[1].replies).toEqual([]);
  });
});

describe("fetchAuthorMap", () => {
  it("queries profiles for distinct user ids and maps id → name", async () => {
    const calls: string[][] = [];
    const supabase = {
      from: () => ({
        select: () => ({
          in: async (_col: string, ids: string[]) => {
            calls.push(ids);
            return { data: [{ id: "a", display_name: "Ada" }, { id: "b", display_name: null }] };
          },
        }),
      }),
    };
    const rows = [{ user_id: "a" }, { user_id: "a" }, { user_id: "b" }];
    const map = await fetchAuthorMap(supabase as never, rows);
    expect(calls).toEqual([["a", "b"]]);        // distinct ids
    expect(map.get("a")).toBe("Ada");
    expect(map.get("b")).toBe("Reader");         // null → fallback
  });
});

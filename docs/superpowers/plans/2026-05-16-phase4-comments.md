# Phase 4: Comments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public global discussion board at `/community` (post + one level of replies) and per-title comment threads on the detail page — both readable by everyone, writable/deletable by the signed-in author.

**Architecture:** One pure `comments-core` module turns DB rows + profile rows into author-attributed view objects (`toCommentViews`, `buildThread`) — shared by both features and unit-tested. Reads are plain server functions (two queries: rows, then profiles for the distinct author ids, joined in JS — avoids fragile PostgREST relationship guessing). Writes are Next.js server actions that `revalidatePath`. The UI reuses two small client components — `CommentForm` and `DeleteCommentButton` — each receiving a bound server action as a prop (the idiomatic Next pattern), so the board and title comments share the same form/delete code.

**Tech Stack:** Next.js 16 (App Router, server actions, `revalidatePath`, server-action `.bind`), React 19 (`useTransition`), TypeScript, Tailwind v4, Supabase, Vitest.

This plan is Phase 4 of 6. It builds on branch `phase1-setup-auth` (Phases 1–3 complete). Spec: `docs/superpowers/specs/2026-05-16-book-movie-recommendation-website-design.md`. The `board_posts` and `title_comments` tables (with RLS: readable by all, insert/delete own only) already exist from the Phase 1 migration.

---

## Scope & Decisions

- **Board threading = one level.** Top-level posts each with a flat list of replies (`parent_id`). No nested-reply trees.
- **Author names via a second query.** `board_posts`/`title_comments` reference `auth.users`, and `profiles.id = auth.users.id`, but there's no direct FK PostgREST can embed — so we fetch the rows, then fetch `profiles` for the distinct `user_id`s, and join in JS (`buildAuthorMap`). Missing/blank names fall back to "Reader".
- **DRY UI.** A single `CommentForm` (textarea + submit) and `DeleteCommentButton` are reused by both features; the parent server component binds the right server action via `.bind(null, …)`.
- **Anonymous users read but can't write.** Logged-out users see all comments plus a "Sign in to join" link instead of a form; delete only shows on the author's own items.
- **Ordering:** comments and board posts are oldest-first (natural thread reading order).
- **Body cap:** trimmed and sliced to 4000 chars (matches the DB `char_length … between 1 and 4000` check).

---

## File Structure

Created:
- `src/lib/comments-core.ts` — pure types + `buildAuthorMap`, `toCommentViews`, `buildThread`
- `src/lib/comments.ts` — `getTitleComments(itemId, itemType)`
- `src/lib/comments-actions.ts` — `"use server"`: `createTitleComment`, `deleteTitleComment`
- `src/lib/board.ts` — `getBoardThread()`
- `src/lib/board-actions.ts` — `"use server"`: `createBoardPost`, `deleteBoardPost`
- `src/components/CommentForm.tsx` — client form (reused)
- `src/components/DeleteCommentButton.tsx` — client delete button (reused)
- `src/components/CommentsSection.tsx` — per-title comments block (server)

Modified:
- `src/app/title/[type]/[id]/page.tsx` — replace the placeholder comments section with `<CommentsSection>`
- `src/app/community/page.tsx` — replace the placeholder with the real board

Test: `src/lib/comments-core.test.ts`.

---

## Task 1: Pure comments core (author join + threading)

**Files:**
- Create: `src/lib/comments-core.ts`
- Test: `src/lib/comments-core.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/comments-core.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import {
  buildAuthorMap,
  toCommentViews,
  buildThread,
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- comments-core`
Expected: FAIL — cannot find module `./comments-core`.

- [ ] **Step 3: Implement `src/lib/comments-core.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- comments-core`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/comments-core.ts src/lib/comments-core.test.ts
git commit -m "feat: add pure comments core (author join and threading)"
```

---

## Task 2: Title-comments data + actions

**Files:**
- Create: `src/lib/comments.ts`, `src/lib/comments-actions.ts`

- [ ] **Step 1: Create `src/lib/comments.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/lib/comments-actions.ts`**

```typescript
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
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean. (`comments-actions.ts` exports only async functions — valid `"use server"`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/comments.ts src/lib/comments-actions.ts
git commit -m "feat: add title-comments data layer and actions"
```

---

## Task 3: Shared CommentForm + DeleteCommentButton

**Files:**
- Create: `src/components/CommentForm.tsx`, `src/components/DeleteCommentButton.tsx`

- [ ] **Step 1: Create `src/components/CommentForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";

export default function CommentForm({
  action,
  placeholder = "Write a comment…",
  submitLabel = "Post",
}: {
  action: (body: string) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      await action(text);
      setBody("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={4000}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending || body.trim().length === 0}
        className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Posting…" : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/components/DeleteCommentButton.tsx`**

```tsx
"use client";

import { useTransition } from "react";

export default function DeleteCommentButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(async () => { await action(); })}
      disabled={pending}
      className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean. (Both are client components; they're not imported anywhere yet — that happens in Tasks 4 and 6.)

- [ ] **Step 4: Commit**

```bash
git add src/components/CommentForm.tsx src/components/DeleteCommentButton.tsx
git commit -m "feat: add reusable comment form and delete button"
```

---

## Task 4: Per-title comments section + detail page wiring

**Files:**
- Create: `src/components/CommentsSection.tsx`
- Modify: `src/app/title/[type]/[id]/page.tsx`

- [ ] **Step 1: Create `src/components/CommentsSection.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTitleComments } from "@/lib/comments";
import {
  createTitleComment,
  deleteTitleComment,
} from "@/lib/comments-actions";
import CommentForm from "@/components/CommentForm";
import DeleteCommentButton from "@/components/DeleteCommentButton";
import type { MediaType } from "@/lib/sources/types";

export default async function CommentsSection({
  itemId,
  itemType,
}: {
  itemId: string;
  itemType: MediaType;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const comments = await getTitleComments(itemId, itemType);

  return (
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold">Comments</h2>

      {user ? (
        <CommentForm action={createTitleComment.bind(null, itemId, itemType)} />
      ) : (
        <p className="mt-2 text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {comments.length === 0 && (
          <li className="text-sm text-gray-500">
            No comments yet. Be the first!
          </li>
        )}
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded border border-gray-100 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{c.authorName}</span>
              {user?.id === c.userId && (
                <DeleteCommentButton
                  action={deleteTitleComment.bind(null, c.id, itemId, itemType)}
                />
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {c.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into `src/app/title/[type]/[id]/page.tsx`**

Add this import alongside the existing imports at the top:

```tsx
import CommentsSection from "@/components/CommentsSection";
```

Then replace the existing placeholder comments `<section>` (the block that currently reads `<h2>Comments</h2>` with the "Comments arrive in Phase 4." paragraph) with:

```tsx
      <CommentsSection itemId={detail.id} itemType={detail.type} />
```

Leave everything else in the file (the cover, title, metadata, SaveButton/sign-in block) unchanged.

- [ ] **Step 3: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean. The old "Comments arrive in Phase 4." text is gone.

- [ ] **Step 4: Commit**

```bash
git add src/components/CommentsSection.tsx "src/app/title/[type]/[id]/page.tsx"
git commit -m "feat: add per-title comments to the detail page"
```

---

## Task 5: Board data + actions

**Files:**
- Create: `src/lib/board.ts`, `src/lib/board-actions.ts`

- [ ] **Step 1: Create `src/lib/board.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/lib/board-actions.ts`**

```typescript
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
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/board.ts src/lib/board-actions.ts
git commit -m "feat: add discussion board data layer and actions"
```

---

## Task 6: Community board page

**Files:**
- Modify: `src/app/community/page.tsx` (replace the Phase 1 placeholder)

- [ ] **Step 1: Replace `src/app/community/page.tsx`** entirely with:

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBoardThread } from "@/lib/board";
import { createBoardPost, deleteBoardPost } from "@/lib/board-actions";
import CommentForm from "@/components/CommentForm";
import DeleteCommentButton from "@/components/DeleteCommentButton";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const thread = await getBoardThread();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">Community board</h1>
      <p className="mt-1 text-gray-600">
        Share what you&rsquo;re reading and watching.
      </p>

      {user ? (
        <CommentForm
          action={createBoardPost.bind(null, null)}
          placeholder="Start a new post…"
          submitLabel="Post"
        />
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>{" "}
          to post.
        </p>
      )}

      <ul className="mt-8 space-y-6">
        {thread.length === 0 && (
          <li className="text-sm text-gray-500">
            No posts yet. Start the conversation!
          </li>
        )}
        {thread.map((post) => (
          <li
            key={post.id}
            className="rounded border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{post.authorName}</span>
              {user?.id === post.userId && (
                <DeleteCommentButton
                  action={deleteBoardPost.bind(null, post.id)}
                />
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {post.body}
            </p>

            {post.replies.length > 0 && (
              <ul className="mt-3 space-y-2 border-l-2 border-gray-100 pl-4">
                {post.replies.map((reply) => (
                  <li key={reply.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {reply.authorName}
                      </span>
                      {user?.id === reply.userId && (
                        <DeleteCommentButton
                          action={deleteBoardPost.bind(null, reply.id)}
                        />
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                      {reply.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {user && (
              <div className="mt-2">
                <CommentForm
                  action={createBoardPost.bind(null, post.id)}
                  placeholder="Reply…"
                  submitLabel="Reply"
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Verify build, lint, full tests**

Run: `npm run build` then `npm run lint` then `npm test`
Expected: Build succeeds (`/community` is dynamic — it reads the user); lint clean; ALL tests pass.

- [ ] **Step 3: Manual smoke test (needs `.env.local` Supabase keys)**

Run: `npm run dev`. Signed in: at `/community`, post a message → it appears; reply to it → the reply nests under it; delete your post → it (and its replies) disappear. On a title detail page, add a comment → it appears under "Comments"; delete it → gone. Logged out: both pages show the comments/posts read-only with a "Sign in" link.

- [ ] **Step 4: Commit**

```bash
git add src/app/community/page.tsx
git commit -m "feat: build community discussion board page"
```

---

## Phase 4 Done — Definition of Done

- `/community` shows a global board where signed-in users post and reply; each post/reply shows its author and a delete control for the owner.
- The title detail page shows a comment thread with a form for signed-in users.
- Posting, replying, commenting, and deleting update the page (via `revalidatePath`).
- Logged-out users can read everything but see a "Sign in" prompt instead of forms.
- `npm test` passes and `npm run build` succeeds.

This completes the comments feature. Phase 5 (AI recommendations + chat) is next.

---

## Self-Review Notes

- **Spec coverage (Phase 4 scope):** global discussion board ✓ (Tasks 5–6); per-title comments ✓ (Tasks 2, 4); signed-in post/reply/delete with author attribution ✓; logged-out read-only ✓.
- **DRY:** one `comments-core` (author map + view mapping + threading) shared by board and title comments; one `CommentForm` and one `DeleteCommentButton` reused by both, parameterized by a bound server action.
- **Placeholder scan:** none — every code step is complete.
- **Type consistency:** `CommentRow`/`BoardRow`/`ProfileRow`/`CommentView`/`BoardThreadItem` from `comments-core` used uniformly. Server actions: `createTitleComment(itemId, itemType, body)`, `deleteTitleComment(id, itemId, itemType)`, `createBoardPost(parentId, body)`, `deleteBoardPost(id)` — each `.bind(null, …)` leaves exactly the `(body)`/`()` signature `CommentForm`/`DeleteCommentButton` expect. Body cap (4000) matches the DB constraint; deletes filter on `user_id` to satisfy RLS; reply cascade relies on the Phase 1 `parent_id … on delete cascade`.

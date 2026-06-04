# Phase 3: Home Page, Saved List & Featured — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the home page — a left-to-right sliding carousel of books/movies (curated featured picks + popular API titles) on the left, and the signed-in user's personal saved list on the right — and make the title-detail "Save to my list" button real.

**Architecture:** A shared `itemRowToResult` maps both `saved_items` and `featured_items` DB rows into the Phase 2 `SearchResult` shape, so the existing `ResultCard` renders everything. Saved reads are plain server functions; saved writes are Next.js server actions (callable from a client `SaveButton`) that `revalidatePath("/")`. Carousel content is assembled by a pure `combineCarousel` (featured first, then interleaved popular books+movies, deduped) fed by resilient `Promise.allSettled` fetches. Pure logic (mappers, dedupe, interleave, combine) is unit-tested; Supabase and external HTTP are not.

**Tech Stack:** Next.js 16 (App Router, server actions, `revalidatePath`), React 19 (`useTransition`), TypeScript, Tailwind v4, Supabase (`@supabase/ssr`), Vitest. APIs: Google Books, TMDB.

This plan is Phase 3 of 6. It builds on branch `phase1-setup-auth` (Phases 1–2 complete). Spec: `docs/superpowers/specs/2026-05-16-book-movie-recommendation-website-design.md`.

---

## Scope & Decisions

- **Reuse, don't duplicate.** Saved-list and carousel cards reuse the Phase 2 `SearchResult` type and `ResultCard` component. A new shared `itemRowToResult` (in `src/lib/itemRow.ts`) maps DB rows for both `saved_items` and `featured_items` (identical columns) — no duplicated mappers. The generic list-interleave used by Phase 2 search is extracted to `src/lib/interleave.ts` and reused here.
- **Saved year/rating are unknown.** `saved_items`/`featured_items` store only id, type, title, cover — so cards from them have `year: null, rating: null` (ResultCard already handles nulls).
- **Carousel content = featured ∪ popular.** `featured_items` (owner-curated, likely empty at first since there's no admin UI yet) come first; the carousel is then filled with **popular** titles — TMDB `/movie/popular` + a Google Books fiction query — so it's never empty on a fresh deploy. Books need no key; movies need `TMDB_API_KEY` (carousel still renders books + featured without it, via `allSettled`).
- **Saving requires sign-in.** The detail page shows a real toggle `SaveButton` when logged in, or a "Sign in to save" link when not. Removing a saved item happens on the detail page (toggle); the home saved-list cards are display-only links (keeps `ResultCard` composable, no new card variant).
- **Comments still deferred to Phase 4.**

---

## File Structure

Created:
- `src/lib/itemRow.ts` — `ItemRow` type + `itemRowToResult` (shared DB-row → SearchResult mapper)
- `src/lib/interleave.ts` — generic `interleave<T>(a, b)` (extracted from Phase 2 search)
- `src/lib/saved.ts` — `getSavedItems`, `isSaved`
- `src/lib/saved-actions.ts` — `"use server"`: `saveItem`, `removeItem`
- `src/lib/featured.ts` — `getFeaturedItems`
- `src/lib/home.ts` — `combineCarousel` (pure) + `getCarouselItems`
- `src/components/SaveButton.tsx` — client toggle button (calls server actions)
- `src/components/Carousel.tsx` — client horizontal slider rendering `ResultCard`s

Modified:
- `src/lib/sources/googleBooks.ts` — add `getPopularBooks`
- `src/lib/sources/tmdb.ts` — add `getPopularMovies`
- `src/lib/sources/search.ts` — use the shared `interleave` (no behavior change)
- `src/app/title/[type]/[id]/page.tsx` — replace the placeholder Save button with the real one
- `src/app/page.tsx` — replace the placeholder home with carousel + saved list

Tests: `src/lib/itemRow.test.ts`, `src/lib/interleave.test.ts`, `src/lib/home.test.ts`, plus added cases in `googleBooks.test.ts` and `tmdb.test.ts`.

---

## Task 1: Shared row mapper + saved-items data layer

**Files:**
- Create: `src/lib/itemRow.ts`, `src/lib/saved.ts`
- Test: `src/lib/itemRow.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/itemRow.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { itemRowToResult } from "./itemRow";

describe("itemRowToResult", () => {
  it("maps a DB item row to a SearchResult with null year/rating", () => {
    expect(
      itemRowToResult({
        item_id: "603",
        item_type: "movie",
        title: "The Matrix",
        cover_url: "https://image.tmdb.org/t/p/w342/poster.jpg",
      }),
    ).toEqual({
      id: "603",
      type: "movie",
      title: "The Matrix",
      coverUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
      year: null,
      rating: null,
    });
  });

  it("passes through a null cover", () => {
    const r = itemRowToResult({
      item_id: "x",
      item_type: "book",
      title: "Bare",
      cover_url: null,
    });
    expect(r.coverUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- itemRow`
Expected: FAIL — cannot find module `./itemRow`.

- [ ] **Step 3: Implement `src/lib/itemRow.ts`**

```typescript
import type { SearchResult, MediaType } from "@/lib/sources/types";

/** The common columns that saved_items and featured_items share. */
export interface ItemRow {
  item_id: string;
  item_type: MediaType;
  title: string;
  cover_url: string | null;
}

/** Map a DB item row to the shared SearchResult shape (year/rating unknown). */
export function itemRowToResult(row: ItemRow): SearchResult {
  return {
    id: row.item_id,
    type: row.item_type,
    title: row.title,
    coverUrl: row.cover_url,
    year: null,
    rating: null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- itemRow`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Implement `src/lib/saved.ts`** (no unit test — needs a live Supabase client)

```typescript
import { createClient } from "@/lib/supabase/server";
import { itemRowToResult, type ItemRow } from "@/lib/itemRow";
import type { SearchResult, MediaType } from "@/lib/sources/types";

/** The signed-in user's saved list, newest first. [] when logged out. */
export async function getSavedItems(): Promise<SearchResult[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("saved_items")
    .select("item_id, item_type, title, cover_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => itemRowToResult(row as ItemRow));
}

/** Whether the signed-in user has saved this item. false when logged out. */
export async function isSaved(
  itemId: string,
  itemType: MediaType,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .maybeSingle();
  return data !== null;
}
```

- [ ] **Step 6: Verify build + full tests**

Run: `npm run build` then `npm test`
Expected: Build succeeds; all tests pass (Phase 1–2 tests + the 2 new mapper tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/itemRow.ts src/lib/itemRow.test.ts src/lib/saved.ts
git commit -m "feat: add shared item-row mapper and saved-items data layer"
```

---

## Task 2: Saved-items server actions

**Files:**
- Create: `src/lib/saved-actions.ts`

Server actions callable from the client `SaveButton`. They mutate `saved_items` for the current user and revalidate the home page so the saved list refreshes. No unit test (server actions + live DB).

- [ ] **Step 1: Create `src/lib/saved-actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SearchResult, MediaType } from "@/lib/sources/types";

/** Save (or upsert) an item to the signed-in user's list. No-op when logged out. */
export async function saveItem(item: SearchResult): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("saved_items").upsert(
    {
      user_id: user.id,
      item_id: item.id,
      item_type: item.type,
      title: item.title,
      cover_url: item.coverUrl,
    },
    { onConflict: "user_id,item_id,item_type" },
  );
  revalidatePath("/");
}

/** Remove an item from the signed-in user's list. No-op when logged out. */
export async function removeItem(id: string, type: MediaType): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", id)
    .eq("item_type", type);
  revalidatePath("/");
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds (server-action file compiles); lint clean. (`upsert` `onConflict` relies on the `unique (user_id, item_id, item_type)` constraint from the Phase 1 migration.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/saved-actions.ts
git commit -m "feat: add save/remove server actions for saved items"
```

---

## Task 3: SaveButton component + real button on the detail page

**Files:**
- Create: `src/components/SaveButton.tsx`
- Modify: `src/app/title/[type]/[id]/page.tsx`

- [ ] **Step 1: Create `src/components/SaveButton.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { saveItem, removeItem } from "@/lib/saved-actions";
import type { SearchResult } from "@/lib/sources/types";

export default function SaveButton({
  item,
  initialSaved,
}: {
  item: SearchResult;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (saved) {
        await removeItem(item.id, item.type);
        setSaved(false);
      } else {
        await saveItem(item);
        setSaved(true);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      className={`mt-6 rounded border px-3 py-1.5 text-sm transition ${
        saved
          ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"
          : "border-gray-300 text-gray-700 hover:bg-gray-50"
      } ${pending ? "opacity-60" : ""}`}
    >
      {saved ? "✓ Saved" : "Save to my list"}
    </button>
  );
}
```

- [ ] **Step 2: Replace `src/app/title/[type]/[id]/page.tsx`** entirely with the version below (adds user lookup + saved state, swaps the disabled placeholder for the real button or a sign-in link):

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook } from "@/lib/sources/googleBooks";
import { getMovie } from "@/lib/sources/tmdb";
import { createClient } from "@/lib/supabase/server";
import { isSaved } from "@/lib/saved";
import SaveButton from "@/components/SaveButton";
import type { MediaDetail, SearchResult } from "@/lib/sources/types";

export default async function TitlePage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "book" && type !== "movie") notFound();

  let detail: MediaDetail | null = null;
  let failed = false;
  try {
    detail = type === "book" ? await getBook(id) : await getMovie(id);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-gray-600">
          We couldn&rsquo;t load this title right now. Please try again later.
        </p>
      </main>
    );
  }

  if (!detail) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const saved = user ? await isSaved(detail.id, detail.type) : false;

  const item: SearchResult = {
    id: detail.id,
    type: detail.type,
    title: detail.title,
    coverUrl: detail.coverUrl,
    year: detail.year,
    rating: detail.rating,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="w-40 flex-shrink-0">
          <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded bg-gray-100">
            {detail.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.coverUrl}
                alt={`Cover of ${detail.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">No cover</span>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{detail.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            <span className="capitalize">{detail.type}</span>
            {detail.year ? ` · ${detail.year}` : ""}
            {detail.rating !== null ? ` · ★ ${detail.rating}` : ""}
          </p>

          {detail.creators.length > 0 && (
            <p className="mt-2 text-sm text-gray-700">
              {detail.creators.join(", ")}
            </p>
          )}

          {detail.description && (
            <p className="mt-4 text-sm leading-relaxed text-gray-800">
              {detail.description}
            </p>
          )}

          {user ? (
            <SaveButton item={item} initialSaved={saved} />
          ) : (
            <Link
              href="/login"
              className="mt-6 inline-block rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Sign in to save to your list
            </Link>
          )}
        </div>
      </div>

      <section className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold">Comments</h2>
        <p className="mt-1 text-sm text-gray-500">
          Comments arrive in Phase 4.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean (the `<img>` disable comment is retained).

- [ ] **Step 4: Commit**

```bash
git add src/components/SaveButton.tsx "src/app/title/[type]/[id]/page.tsx"
git commit -m "feat: add working save button to title detail page"
```

---

## Task 4: Featured-items data layer

**Files:**
- Create: `src/lib/featured.ts`

Reads the owner-curated `featured_items` table (readable by everyone per RLS). Reuses `itemRowToResult` (already tested in Task 1), so no new unit test is needed.

- [ ] **Step 1: Create `src/lib/featured.ts`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { itemRowToResult, type ItemRow } from "@/lib/itemRow";
import type { SearchResult } from "@/lib/sources/types";

/** Owner-curated featured picks, ordered by sort_order. */
export async function getFeaturedItems(): Promise<SearchResult[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("featured_items")
    .select("item_id, item_type, title, cover_url")
    .order("sort_order", { ascending: true });
  return (data ?? []).map((row) => itemRowToResult(row as ItemRow));
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/featured.ts
git commit -m "feat: add featured-items data layer"
```

---

## Task 5: Popular-title fetchers

**Files:**
- Modify: `src/lib/sources/googleBooks.ts` (add `getPopularBooks`)
- Modify: `src/lib/sources/tmdb.ts` (add `getPopularMovies`)
- Modify tests: `src/lib/sources/googleBooks.test.ts`, `src/lib/sources/tmdb.test.ts`

Both reuse the existing normalizers. Each gets one fetch-mocked happy-path test.

- [ ] **Step 1: Add the failing test for `getPopularBooks`** — append to `src/lib/sources/googleBooks.test.ts`

Add `getPopularBooks` to the existing import from `./googleBooks`, then append this block at the end of the file:

```typescript
describe("getPopularBooks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("queries the fiction subject and maps the items", async () => {
    const json = { items: [sampleVolume] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await getPopularBooks();
    expect(results[0].title).toBe("Dune");
    const url = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(url).toContain("subject:fiction");
  });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npm test -- googleBooks`
Expected: FAIL — `getPopularBooks` is not exported.

- [ ] **Step 3: Add `getPopularBooks` to `src/lib/sources/googleBooks.ts`** (append after `getBook`)

```typescript
export async function getPopularBooks(): Promise<SearchResult[]> {
  const url = `${BASE}?q=${encodeURIComponent("subject:fiction")}&orderBy=relevance&maxResults=12`;
  const data = (await fetchJson(url)) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(normalizeBookItem);
}
```

- [ ] **Step 4: Run it, verify it PASSES**

Run: `npm test -- googleBooks`
Expected: PASS — all googleBooks tests green (now 6).

- [ ] **Step 5: Add the failing test for `getPopularMovies`** — append to `src/lib/sources/tmdb.test.ts`

Add `getPopularMovies` to the existing import from `./tmdb`, then append:

```typescript
describe("getPopularMovies", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TMDB_API_KEY;
  });

  it("calls the popular endpoint with the key and maps results", async () => {
    const json = { results: [sampleMovie] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await getPopularMovies();
    expect(results[0].title).toBe("The Matrix");
    const url = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(url).toContain("/movie/popular");
    expect(url).toContain("api_key=test-key");
  });
});
```

- [ ] **Step 6: Run it, verify it FAILS**

Run: `npm test -- tmdb`
Expected: FAIL — `getPopularMovies` is not exported.

- [ ] **Step 7: Add `getPopularMovies` to `src/lib/sources/tmdb.ts`** (append after `getMovie`)

```typescript
export async function getPopularMovies(): Promise<SearchResult[]> {
  const key = requireEnv("TMDB_API_KEY");
  const url = `${BASE}/movie/popular?api_key=${key}`;
  const data = (await fetchJson(url)) as { results?: TmdbMovie[] };
  return (data.results ?? []).map(normalizeMovieItem);
}
```

- [ ] **Step 8: Run it, verify it PASSES**

Run: `npm test -- tmdb`
Expected: PASS — all tmdb tests green (now 7).

- [ ] **Step 9: Commit**

```bash
git add src/lib/sources/googleBooks.ts src/lib/sources/googleBooks.test.ts src/lib/sources/tmdb.ts src/lib/sources/tmdb.test.ts
git commit -m "feat: add popular books and movies fetchers"
```

---

## Task 6: Shared interleave + carousel combiner

**Files:**
- Create: `src/lib/interleave.ts`, `src/lib/home.ts`
- Modify: `src/lib/sources/search.ts` (use the shared interleave)
- Test: `src/lib/interleave.test.ts`, `src/lib/home.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/interleave.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { interleave } from "./interleave";

describe("interleave", () => {
  it("alternates two equal-length lists", () => {
    expect(interleave([1, 3], [2, 4])).toEqual([1, 2, 3, 4]);
  });
  it("appends leftovers from the longer list in order", () => {
    expect(interleave(["a"], ["b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });
  it("handles empty inputs", () => {
    expect(interleave([], [])).toEqual([]);
    expect(interleave([1], [])).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npm test -- interleave`
Expected: FAIL — cannot find module `./interleave`.

- [ ] **Step 3: Implement `src/lib/interleave.ts`**

```typescript
/** Interleave two lists: a0, b0, a1, b1, … keeping leftovers in order. */
export function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}
```

- [ ] **Step 4: Refactor `src/lib/sources/search.ts` to use the shared interleave**

Remove the local `interleave` function and import the shared one. The file becomes:

```typescript
import { searchBooks } from "./googleBooks";
import { searchMovies } from "./tmdb";
import { interleave } from "@/lib/interleave";
import type { SearchResult } from "./types";

function settledOrEmpty(
  result: PromiseSettledResult<SearchResult[]>,
): SearchResult[] {
  return result.status === "fulfilled" ? result.value : [];
}

/** Query both sources in parallel. Never throws; a failing source yields []. */
export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const [books, movies] = await Promise.allSettled([
    searchBooks(query),
    searchMovies(query),
  ]);
  return interleave(settledOrEmpty(books), settledOrEmpty(movies));
}
```

- [ ] **Step 5: Run interleave + search tests, verify both PASS**

Run: `npm test -- interleave search.test`
Expected: PASS — the new interleave tests AND the existing Phase 2 search tests still green (behavior unchanged).

- [ ] **Step 6: Write the failing test `src/lib/home.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { combineCarousel } from "./home";
import type { SearchResult } from "@/lib/sources/types";

const book = (n: number): SearchResult => ({
  id: `b${n}`, type: "book", title: `Book ${n}`, coverUrl: null, year: null, rating: null,
});
const movie = (n: number): SearchResult => ({
  id: `m${n}`, type: "movie", title: `Movie ${n}`, coverUrl: null, year: null, rating: null,
});

describe("combineCarousel", () => {
  it("puts featured first, then interleaved popular books/movies", () => {
    const out = combineCarousel([book(9)], [book(1), book(2)], [movie(1)]);
    expect(out.map((r) => r.id)).toEqual(["b9", "b1", "m1", "b2"]);
  });

  it("dedupes across featured and popular by type+id", () => {
    const out = combineCarousel([book(1)], [book(1), book(2)], []);
    expect(out.map((r) => r.id)).toEqual(["b1", "b2"]);
  });

  it("caps at the limit", () => {
    const books = [1, 2, 3, 4].map(book);
    const out = combineCarousel([], books, [], 2);
    expect(out).toHaveLength(2);
  });
});
```

- [ ] **Step 7: Run it, verify it FAILS**

Run: `npm test -- home`
Expected: FAIL — cannot find module `./home` / `combineCarousel` not exported.

- [ ] **Step 8: Implement `src/lib/home.ts`**

```typescript
import { getFeaturedItems } from "@/lib/featured";
import { getPopularBooks } from "@/lib/sources/googleBooks";
import { getPopularMovies } from "@/lib/sources/tmdb";
import { interleave } from "@/lib/interleave";
import type { SearchResult } from "@/lib/sources/types";

function dedupe(items: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Featured first, then interleaved popular books+movies, deduped, capped. */
export function combineCarousel(
  featured: SearchResult[],
  books: SearchResult[],
  movies: SearchResult[],
  limit = 20,
): SearchResult[] {
  const popular = interleave(books, movies);
  return dedupe([...featured, ...popular]).slice(0, limit);
}

/** Assemble carousel content. Resilient: a failing source contributes []. */
export async function getCarouselItems(limit = 20): Promise<SearchResult[]> {
  const [featured, books, movies] = await Promise.allSettled([
    getFeaturedItems(),
    getPopularBooks(),
    getPopularMovies(),
  ]);
  return combineCarousel(
    featured.status === "fulfilled" ? featured.value : [],
    books.status === "fulfilled" ? books.value : [],
    movies.status === "fulfilled" ? movies.value : [],
    limit,
  );
}
```

- [ ] **Step 9: Run it, verify it PASSES**

Run: `npm test -- home`
Expected: PASS — 3 combineCarousel tests green.

- [ ] **Step 10: Commit**

```bash
git add src/lib/interleave.ts src/lib/interleave.test.ts src/lib/home.ts src/lib/home.test.ts src/lib/sources/search.ts
git commit -m "feat: add shared interleave and carousel combiner"
```

---

## Task 7: Carousel component

**Files:**
- Create: `src/components/Carousel.tsx`

A client component: a horizontally scrolling track of `ResultCard`s with left/right arrow buttons that scroll it. Empty state shows a short message.

- [ ] **Step 1: Create `src/components/Carousel.tsx`**

```tsx
"use client";

import { useRef } from "react";
import ResultCard from "@/components/ResultCard";
import type { SearchResult } from "@/lib/sources/types";

export default function Carousel({ items }: { items: SearchResult[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    trackRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">Nothing to show here yet.</p>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-lg shadow hover:bg-white"
      >
        ‹
      </button>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-8 pb-2"
      >
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="w-36 flex-shrink-0">
            <ResultCard item={item} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-lg shadow hover:bg-white"
      >
        ›
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean. (`ResultCard` is a plain component with no server-only deps, so importing it into this client component is fine.)

- [ ] **Step 3: Commit**

```bash
git add src/components/Carousel.tsx
git commit -m "feat: add horizontal carousel component"
```

---

## Task 8: Home page assembly

**Files:**
- Modify: `src/app/page.tsx` (replace the Phase 1 placeholder)

The home page (server component) loads the carousel items and the user's saved list in parallel, then renders the carousel on the left and the saved list on the right.

- [ ] **Step 1: Replace `src/app/page.tsx`** entirely with:

```tsx
import { getCarouselItems } from "@/lib/home";
import { getSavedItems } from "@/lib/saved";
import Carousel from "@/components/Carousel";
import ResultCard from "@/components/ResultCard";

export default async function HomePage() {
  const [carousel, saved] = await Promise.all([
    getCarouselItems(),
    getSavedItems(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Welcome to ShelfMate</h1>
      <p className="mt-1 text-gray-600">
        Discover books and movies, and keep your own list.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Discover</h2>
          <Carousel items={carousel} />
        </section>

        <aside>
          <h2 className="mb-3 text-xl font-semibold">Your list</h2>
          {saved.length === 0 ? (
            <p className="text-sm text-gray-500">
              You haven&rsquo;t saved anything yet. Open a title and tap
              &ldquo;Save to my list&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {saved.map((item) => (
                <ResultCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build, lint, full tests**

Run: `npm run build` then `npm run lint` then `npm test`
Expected: Build succeeds (home `/` is dynamic — it reads the user); lint clean; ALL tests pass.

- [ ] **Step 3: Manual smoke test (needs `.env.local` with Supabase keys; `TMDB_API_KEY` optional)**

Run: `npm run dev`. Sign in, open a title from search, tap **Save to my list** → it flips to "✓ Saved". Go to the home page (`/`) → the carousel shows books (and movies if `TMDB_API_KEY` is set), and your saved title appears under "Your list". Tap the saved title → detail page → tap **✓ Saved** to remove → return home → it's gone. Logged out, the detail page shows "Sign in to save" instead of the button.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: build home page with carousel and saved list"
```

---

## Phase 3 Done — Definition of Done

- The home page shows a left-to-right sliding carousel of books/movies (featured picks + popular titles).
- The signed-in user's saved list appears on the right side of the home page.
- The title detail page has a working Save/Unsave toggle (or a sign-in prompt when logged out).
- Saving and removing update the home saved list (via `revalidatePath`).
- The carousel still renders if TMDB is unavailable (books + featured remain).
- `npm test` passes and `npm run build` succeeds.

Comments remain deferred to Phase 4.

---

## Self-Review Notes

- **Spec coverage (Phase 3 scope):** sliding carousel of featured + popular ✓ (Tasks 4–8); personal saved list on the home page ✓ (Tasks 1, 8); working "Save to my list" ✓ (Tasks 2–3); resilience when a source is down ✓ (`combineCarousel` via `allSettled`).
- **DRY:** one `itemRowToResult` for both saved & featured rows (Task 1, reused in 4); one generic `interleave` shared by search and carousel (Task 6 refactors Phase 2 search to use it). No duplicated mappers or merge logic.
- **Placeholder scan:** none — every code step is complete.
- **Type consistency:** `SearchResult`/`MediaType`/`ItemRow` used uniformly; `saveItem`/`removeItem`/`isSaved`/`getSavedItems`/`getFeaturedItems`/`getPopularBooks`/`getPopularMovies`/`combineCarousel`/`getCarouselItems`/`interleave` names match across tasks and tests. `SaveButton` receives a `SearchResult` and `initialSaved: boolean`, exactly what the detail page passes. The save action upsert relies on the Phase 1 unique constraint `(user_id, item_id, item_type)`.

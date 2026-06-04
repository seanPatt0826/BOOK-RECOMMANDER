# Phase 2: Search, History & Title Detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users search books (Google Books) and movies (TMDB) from a search bar on every page, see merged results, have each search recorded to their history (which powers a suggestions dropdown), and open a detail page for any title.

**Architecture:** Pure "source" modules normalize each external API's JSON into one shared `SearchResult`/`MediaDetail` shape; a `searchAll` combiner queries both sources in parallel and tolerates one failing. A thin `fetchJson` helper adds a timeout. Search history reads/writes go through a small server module guarded by Supabase auth. The UI is a client `SearchBar` (in the nav) plus server-component pages (`/search`, `/title/[type]/[id]`) that fetch server-side. Pure logic (normalizers, merge, suggestion-dedup) is unit-tested with fixtures; external HTTP and Supabase are mocked.

**Tech Stack:** Next.js 16 (App Router, async `params`/`searchParams`), React 19, TypeScript, Tailwind v4, Supabase (`@supabase/ssr`), Vitest. External APIs: Google Books (no key) and TMDB (v3 `api_key`).

This plan is Phase 2 of 6. It builds on the Phase 1 branch `phase1-setup-auth` (Next.js 16 + Supabase + auth + app shell). Spec: `docs/superpowers/specs/2026-05-16-book-movie-recommendation-website-design.md`.

---

## Scope & Decisions

- **Search bar = navigate, dropdown = history.** The `SearchBar` submits the query to `/search?q=...` (Enter or button); the `/search` page does the actual API search server-side. The focus dropdown shows the user's recent-search **history suggestions** (matching the spec's "focusing the search bar shows recent searches"). This avoids firing paid TMDB/Google calls on every keystroke.
- **Save button & comments are NOT in Phase 2.** The title detail page shows info only, with a disabled "Save to my list (Phase 3)" placeholder and a "Comments arrive in Phase 4" note. `saved_items` UI is Phase 3; comments are Phase 4.
- **Anonymous users can search.** History recording and suggestions simply no-op when logged out (RLS already enforces this; the code checks `getUser()` first).
- **Covers use plain `<img>`.** Book/movie cover images come from many hosts (`books.google.com`, `image.tmdb.org`, `*.googleusercontent.com`), so configuring `next/image` `remotePatterns` for all of them is brittle. We use `<img>` with a line-level eslint-disable and a placeholder box when no cover exists.
- **Rating is normalized to a 0–5 scale** for display consistency (Google Books `averageRating` is already 0–5; TMDB `vote_average` is 0–10 and is halved).

---

## File Structure

Created in this phase:

- `src/lib/sources/types.ts` — `MediaType`, `SearchResult`, `MediaDetail`
- `src/lib/sources/http.ts` — `fetchJson(url, init?, timeoutMs?)` with abort timeout
- `src/lib/sources/googleBooks.ts` — `searchBooks`, `getBook`, and exported pure normalizers
- `src/lib/sources/tmdb.ts` — `searchMovies`, `getMovie`, and exported pure normalizers + rating/year helpers
- `src/lib/sources/search.ts` — `searchAll(query)` parallel combiner (never throws)
- `src/lib/history.ts` — `recordSearch`, `getSuggestions`, and pure `buildSuggestions`
- `src/app/api/history/suggestions/route.ts` — GET endpoint returning the user's suggestions
- `src/components/SearchBar.tsx` — client search input + history dropdown
- `src/components/ResultCard.tsx` — one search-result card
- `src/app/title/[type]/[id]/page.tsx` — title detail page

Test files (co-located): `src/lib/sources/googleBooks.test.ts`, `tmdb.test.ts`, `search.test.ts`, `src/lib/history.test.ts`.

Modified: `src/components/NavBar.tsx` (insert `<SearchBar />`), `src/app/search/page.tsx` (replace placeholder).

Prerequisite: the user must put a real `TMDB_API_KEY` in `.env.local` (the variable already exists in `.env.example`). Get one free at https://www.themoviedb.org/settings/api (API Read — use the "API Key (v3 auth)" value).

---

## Task 1: Shared media types and the HTTP helper

**Files:**
- Create: `src/lib/sources/types.ts`, `src/lib/sources/http.ts`

- [ ] **Step 1: Create the shared types `src/lib/sources/types.ts`**

```typescript
export type MediaType = "book" | "movie";

/** A single item as shown in search results. */
export interface SearchResult {
  id: string;
  type: MediaType;
  title: string;
  /** Absolute https URL, or null if the source has no image. */
  coverUrl: string | null;
  /** 4-digit year as a string, or null if unknown. */
  year: string | null;
  /** Normalized to a 0–5 scale, or null if unrated. */
  rating: number | null;
}

/** A fully detailed item shown on the title page. */
export interface MediaDetail extends SearchResult {
  description: string | null;
  /** Book authors or movie genres — short descriptive chips. */
  creators: string[];
}
```

- [ ] **Step 2: Create the timeout-aware fetch helper `src/lib/sources/http.ts`**

```typescript
/**
 * Fetch JSON with an abort timeout. Throws on non-2xx or timeout so callers
 * can decide how to degrade. Returns the parsed body as `unknown` — callers
 * narrow it via their normalizers.
 */
export async function fetchJson(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}): ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 3: Verify the project still type-checks**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors. (These files are not imported yet; this just confirms they compile.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/sources/types.ts src/lib/sources/http.ts
git commit -m "feat: add shared media types and timeout fetch helper"
```

---

## Task 2: Google Books source (search + detail)

**Files:**
- Create: `src/lib/sources/googleBooks.ts`
- Test: `src/lib/sources/googleBooks.test.ts`

Google Books needs no API key. Search: `https://www.googleapis.com/books/v1/volumes?q=<query>&maxResults=10`. Detail: `https://www.googleapis.com/books/v1/volumes/<id>`. A volume looks like `{ id, volumeInfo: { title, authors?, publishedDate?, averageRating?, description?, imageLinks?: { thumbnail? } } }`.

- [ ] **Step 1: Write the failing test `src/lib/sources/googleBooks.test.ts`**

```typescript
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  normalizeBookItem,
  normalizeBookDetail,
  searchBooks,
} from "./googleBooks";

const sampleVolume = {
  id: "abc123",
  volumeInfo: {
    title: "Dune",
    authors: ["Frank Herbert"],
    publishedDate: "1965-08-01",
    averageRating: 4.5,
    description: "A desert planet epic.",
    imageLinks: { thumbnail: "http://books.google.com/books/content?id=abc123" },
  },
};

describe("normalizeBookItem", () => {
  it("maps a volume to a SearchResult with https cover and year", () => {
    expect(normalizeBookItem(sampleVolume)).toEqual({
      id: "abc123",
      type: "book",
      title: "Dune",
      coverUrl: "https://books.google.com/books/content?id=abc123",
      year: "1965",
      rating: 4.5,
    });
  });

  it("handles a volume missing optional fields", () => {
    const result = normalizeBookItem({ id: "x", volumeInfo: { title: "Bare" } });
    expect(result).toEqual({
      id: "x",
      type: "book",
      title: "Bare",
      coverUrl: null,
      year: null,
      rating: null,
    });
  });
});

describe("normalizeBookDetail", () => {
  it("includes description and authors as creators", () => {
    const detail = normalizeBookDetail(sampleVolume);
    expect(detail.description).toBe("A desert planet epic.");
    expect(detail.creators).toEqual(["Frank Herbert"]);
    expect(detail.title).toBe("Dune");
  });
});

describe("searchBooks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls the volumes endpoint and maps the items array", async () => {
    const json = { items: [sampleVolume] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await searchBooks("dune");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Dune");
    const calledUrl = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(calledUrl).toContain("googleapis.com/books/v1/volumes");
    expect(calledUrl).toContain("q=dune");
  });

  it("returns an empty array when the API returns no items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await searchBooks("zzz")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- googleBooks`
Expected: FAIL — cannot find module `./googleBooks` / exports undefined.

- [ ] **Step 3: Implement `src/lib/sources/googleBooks.ts`**

```typescript
import { fetchJson } from "./http";
import type { SearchResult, MediaDetail } from "./types";

const BASE = "https://www.googleapis.com/books/v1/volumes";

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    averageRating?: number;
    description?: string;
    imageLinks?: { thumbnail?: string };
  };
}

function coverFrom(info: GoogleVolume["volumeInfo"]): string | null {
  const raw = info?.imageLinks?.thumbnail;
  if (!raw) return null;
  return raw.replace(/^http:\/\//, "https://");
}

function yearFrom(date?: string): string | null {
  if (!date || date.length < 4) return null;
  return date.slice(0, 4);
}

export function normalizeBookItem(volume: GoogleVolume): SearchResult {
  const info = volume.volumeInfo ?? {};
  return {
    id: volume.id,
    type: "book",
    title: info.title ?? "Untitled",
    coverUrl: coverFrom(info),
    year: yearFrom(info.publishedDate),
    rating: typeof info.averageRating === "number" ? info.averageRating : null,
  };
}

export function normalizeBookDetail(volume: GoogleVolume): MediaDetail {
  const info = volume.volumeInfo ?? {};
  return {
    ...normalizeBookItem(volume),
    description: info.description ?? null,
    creators: info.authors ?? [],
  };
}

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const url = `${BASE}?q=${encodeURIComponent(query)}&maxResults=10`;
  const data = (await fetchJson(url)) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(normalizeBookItem);
}

export async function getBook(id: string): Promise<MediaDetail | null> {
  const data = (await fetchJson(`${BASE}/${encodeURIComponent(id)}`)) as
    | GoogleVolume
    | undefined;
  if (!data || !data.id) return null;
  return normalizeBookDetail(data);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- googleBooks`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/googleBooks.ts src/lib/sources/googleBooks.test.ts
git commit -m "feat: add Google Books search and detail source"
```

---

## Task 3: TMDB source (search + detail)

**Files:**
- Create: `src/lib/sources/tmdb.ts`
- Test: `src/lib/sources/tmdb.test.ts`

TMDB v3: search `https://api.themoviedb.org/3/search/movie?api_key=<key>&query=<query>`, detail `https://api.themoviedb.org/3/movie/<id>?api_key=<key>`. A search result: `{ id: number, title, release_date?, vote_average?, poster_path?: string|null, overview? }`. Detail adds `genres?: { name }[]`. Posters: `https://image.tmdb.org/t/p/w342<poster_path>`. Rating: `vote_average` (0–10) → halve to 0–5, rounded to 1 decimal.

- [ ] **Step 1: Write the failing test `src/lib/sources/tmdb.test.ts`**

```typescript
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  normalizeMovieItem,
  normalizeMovieDetail,
  ratingFromVoteAverage,
  searchMovies,
} from "./tmdb";

const sampleMovie = {
  id: 603,
  title: "The Matrix",
  release_date: "1999-03-31",
  vote_average: 8.2,
  poster_path: "/poster.jpg",
  overview: "A hacker learns the truth.",
};

describe("ratingFromVoteAverage", () => {
  it("halves a 0–10 vote to a 0–5 scale, 1 decimal", () => {
    expect(ratingFromVoteAverage(8.2)).toBe(4.1);
  });
  it("returns null for 0 or undefined (TMDB uses 0 for unrated)", () => {
    expect(ratingFromVoteAverage(0)).toBeNull();
    expect(ratingFromVoteAverage(undefined)).toBeNull();
  });
});

describe("normalizeMovieItem", () => {
  it("maps a movie to a SearchResult with poster URL and year", () => {
    expect(normalizeMovieItem(sampleMovie)).toEqual({
      id: "603",
      type: "movie",
      title: "The Matrix",
      coverUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
      year: "1999",
      rating: 4.1,
    });
  });

  it("handles a missing poster", () => {
    const r = normalizeMovieItem({ ...sampleMovie, poster_path: null });
    expect(r.coverUrl).toBeNull();
  });
});

describe("normalizeMovieDetail", () => {
  it("includes overview and genre names as creators", () => {
    const detail = normalizeMovieDetail({
      ...sampleMovie,
      genres: [{ name: "Action" }, { name: "Sci-Fi" }],
    });
    expect(detail.description).toBe("A hacker learns the truth.");
    expect(detail.creators).toEqual(["Action", "Sci-Fi"]);
  });
});

describe("searchMovies", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TMDB_API_KEY;
  });

  it("calls the search endpoint with the key and maps results", async () => {
    const json = { results: [sampleMovie] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await searchMovies("matrix");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("The Matrix");
    const url = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(url).toContain("api.themoviedb.org/3/search/movie");
    expect(url).toContain("api_key=test-key");
    expect(url).toContain("query=matrix");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tmdb`
Expected: FAIL — cannot find module `./tmdb`.

- [ ] **Step 3: Implement `src/lib/sources/tmdb.ts`**

```typescript
import { fetchJson } from "./http";
import { requireEnv } from "@/lib/env";
import type { SearchResult, MediaDetail } from "./types";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w342";

interface TmdbMovie {
  id: number;
  title?: string;
  release_date?: string;
  vote_average?: number;
  poster_path?: string | null;
  overview?: string;
  genres?: { name: string }[];
}

export function ratingFromVoteAverage(vote?: number): number | null {
  if (!vote || vote <= 0) return null;
  return Math.round((vote / 2) * 10) / 10;
}

function yearFrom(date?: string): string | null {
  if (!date || date.length < 4) return null;
  return date.slice(0, 4);
}

export function normalizeMovieItem(movie: TmdbMovie): SearchResult {
  return {
    id: String(movie.id),
    type: "movie",
    title: movie.title ?? "Untitled",
    coverUrl: movie.poster_path ? `${IMG}${movie.poster_path}` : null,
    year: yearFrom(movie.release_date),
    rating: ratingFromVoteAverage(movie.vote_average),
  };
}

export function normalizeMovieDetail(movie: TmdbMovie): MediaDetail {
  return {
    ...normalizeMovieItem(movie),
    description: movie.overview ?? null,
    creators: (movie.genres ?? []).map((g) => g.name),
  };
}

export async function searchMovies(query: string): Promise<SearchResult[]> {
  const key = requireEnv("TMDB_API_KEY");
  const url = `${BASE}/search/movie?api_key=${key}&query=${encodeURIComponent(query)}`;
  const data = (await fetchJson(url)) as { results?: TmdbMovie[] };
  return (data.results ?? []).map(normalizeMovieItem);
}

export async function getMovie(id: string): Promise<MediaDetail | null> {
  const key = requireEnv("TMDB_API_KEY");
  const url = `${BASE}/movie/${encodeURIComponent(id)}?api_key=${key}`;
  const data = (await fetchJson(url)) as TmdbMovie | undefined;
  if (!data || data.id === undefined) return null;
  return normalizeMovieDetail(data);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tmdb`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/tmdb.ts src/lib/sources/tmdb.test.ts
git commit -m "feat: add TMDB movie search and detail source"
```

---

## Task 4: Combined parallel search

**Files:**
- Create: `src/lib/sources/search.ts`
- Test: `src/lib/sources/search.test.ts`

`searchAll` runs both sources concurrently with `Promise.allSettled` so one failing source still returns the other's results. Results are interleaved (book, movie, book, movie, …) so neither type dominates the top of the list. It NEVER throws.

- [ ] **Step 1: Write the failing test `src/lib/sources/search.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchResult } from "./types";

vi.mock("./googleBooks", () => ({ searchBooks: vi.fn() }));
vi.mock("./tmdb", () => ({ searchMovies: vi.fn() }));

import { searchBooks } from "./googleBooks";
import { searchMovies } from "./tmdb";
import { searchAll } from "./search";

const book = (n: number): SearchResult => ({
  id: `b${n}`, type: "book", title: `Book ${n}`, coverUrl: null, year: null, rating: null,
});
const movie = (n: number): SearchResult => ({
  id: `m${n}`, type: "movie", title: `Movie ${n}`, coverUrl: null, year: null, rating: null,
});

describe("searchAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("interleaves books and movies", async () => {
    vi.mocked(searchBooks).mockResolvedValue([book(1), book(2)]);
    vi.mocked(searchMovies).mockResolvedValue([movie(1), movie(2)]);
    const results = await searchAll("x");
    expect(results.map((r) => r.id)).toEqual(["b1", "m1", "b2", "m2"]);
  });

  it("returns the other source's results when one source throws", async () => {
    vi.mocked(searchBooks).mockRejectedValue(new Error("books down"));
    vi.mocked(searchMovies).mockResolvedValue([movie(1)]);
    const results = await searchAll("x");
    expect(results.map((r) => r.id)).toEqual(["m1"]);
  });

  it("returns an empty array when both sources fail", async () => {
    vi.mocked(searchBooks).mockRejectedValue(new Error("a"));
    vi.mocked(searchMovies).mockRejectedValue(new Error("b"));
    expect(await searchAll("x")).toEqual([]);
  });

  it("returns an empty array for a blank query without calling sources", async () => {
    const results = await searchAll("   ");
    expect(results).toEqual([]);
    expect(searchBooks).not.toHaveBeenCalled();
    expect(searchMovies).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- search.test`
Expected: FAIL — cannot find module `./search`.

- [ ] **Step 3: Implement `src/lib/sources/search.ts`**

```typescript
import { searchBooks } from "./googleBooks";
import { searchMovies } from "./tmdb";
import type { SearchResult } from "./types";

function settledOrEmpty(
  result: PromiseSettledResult<SearchResult[]>,
): SearchResult[] {
  return result.status === "fulfilled" ? result.value : [];
}

/** Interleave two lists: a0, b0, a1, b1, … keeping leftovers in order. */
function interleave(a: SearchResult[], b: SearchResult[]): SearchResult[] {
  const out: SearchResult[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- search.test`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/search.ts src/lib/sources/search.test.ts
git commit -m "feat: add parallel search combiner with source resilience"
```

---

## Task 5: Search history (record + suggestions)

**Files:**
- Create: `src/lib/history.ts`
- Test: `src/lib/history.test.ts`

`buildSuggestions` is a pure function: given rows of `{ query }` newest-first, it lowercase-deduplicates while preserving order and returns up to `limit` items (default 6). `recordSearch` and `getSuggestions` use the Phase 1 Supabase server client and no-op for logged-out users.

- [ ] **Step 1: Write the failing test `src/lib/history.test.ts`** (pure function only)

```typescript
import { describe, it, expect } from "vitest";
import { buildSuggestions } from "./history";

describe("buildSuggestions", () => {
  it("dedupes case-insensitively, preserving newest-first order", () => {
    const rows = [
      { query: "Dune" },
      { query: "dune" },
      { query: "Matrix" },
      { query: "DUNE" },
    ];
    expect(buildSuggestions(rows)).toEqual(["Dune", "Matrix"]);
  });

  it("caps the list at the limit", () => {
    const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ query: `q${n}` }));
    expect(buildSuggestions(rows, 3)).toEqual(["q1", "q2", "q3"]);
  });

  it("returns an empty array for no rows", () => {
    expect(buildSuggestions([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- history`
Expected: FAIL — cannot find module `./history`.

- [ ] **Step 3: Implement `src/lib/history.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- history`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/history.ts src/lib/history.test.ts
git commit -m "feat: add search history recording and suggestions"
```

---

## Task 6: Suggestions API route

**Files:**
- Create: `src/app/api/history/suggestions/route.ts`

A GET endpoint the client `SearchBar` calls to populate its dropdown. Returns `{ suggestions: string[] }` (empty for logged-out users). Marked dynamic so it always reflects the current session.

- [ ] **Step 1: Create `src/app/api/history/suggestions/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getSuggestions } from "@/lib/history";

export const dynamic = "force-dynamic";

export async function GET() {
  const suggestions = await getSuggestions();
  return NextResponse.json({ suggestions });
}
```

- [ ] **Step 2: Verify the build picks up the route**

Run: `npm run build`
Expected: Build succeeds and the route list includes `/api/history/suggestions`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/history/suggestions/route.ts
git commit -m "feat: add history suggestions API route"
```

---

## Task 7: SearchBar component and nav wiring

**Files:**
- Create: `src/components/SearchBar.tsx`
- Modify: `src/components/NavBar.tsx`

A client component: an input + submit that navigates to `/search?q=...`; on focus it fetches `/api/history/suggestions` and shows a dropdown; clicking a suggestion navigates to it. The dropdown hides on blur (with a short delay so a click registers).

- [ ] **Step 1: Create `src/components/SearchBar.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function go(query: string) {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  async function loadSuggestions() {
    setOpen(true);
    try {
      const res = await fetch("/api/history/suggestions");
      if (!res.ok) return;
      const data = (await res.json()) as { suggestions: string[] };
      setSuggestions(data.suggestions ?? []);
    } catch {
      // Network hiccup — just show no suggestions.
      setSuggestions([]);
    }
  }

  return (
    <div className="relative w-full max-w-xs">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
      >
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={loadSuggestions}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search books & movies"
          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
          aria-label="Search books and movies"
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-gray-200 bg-white shadow">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setValue(s);
                  go(s);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire `<SearchBar />` into `src/components/NavBar.tsx`**

Add the import at the top, below the existing imports:

```tsx
import SearchBar from "@/components/SearchBar";
```

Then place the search bar between the nav links and the auth area. The current nav inner `<div>` has the brand link, three nav links, then a `<div className="ml-auto">` auth block. Insert the SearchBar just before that `ml-auto` div, wrapped so it sits in the middle:

```tsx
        <Link href="/chat" className="text-sm hover:underline">
          AI Chat
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <SearchBar />
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-gray-600 hover:underline"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-sm hover:underline">
              Sign in
            </Link>
          )}
        </div>
```

(That replaces the old `<div className="ml-auto">…</div>` block — note the className gains `flex items-center gap-4` and `<SearchBar />` is the first child. Leave the brand link and the three nav links above unchanged.)

- [ ] **Step 3: Verify build and lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean. The nav now renders a search box on every page.

- [ ] **Step 4: Commit**

```bash
git add src/components/SearchBar.tsx src/components/NavBar.tsx
git commit -m "feat: add search bar with history dropdown to nav"
```

---

## Task 8: Search results page

**Files:**
- Create: `src/components/ResultCard.tsx`
- Modify: `src/app/search/page.tsx` (replace the Phase 1 placeholder)

The page (a server component) reads `?q=`, records the search, runs `searchAll`, and renders a responsive grid of `ResultCard`s linking to the title page. On a source error it still renders whatever came back (searchAll never throws); on a totally empty result it shows a friendly "no results" message.

- [ ] **Step 1: Create `src/components/ResultCard.tsx`**

```tsx
import Link from "next/link";
import type { SearchResult } from "@/lib/sources/types";

export default function ResultCard({ item }: { item: SearchResult }) {
  return (
    <Link
      href={`/title/${item.type}/${encodeURIComponent(item.id)}`}
      className="block overflow-hidden rounded border border-gray-200 bg-white transition hover:shadow"
    >
      <div className="flex aspect-[2/3] items-center justify-center bg-gray-100">
        {item.coverUrl ? (
          // External covers come from many hosts (books.google.com,
          // image.tmdb.org, …) so we use a plain <img> rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={`Cover of ${item.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-2 text-center text-xs text-gray-400">
            No cover
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-sm font-medium" title={item.title}>
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          <span className="capitalize">{item.type}</span>
          {item.year ? ` · ${item.year}` : ""}
          {item.rating !== null ? ` · ★ ${item.rating}` : ""}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Replace `src/app/search/page.tsx`** entirely with:

```tsx
import { searchAll } from "@/lib/sources/search";
import { recordSearch } from "@/lib/history";
import ResultCard from "@/components/ResultCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="mt-2 text-gray-600">
          Type a book or movie title in the search bar above.
        </p>
      </main>
    );
  }

  await recordSearch(query);
  const results = await searchAll(query);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      {results.length === 0 ? (
        <p className="mt-3 text-gray-600">
          No results found. Try a different title.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((item) => (
            <ResultCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify build and lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds (the `/search` route is now dynamic); lint clean (the `<img>` rule is disabled inline in `ResultCard`).

- [ ] **Step 4: Manual smoke test (requires `TMDB_API_KEY` in `.env.local`)**

Run: `npm run dev`. Visit `http://localhost:3000/search?q=dune`. Expected: a grid of book and movie cards with covers. (If `TMDB_API_KEY` is missing, books still appear and movies are silently skipped — searchAll tolerates the TMDB failure. Confirm books render.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultCard.tsx src/app/search/page.tsx
git commit -m "feat: add search results page with result cards"
```

---

## Task 9: Title detail page

**Files:**
- Create: `src/app/title/[type]/[id]/page.tsx`

A server component that validates `type` is `book`/`movie`, fetches the detail from the matching source, and renders it. Unknown type or not-found → Next's `notFound()`. A source error → a friendly inline message rather than a crash. Save and comments are placeholders for later phases.

- [ ] **Step 1: Create `src/app/title/[type]/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getBook } from "@/lib/sources/googleBooks";
import { getMovie } from "@/lib/sources/tmdb";
import type { MediaDetail } from "@/lib/sources/types";

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

          <button
            type="button"
            disabled
            className="mt-6 cursor-not-allowed rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-400"
          >
            Save to my list (Phase 3)
          </button>
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

- [ ] **Step 2: Verify build and lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. From `/search?q=dune`, click a book card → the detail page shows the cover, title, year, authors, and description. Click a movie card (if `TMDB_API_KEY` is set) → movie detail renders. Visiting `/title/banana/x` → 404. Expected: all behave as described.

- [ ] **Step 4: Run the full test suite and build**

Run: `npm test` then `npm run build`
Expected: All unit tests pass (Phase 1 env tests + the new normalizer/merge/suggestion tests); build clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/title/[type]/[id]/page.tsx
git commit -m "feat: add title detail page"
```

---

## Phase 2 Done — Definition of Done

- A search bar appears on every page (in the nav).
- Searching returns merged book + movie results; one source being down doesn't break the page.
- Each search by a signed-in user is recorded in `search_history`.
- Focusing the search bar shows the signed-in user's recent-search suggestions; clicking one searches it.
- Clicking a result opens a working detail page for the book or movie.
- `npm test` passes and `npm run build` succeeds.

Save (`saved_items`) and comments are intentionally deferred to Phases 3 and 4.

---

## Self-Review Notes

- **Spec coverage (Phase 2 scope):** search bar on every page ✓ (Task 7); merged Google Books + TMDB results ✓ (Tasks 2–4, 8); parallel + resilient ✓ (Task 4); searches written to `search_history` ✓ (Task 5, 8); history dropdown with recent/most-frequent suggestions ✓ (Tasks 5–7); title detail page ✓ (Task 9). Error handling for a down API ✓ (searchAll `allSettled`, detail try/catch). External APIs + Supabase mocked in tests ✓.
- **Deferred (correct per phasing):** Save-to-list and comments are placeholders only.
- **Placeholders scan:** none — every code step contains complete code.
- **Type consistency:** `SearchResult`/`MediaDetail`/`MediaType` from `types.ts` are used uniformly; `searchBooks`/`searchMovies`/`searchAll`/`getBook`/`getMovie`/`recordSearch`/`getSuggestions`/`buildSuggestions` names are consistent across tasks and their tests. Detail page uses async `params` and search page uses async `searchParams` per Next.js 16.

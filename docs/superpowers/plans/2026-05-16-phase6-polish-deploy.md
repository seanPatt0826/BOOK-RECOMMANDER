# Phase 6: Polish & Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the loose ends from earlier phases, give the site an accessible, finished feel (footer, focus rings, branded 404 + loading states), and make it deployment-ready with a real README and a Vercel deployment guide.

**Architecture:** Small, surgical changes only — no new subsystems. Backend hardening closes the two known debts (open `/api/chat`, swallowed Supabase write errors). The polish layer is global (focus-visible CSS, a footer in the root layout) plus a couple of route conventions (`not-found.tsx`, `search/loading.tsx`). Docs make the project runnable and deployable by someone new. Actual deployment to Vercel is the user's manual step (their accounts/credentials), guided by the new `docs/DEPLOYMENT.md`.

**Tech Stack:** Next.js 16 (App Router conventions: `not-found.tsx`, `loading.tsx`), Tailwind v4, Supabase, TypeScript, Vitest.

This plan is Phase 6 of 6 (final). It builds on branch `phase1-setup-auth` (Phases 1–5 complete). Spec: `docs/superpowers/specs/2026-05-16-book-movie-recommendation-website-design.md`.

---

## Scope & Decisions

- **Harden, don't rebuild.** Two carried debts get fixed: (1) `/api/chat` is gated behind sign-in (401 when logged out) to prevent anonymous Claude cost abuse; (2) the six Supabase write calls in the action files that silently ignored `{ error }` now log it. No behavior change for the happy path.
- **Accessibility is global.** One `focus-visible` rule in `globals.css` covers every link/button/input/textarea — cheaper and more consistent than per-component classes. Also remove the dead dark-mode CSS block (the hardcoded light Tailwind classes on `<body>` already override it, so the app is light-only — the block is confusing cruft).
- **Polish is concrete.** A footer in the root layout, a branded `not-found.tsx` (the title page already calls `notFound()`), and a skeleton `search/loading.tsx` shown while the search API runs. No open-ended redesign.
- **Deployment is documented, not automated.** Vercel deploy needs the user's GitHub/Vercel accounts and prod-domain redirect URLs in Supabase + Google — all manual. Phase 6 ships a `README.md` and `docs/DEPLOYMENT.md` checklist; the user does the click-deploy (same pattern as the Supabase setup).

---

## File Structure

Created:
- `src/components/Footer.tsx`
- `src/app/not-found.tsx`
- `src/app/search/loading.tsx`
- `README.md` (replaces the create-next-app default)
- `docs/DEPLOYMENT.md`

Modified:
- `src/app/api/chat/route.ts` — auth gate
- `src/lib/saved-actions.ts`, `src/lib/comments-actions.ts`, `src/lib/board-actions.ts` — log write errors
- `src/app/globals.css` — focus-visible rule, remove dead dark-mode block
- `src/app/layout.tsx` — render the footer, make the body a flex column

No test files (all changes are UI/routing/docs/logging; the existing 46 tests must keep passing).

---

## Task 1: Backend hardening (chat auth gate + write-error logging)

**Files:**
- Modify: `src/app/api/chat/route.ts`, `src/lib/saved-actions.ts`, `src/lib/comments-actions.ts`, `src/lib/board-actions.ts`

- [ ] **Step 1: Gate `/api/chat` behind sign-in.** Replace `src/app/api/chat/route.ts` entirely with:

```typescript
import { NextResponse } from "next/server";
import { chatReply, sanitizeMessages } from "@/lib/ai/chat";
import { getSuggestions } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Require sign-in — the chat calls a paid model, so don't expose it anonymously.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to use the chat." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = sanitizeMessages((body as { messages?: unknown })?.messages);
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages." }, { status: 400 });
  }

  try {
    const recentQueries = await getSuggestions(8);
    const reply = await chatReply(messages, recentQueries);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 2: Log write errors in `src/lib/saved-actions.ts`.** This file has two functions; each currently does `await supabase.from("saved_items").upsert(...)` / `.delete()...` and ignores the result. Capture and log the error in BOTH.

In `saveItem`, change:
```typescript
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
```
to:
```typescript
  const { error } = await supabase.from("saved_items").upsert(
    {
      user_id: user.id,
      item_id: item.id,
      item_type: item.type,
      title: item.title,
      cover_url: item.coverUrl,
    },
    { onConflict: "user_id,item_id,item_type" },
  );
  if (error) console.error("saveItem failed:", error.message);
```

In `removeItem`, change:
```typescript
  await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", id)
    .eq("item_type", type);
```
to:
```typescript
  const { error } = await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", id)
    .eq("item_type", type);
  if (error) console.error("removeItem failed:", error.message);
```

- [ ] **Step 3: Log write errors in `src/lib/comments-actions.ts`.** Same pattern for its two functions.

In `createTitleComment`, change the `await supabase.from("title_comments").insert({...});` call to capture `{ error }` and add `if (error) console.error("createTitleComment failed:", error.message);` immediately after.

In `deleteTitleComment`, change the `await supabase.from("title_comments").delete()...;` call to capture `{ error }` and add `if (error) console.error("deleteTitleComment failed:", error.message);` immediately after.

(Read the file first; keep the insert/delete arguments exactly as they are — only assign the result to `const { error } =` and add the log line.)

- [ ] **Step 4: Log write errors in `src/lib/board-actions.ts`.** Same pattern for its two functions.

In `createBoardPost`, capture `{ error }` from the `.insert({...})` call and add `if (error) console.error("createBoardPost failed:", error.message);`.

In `deleteBoardPost`, capture `{ error }` from the `.delete()...` call and add `if (error) console.error("deleteBoardPost failed:", error.message);`.

- [ ] **Step 5: Verify build, lint, tests**

Run: `npm run build` then `npm run lint` then `npm test`
Expected: Build succeeds; lint clean; all 46 tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/saved-actions.ts src/lib/comments-actions.ts src/lib/board-actions.ts
git commit -m "fix: gate chat behind auth and log write failures"
```

---

## Task 2: Accessibility + footer

**Files:**
- Create: `src/components/Footer.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Add a global focus-visible rule and remove the dead dark-mode block.** Replace `src/app/globals.css` entirely with:

```css
@import "tailwindcss";

:root {
  --background: #f9fafb;
  --foreground: #171717;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

/* Visible keyboard-focus ring on all interactive elements. */
@layer base {
  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid #4f46e5;
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

(This drops the `prefers-color-scheme: dark` override and the unused `@theme inline` color mapping — the app is intentionally light-themed via the Tailwind classes on `<body>`, so those were dead. `--background` is now the same gray-50 the body uses.)

- [ ] **Step 2: Create `src/components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500">
        <p>
          ShelfMate — search books &amp; movies, save your list, and get
          AI-powered recommendations.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Book data from Google Books. Movie data from TMDB. Built with Next.js
          &amp; Supabase.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Render the footer and make the body a flex column** so the footer sits at the bottom on short pages. Replace `src/app/layout.tsx` entirely with:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ShelfMate — Book & Movie Recommendations",
  description:
    "Search books and movies, save your favorites, discuss with others, and get AI-powered recommendations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
        <NavBar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean. Every page now shows the footer; keyboard `Tab` shows an indigo focus ring on links/buttons/inputs.

- [ ] **Step 5: Commit**

```bash
git add src/components/Footer.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat: add footer and global focus-visible styles"
```

---

## Task 3: Branded not-found + search loading skeleton

**Files:**
- Create: `src/app/not-found.tsx`, `src/app/search/loading.tsx`

- [ ] **Step 1: Create `src/app/not-found.tsx`** (Next.js renders this for `notFound()` and unmatched routes)

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-gray-600">
        We couldn&rsquo;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Back to home
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/search/loading.tsx`** (shown automatically while the server search runs)

```tsx
export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="h-7 w-56 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded border border-gray-200 bg-white">
            <div className="aspect-[2/3] animate-pulse bg-gray-200" />
            <div className="space-y-2 p-2">
              <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build` then `npm run lint`
Expected: Build succeeds; lint clean. Visiting `/title/banana/x` shows the branded 404; searching shows the skeleton grid briefly before results.

- [ ] **Step 4: Commit**

```bash
git add src/app/not-found.tsx src/app/search/loading.tsx
git commit -m "feat: add branded not-found page and search loading skeleton"
```

---

## Task 4: README + deployment guide

**Files:**
- Create/replace: `README.md`
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Replace `README.md`** (it's currently the create-next-app default) with:

````markdown
# ShelfMate

A book & movie recommendation website: search Google Books and TMDB, save your
own list, discuss titles with others, and get AI-powered recommendations and
chat — built with Next.js, Tailwind, Supabase, and Claude.

## Features

- **Search** books (Google Books) and movies (TMDB) from a bar on every page, with history-based suggestions
- **Title pages** with cover, description, rating, and comments
- **Home feed** — a sliding carousel of featured + popular titles, plus your saved list
- **Save** any title to your personal list
- **Community** — a global discussion board plus per-title comments
- **AI** — personalized recommendations on your home page and a chat assistant, powered by Claude

## Tech stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS) · Anthropic Claude · Vitest · deploys on Vercel.

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at <https://supabase.com>, then run the schema:
   open the dashboard SQL Editor and paste/run `supabase/migrations/0001_initial_schema.sql`.

3. **Configure environment** — copy `.env.example` to `.env.local` and fill in:

   | Variable | Where to get it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon public) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service role — keep secret) |
   | `TMDB_API_KEY` | <https://www.themoviedb.org/settings/api> (v3 auth) — optional; books work without it |
   | `ANTHROPIC_API_KEY` | <https://console.anthropic.com> — optional; AI features degrade gracefully without it |
   | `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |

4. **Enable auth providers** — in Supabase → Authentication: Email is on by
   default; for Google, add an OAuth client and add `http://localhost:3000/auth/callback`
   to the redirect URLs.

5. **Run**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm test` — run the unit tests (Vitest)
- `npm run lint` — lint

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for deploying to Vercel.

## Notes

- The session-refresh entry point is `src/proxy.ts` (Next.js 16 renamed the `middleware` convention to `proxy`).
- AI features (recommendations, chat) require `ANTHROPIC_API_KEY`; without it they hide/disable gracefully. The model is one constant (`AI_MODEL` in `src/lib/ai/client.ts`) — switch it to `claude-haiku-4-5` for lower cost.
````

- [ ] **Step 2: Create `docs/DEPLOYMENT.md`**

````markdown
# Deploying ShelfMate to Vercel

Everything below is a one-time setup. The app is a standard Next.js project, so
Vercel needs no special build config.

## 1. Push to GitHub

```bash
git push -u origin <your-branch>
```

(Or merge to `main` first.) Create a GitHub repo if you don't have one and push.

## 2. Import the project into Vercel

- Go to <https://vercel.com> → **Add New… → Project** → import your GitHub repo.
- Framework preset: **Next.js** (auto-detected). Leave build/output settings default.

## 3. Set environment variables in Vercel

In the Vercel project → **Settings → Environment Variables**, add the same keys
as `.env.local`, with production values:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (secret) |
| `TMDB_API_KEY` | your TMDB key (optional) |
| `ANTHROPIC_API_KEY` | your Anthropic key (optional) |
| `NEXT_PUBLIC_SITE_URL` | your production URL, e.g. `https://shelfmate.vercel.app` |

## 4. Point auth redirects at the production domain

Auth callbacks must match the deployed URL, or sign-in will redirect to localhost:

- **Supabase → Authentication → URL Configuration:** add
  `https://<your-domain>/auth/callback` to the **Redirect URLs**, and set the
  **Site URL** to `https://<your-domain>`.
- **Google Cloud Console → your OAuth client:** add
  `https://<your-domain>/auth/callback` to the authorized redirect URIs
  (in addition to the Supabase callback Google already uses).

## 5. Deploy

Vercel builds on push. After the first deploy, set `NEXT_PUBLIC_SITE_URL` to the
real domain (step 3) and redeploy so magic-link and OAuth emails point at
production.

## 6. Verify

- Sign in with email magic link and with Google.
- Search, open a title, save it, comment, and try the AI chat.

## Hardening notes (optional, for real traffic)

- `/api/chat` requires sign-in but has no rate limiting — add per-user rate
  limiting (e.g. via Vercel KV / Upstash) before opening to the public, since it
  calls a paid model.
- The home-page AI recommendations call Claude on each load for signed-in users
  with history — add a short-lived per-user cache to cut cost.
````

- [ ] **Step 3: Verify nothing broke**

Run: `npm run build`
Expected: Build succeeds (docs/README changes don't affect the build; this is a sanity check).

- [ ] **Step 4: Commit**

```bash
git add README.md docs/DEPLOYMENT.md
git commit -m "docs: add README and Vercel deployment guide"
```

---

## Phase 6 Done — Definition of Done

- `/api/chat` returns 401 when logged out; Supabase write failures are logged.
- Every page has a footer; keyboard focus shows a visible ring; the dead dark-mode CSS is gone.
- A branded 404 renders for unknown routes / `notFound()`, and search shows a skeleton while loading.
- `README.md` documents setup and `docs/DEPLOYMENT.md` documents the Vercel + Supabase production steps.
- `npm test` passes (46) and `npm run build` succeeds.

The actual Vercel deploy + production redirect URLs are the user's manual steps, guided by `docs/DEPLOYMENT.md`. This completes the 6-phase build.

---

## Self-Review Notes

- **Spec coverage (Phase 6 scope):** "polish + deploy" — accessibility/polish (footer, focus rings, 404, loading skeleton) ✓; deploy readiness (README + deployment guide) ✓; plus closing the two carried debts (chat auth gate, write-error logging). The deploy itself is inherently manual (user's accounts) and is fully documented.
- **No placeholders:** every code/doc step is complete content.
- **Type/consistency:** no new types; changes are additive UI/routing/docs plus `const { error } =` captures that match the Supabase client's return shape already used elsewhere (e.g. Phase 5's `createBoardPost` siblings). The 46 existing tests are unaffected and must stay green.
- **Risk:** lowest of any phase — surgical edits, no data-model or API-shape changes. The only behavior change is the chat 401 (intended).

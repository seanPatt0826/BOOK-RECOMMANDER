# Phase 1: Setup, Supabase & Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Tailwind + Supabase project with working email + Google authentication, the full database schema, and a navigable app shell.

**Architecture:** Next.js App Router with TypeScript. Supabase provides Postgres, Auth, and Row-Level Security. Auth uses `@supabase/ssr` so sessions work in server components and route handlers. The database schema for the *entire* project is created in this phase so later phases only add UI and logic.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest for unit tests.

This plan is Phase 1 of 6. It refers to the design spec at `docs/superpowers/specs/2026-05-16-book-movie-recommendation-website-design.md`.

---

## File Structure

Files created in this phase:

- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts` — project config
- `.env.local` (git-ignored), `.env.example` — environment variables
- `.gitignore`
- `src/app/layout.tsx` — root layout (nav + shell)
- `src/app/globals.css` — Tailwind entry
- `src/app/page.tsx` — home placeholder
- `src/app/search/page.tsx`, `src/app/community/page.tsx`, `src/app/chat/page.tsx` — placeholder pages
- `src/app/login/page.tsx` — sign-in page
- `src/app/auth/callback/route.ts` — OAuth/magic-link callback handler
- `src/app/auth/signout/route.ts` — sign-out handler
- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/supabase/server.ts` — server Supabase client
- `src/lib/supabase/middleware.ts` — session-refresh helper
- `src/middleware.ts` — Next.js middleware (refreshes auth session)
- `src/components/NavBar.tsx` — top navigation with auth state
- `supabase/migrations/0001_initial_schema.sql` — full database schema + RLS
- `src/lib/env.ts` — typed environment-variable access
- `src/lib/env.test.ts` — unit test for env helper

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create the project with the Next.js scaffolder**

Run from `C:\Projects\Book reccomender`:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```

When prompted that the directory is not empty (it contains `docs/` and `.git/`), choose to continue. This generates `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.

- [ ] **Step 2: Verify the dev server starts**

Run: `npm run dev`
Expected: Server starts on `http://localhost:3000`; opening it shows the default Next.js page with no errors in the terminal. Stop the server (Ctrl+C) after confirming.

- [ ] **Step 3: Confirm `.gitignore` excludes secrets and build output**

Open `.gitignore` and confirm it contains `.env*` (or add `.env.local` if missing) and `/node_modules` and `/.next`. The `.env.example` file must NOT be ignored — if `.gitignore` has a blanket `.env*`, change that line to `.env*` followed by a new line `!.env.example`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind project"
```

---

## Task 2: Install dependencies and set up environment config

**Files:**
- Modify: `package.json` (via npm install)
- Create: `.env.example`, `.env.local`, `src/lib/env.ts`, `vitest.config.ts`
- Test: `src/lib/env.test.ts`

- [ ] **Step 1: Install runtime and test dependencies**

Run:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Add the test script to `package.json`**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 4: Create `.env.example`** (committed — documents required variables, no real values)

```
# Supabase — from your Supabase project settings > API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# TMDB — used in Phase 2 (https://www.themoviedb.org/settings/api)
TMDB_API_KEY=

# Anthropic — used in Phase 5 (https://console.anthropic.com/)
ANTHROPIC_API_KEY=

# Base URL of the deployed app (use http://localhost:3000 in development)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 5: Create `.env.local`** (git-ignored — real values)

Copy `.env.example` to `.env.local`. The user fills in real Supabase values in Task 3. For now, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and leave the rest blank.

- [ ] **Step 6: Write the failing test for the env helper**

Create `src/lib/env.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireEnv } from "./env";

describe("requireEnv", () => {
  const KEY = "TEST_ENV_VALUE";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("returns the value when the variable is set", () => {
    process.env[KEY] = "hello";
    expect(requireEnv(KEY)).toBe("hello");
  });

  it("throws a descriptive error when the variable is missing", () => {
    expect(() => requireEnv(KEY)).toThrowError(/TEST_ENV_VALUE/);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test -- env.test.ts`
Expected: FAIL — `requireEnv` is not defined / cannot find module `./env`.

- [ ] **Step 8: Implement `src/lib/env.ts`**

```typescript
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test -- env.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: add dependencies, env config, and Vitest setup"
```

---

## Task 3: Create the database schema in Supabase

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

This task requires the user to have created a Supabase project. The assistant should pause and confirm the user has done so, then guide them to paste the SQL into the Supabase dashboard SQL editor.

- [ ] **Step 1: Confirm the user has a Supabase project**

Ask the user to create a project at https://supabase.com (if not already done) and to paste these three values into `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` (Project Settings > API > Project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings > API > `anon` `public` key)
- `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API > `service_role` key — keep secret)

- [ ] **Step 2: Create the migration file `supabase/migrations/0001_initial_schema.sql`**

```sql
-- Phase 1: full schema for the book & movie recommendation website.

-- profiles: one row per authenticated user.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Reader',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- search_history: every search a user performs.
create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  clicked_item_id text,
  clicked_item_type text check (clicked_item_type in ('book', 'movie')),
  created_at timestamptz not null default now()
);

-- saved_items: a user's personal list.
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  item_type text not null check (item_type in ('book', 'movie')),
  title text not null,
  cover_url text,
  created_at timestamptz not null default now(),
  unique (user_id, item_id, item_type)
);

-- featured_items: hand-curated home-page picks (managed by the site owner).
create table public.featured_items (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  item_type text not null check (item_type in ('book', 'movie')),
  title text not null,
  cover_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- board_posts: global discussion board. parent_id null = top-level post.
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.board_posts (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- title_comments: comments attached to a specific book/movie.
create table public.title_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  item_type text not null check (item_type in ('book', 'movie')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Reader'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-Level Security.
alter table public.profiles enable row level security;
alter table public.search_history enable row level security;
alter table public.saved_items enable row level security;
alter table public.featured_items enable row level security;
alter table public.board_posts enable row level security;
alter table public.title_comments enable row level security;

-- profiles: anyone can read; a user may update only their own.
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- search_history: fully private to the owning user.
create policy "users read their own history"
  on public.search_history for select using (auth.uid() = user_id);
create policy "users insert their own history"
  on public.search_history for insert with check (auth.uid() = user_id);
create policy "users delete their own history"
  on public.search_history for delete using (auth.uid() = user_id);

-- saved_items: fully private to the owning user.
create policy "users read their own saved items"
  on public.saved_items for select using (auth.uid() = user_id);
create policy "users insert their own saved items"
  on public.saved_items for insert with check (auth.uid() = user_id);
create policy "users delete their own saved items"
  on public.saved_items for delete using (auth.uid() = user_id);

-- featured_items: readable by everyone; writes only via service role
-- (service role bypasses RLS, so no write policy is needed).
create policy "featured items are readable by everyone"
  on public.featured_items for select using (true);

-- board_posts: readable by everyone; a user writes/deletes only their own.
create policy "board posts are readable by everyone"
  on public.board_posts for select using (true);
create policy "users insert their own board posts"
  on public.board_posts for insert with check (auth.uid() = user_id);
create policy "users delete their own board posts"
  on public.board_posts for delete using (auth.uid() = user_id);

-- title_comments: readable by everyone; a user writes/deletes only their own.
create policy "title comments are readable by everyone"
  on public.title_comments for select using (true);
create policy "users insert their own title comments"
  on public.title_comments for insert with check (auth.uid() = user_id);
create policy "users delete their own title comments"
  on public.title_comments for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Run the migration in Supabase**

Guide the user: open the Supabase dashboard > SQL Editor > New query, paste the entire contents of `supabase/migrations/0001_initial_schema.sql`, and click Run. Expected: "Success. No rows returned."

- [ ] **Step 4: Verify the tables exist**

In the Supabase dashboard > Table Editor, confirm all six tables appear: `profiles`, `search_history`, `saved_items`, `featured_items`, `board_posts`, `title_comments`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql
git commit -m "feat: add database schema with row-level security"
```

---

## Task 4: Create the Supabase clients and session middleware

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`

- [ ] **Step 1: Create the browser client `src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
```

- [ ] **Step 2: Create the server client `src/lib/supabase/server.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; the
            // middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create the session-refresh helper `src/lib/supabase/middleware.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshing the session keeps server components in sync.
  await supabase.auth.getUser();

  return response;
}
```

- [ ] **Step 4: Create `src/middleware.ts`**

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Verify the project still builds**

Run: `npm run build`
Expected: Build completes with no TypeScript errors. (A warning about missing env vars at build time is acceptable only if the build still succeeds; if it fails, confirm `.env.local` has the Supabase URL and anon key from Task 3.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Supabase browser/server clients and session middleware"
```

---

## Task 5: Build the auth flow (login, callback, sign-out)

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/signout/route.ts`

- [ ] **Step 1: Enable Google OAuth in Supabase**

Guide the user: in the Supabase dashboard > Authentication > Providers, enable **Email** (already on by default) and **Google**. For Google, the user creates an OAuth client at https://console.cloud.google.com/ and pastes the client ID/secret into Supabase. Also, under Authentication > URL Configuration, add `http://localhost:3000/auth/callback` to the Redirect URLs. Email magic links work with no extra setup.

- [ ] **Step 2: Create the callback route `src/app/auth/callback/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 3: Create the sign-out route `src/app/auth/signout/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
```

- [ ] **Step 4: Create the login page `src/app/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="w-full rounded bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Email me a magic link
        </button>
      </form>

      {status === "sent" && (
        <p className="mt-3 text-sm text-green-700">
          Check your email for the sign-in link.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-red-700">
          Something went wrong. Please try again.
        </p>
      )}

      <div className="my-6 text-center text-sm text-gray-500">or</div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50"
      >
        Continue with Google
      </button>
    </main>
  );
}
```

- [ ] **Step 5: Manually verify the magic-link flow**

Run: `npm run dev`. Visit `http://localhost:3000/login`, enter your email, submit. Expected: "Check your email" message; the email arrives; clicking the link redirects through `/auth/callback` to `/` while signed in. Verify a row appeared in the `profiles` table in Supabase.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add email magic-link and Google sign-in"
```

---

## Task 6: Build the app shell (nav bar, layout, placeholder pages)

**Files:**
- Create: `src/components/NavBar.tsx`, `src/app/search/page.tsx`, `src/app/community/page.tsx`, `src/app/chat/page.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create the nav bar `src/components/NavBar.tsx`**

This is a server component; it reads the current user and shows sign-in or sign-out accordingly.

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-bold text-indigo-600">
          ShelfMate
        </Link>
        <Link href="/search" className="text-sm hover:underline">
          Search
        </Link>
        <Link href="/community" className="text-sm hover:underline">
          Community
        </Link>
        <Link href="/chat" className="text-sm hover:underline">
          AI Chat
        </Link>

        <div className="ml-auto">
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="text-sm text-gray-600 hover:underline">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-sm hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Wire the nav bar into the root layout `src/app/layout.tsx`**

Replace the file contents with:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "ShelfMate — Book & Movie Recommendations",
  description: "Search, save, and discover books and movies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace the home placeholder `src/app/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Welcome to ShelfMate</h1>
      <p className="mt-2 text-gray-600">
        Search books and movies, save your favorites, and get AI-powered
        recommendations. The home feed arrives in Phase 3.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Create the placeholder pages**

Create `src/app/search/page.tsx`:

```tsx
export default function SearchPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">Search</h1>
      <p className="mt-2 text-gray-600">Search arrives in Phase 2.</p>
    </main>
  );
}
```

Create `src/app/community/page.tsx`:

```tsx
export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">Community</h1>
      <p className="mt-2 text-gray-600">
        The discussion board arrives in Phase 4.
      </p>
    </main>
  );
}
```

Create `src/app/chat/page.tsx`:

```tsx
export default function ChatPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">AI Chat</h1>
      <p className="mt-2 text-gray-600">The AI chat arrives in Phase 5.</p>
    </main>
  );
}
```

- [ ] **Step 5: Verify the full shell works**

Run: `npm run dev`. Confirm:
- The nav bar appears on every page.
- Links to `/`, `/search`, `/community`, `/chat` all load their placeholder.
- When signed out, the nav shows "Sign in"; when signed in (from Task 5), it shows "Sign out", and clicking it returns you to `/` signed out.

- [ ] **Step 6: Run the full build and test suite**

Run: `npm run build` then `npm test`
Expected: Build succeeds with no errors; all tests pass (the `env` test from Task 2).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add app shell with nav bar and placeholder pages"
```

---

## Phase 1 Done — Definition of Done

- The project builds (`npm run build`) and tests pass (`npm test`).
- All six database tables exist in Supabase with RLS enabled.
- A user can sign in via email magic link and via Google, and sign out.
- A new sign-in automatically creates a `profiles` row.
- Every page shows the shared nav bar with correct signed-in/out state.

Phase 2 (search, history, title detail pages) gets its own plan, written after Phase 1 is executed.

---

## Self-Review Notes

- **Spec coverage (Phase 1 scope):** Tech stack ✓ (Task 1–2), full data model ✓ (Task 3 — all six tables created now so later phases only add UI/logic), Supabase Auth with magic link + Google ✓ (Task 5), RLS ✓ (Task 3), app shell/nav/pages ✓ (Task 6). Search, home feed, comments, and AI are intentionally deferred to Phases 2–5.
- **Placeholders:** None — every code step contains complete code.
- **Type consistency:** `createClient()` is the export name for both `client.ts` and `server.ts` (imported in different files, never together). `requireEnv` signature is consistent across `env.ts`, both Supabase clients, and the middleware helper.

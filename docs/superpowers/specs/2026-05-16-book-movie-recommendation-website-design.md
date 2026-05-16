# Book & Movie Recommendation Website — Design

**Date:** 2026-05-16
**Status:** Approved

## Purpose

A portfolio-quality website where users can search books and movies, save
their own picks, get AI-powered personalized recommendations, chat with an AI
about what to read/watch, and discuss titles publicly. Built to be polished
enough to show people and deploy online.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Backend / DB / Auth:** Supabase (Postgres, Auth, Row-Level Security)
- **Hosting:** Vercel
- **External data:** Google Books API (books, no key required), TMDB API
  (movies, key required)
- **AI:** Anthropic Claude via server-side API routes

## Pages

### Home page
- Horizontal, left-to-right **sliding carousel** of book/movie cards (cover,
  title, rating). Content = curated featured picks plus popular API titles.
- **AI recommendations** section: personalized cards each with a one-line
  "why you might like this" note, derived from the user's search history.
- **Right side: personal list** — books/movies the logged-in user has saved
  or recommended themselves.

### Search
- A search bar present on every page.
- Typing a title returns merged results from Google Books + TMDB.
- A **history dropdown**: focusing the search bar shows recent searches and
  history-based query suggestions automatically.

### Title detail page
- One page per book/movie: cover, description, rating, "Save to my list"
  button, and a **per-title comment thread**.

### Community page
- A single public **global discussion board**. Any signed-in user can post
  and reply.

### AI chat
- A chat box (own page or slide-out panel) for conversational requests such
  as "recommend a sci-fi book like Dune." Can reference the user's history.

### Auth pages
- Sign up / sign in.

## Data Model (Supabase Postgres)

- `profiles` — one row per user: display name, avatar.
- `search_history` — user_id, query text, clicked item, timestamp.
- `saved_items` — the user's personal list: user_id + item reference.
- `featured_items` — hand-curated home-page picks.
- `board_posts` — global discussion board posts and replies.
- `title_comments` — comments attached to a specific book/movie.

Books and movies are **not** fully stored. Each reference keeps: an external
ID, a type (`book` or `movie`), and a cached title + cover image. Full details
are fetched live from the APIs when a title is viewed.

## Search Flow

1. User types → request hits a Next.js server route.
2. Route queries Google Books and TMDB **in parallel**, merges and returns
   results.
3. Each search is written to `search_history`.
4. The history dropdown reads the user's recent searches plus most-frequent
   genres/keywords to suggest queries.

## AI Flow

All AI calls run **server-side** so the API key is never exposed to the
browser. The key is stored as a Vercel environment variable.

- `/api/recommend` — sends a summary of the user's recent search history to
  Claude; returns 4–6 recommendations, each with a one-line reason; rendered
  on the home page.
- `/api/chat` — powers the chat box; conversational; may reference the user's
  history.

## Accounts (Supabase Auth)

- Sign-in via **email magic link** and **Google OAuth**.
- **Logged out:** browsing, searching, and reading comments all work.
- **Requires sign-in:** saving items, posting comments, search history, AI
  recommendations.
- **Row-Level Security:** each user can only modify their own history and
  saved list; comment/board posts are tied to their author.

## Error Handling

- External API (Google Books / TMDB) down or slow → friendly "couldn't load
  results, try again" message; no crash.
- AI call fails or rate-limited → recommendations area shows a gentle
  fallback ("recommendations unavailable right now"); rest of site unaffected.
- Comment and save actions show clear success/failure feedback.

## Testing

- Unit tests for the search-merge logic and the history-suggestion logic.
- External APIs and the AI are **mocked** in tests — fast and free to run.

## Build Order (one spec, phased)

1. Project setup, Supabase, auth, page shell.
2. Search + history + title detail pages.
3. Home page (carousel, personal list, featured picks).
4. Comments (global board + per-title).
5. AI (recommendations + chat).
6. Polish + deploy to Vercel.

## User-Provided Prerequisites

The user will supply (guided by the assistant):

- A Supabase project (URL + anon key + service role key).
- A TMDB API key.
- An Anthropic API key.

Google Books requires no key.

## Out of Scope (YAGNI)

- Per-title comments and global board are both included; nothing beyond them
  (no private messaging, no notifications, no following users).
- No password-based auth (magic link + OAuth only).
- No full local mirror of book/movie catalogs.

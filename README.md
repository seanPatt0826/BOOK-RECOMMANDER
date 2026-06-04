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

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
- Search, open a title, save it, and comment.

## Hardening notes (optional, for real traffic)

- The home-page AI recommendations call Claude on each load for signed-in users
  with history — add a short-lived per-user cache to cut cost.

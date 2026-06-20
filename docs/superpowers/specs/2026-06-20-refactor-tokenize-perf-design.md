# Refactor / Tokenize / Perf Pass — v1 Design

**Date:** 2026-06-20
**Status:** Approved
**Context:** A behavior-preserving cleanup of the ShelfMate codebase (Next.js 16 App Router, React 19, TypeScript, Tailwind v4 "Reading Room" theme). Three workstreams in one cohesive, sequenced plan: fix real bugs, extract shared UI primitives + design tokens, and refactor duplicated logic — plus a small targeted performance pass. Grounded in a full-codebase duplication map (see findings below). Zero feature changes, zero intended visual changes (except the two bug fixes).

## Goal

Reduce duplication and fix correctness/perf smells without changing what the app does. Every stage keeps the codebase green: `npm test` (currently 53 passing), `npm run lint`, and `npm run build` must pass after each stage. The end state: typed UI primitives replace ~30 inline call sites, two logic helpers replace ~9 duplicated blocks, semantic status tokens replace raw colors, and `npm run lint` is clean.

## Guiding Rules

- **Behavior-preserving.** No feature changes. No visual changes a user would notice, except the two bug fixes (which are invisible-to-slightly-better).
- **Incremental.** Migrate one call site / one primitive at a time; run the verification gate between steps so a regression is caught immediately.
- **Existing tests are the safety net** for refactors. Add new tests only where new logic is introduced (the two `src/lib` helpers) or where a primitive carries behavior worth pinning (render/smoke tests).
- **YAGNI.** The out-of-scope list below is deliberate; do not expand scope mid-implementation.

## Non-Goals (out of scope)

- Extracting `src/lib/uap/cases.ts` (301 lines) — it is *data*, not complexity. Leave it co-located and typed.
- A `withFallback()` higher-order abstraction over data sources — the sources differ too much (API shapes, ID formats) for it to pay off.
- A generic `FilteredGrid` merging `GenreBrowser` + `CaseBrowser` — sharing the `NavItem` primitive captures the bulk of the duplication win without the abstraction cost.
- Migrating `<img>` to `next/image` — covers are external hotlinked URLs (Open Library, iTunes, Wikipedia); risky and not worth it in v1.
- Any change to auth flows, data sources' external behavior, or the UAP/puzzle features.

## Baseline (verified 2026-06-20)

- **TypeScript:** `npx tsc --noEmit` clean.
- **Tests:** 53 passing across 13 files (`npm test`).
- **Lint:** 2 errors, both `react-hooks/set-state-in-effect` — `HomeBackground.tsx:76`, `ThemeToggle.tsx:11`.
- **Build:** passes (the pre-existing `keylessMovies.ts` type-predicate blocker was already fixed).

## Stages

### Stage 1 — Fix the bugs (correctness + perf)

Two components call `setState` synchronously inside a `useEffect` body, triggering cascading re-renders (flagged by `react-hooks/set-state-in-effect`).

- **`src/components/ThemeToggle.tsx:11`** — currently reads `document.documentElement.classList.contains("dark")` and calls `setDark(...)` + `setMounted(true)` inside the effect. Fix: derive the initial `dark` value via lazy initial state (`useState(() => ...)`) guarded for SSR, or keep an effect that *subscribes* rather than synchronously sets on mount. The visible toggle behavior must be unchanged (no hydration flash regression — there is already an inline theme script in `layout.tsx` that sets the class pre-hydration).
- **`src/components/HomeBackground.tsx:76`** — `setMounted(true)` + localStorage read inside the effect. Fix: lazy-initialize `mode` from a safe reader; keep the mount flag only if genuinely needed for portal/SSR guarding, set in a way that does not cascade. Portaled leaves/grass behavior unchanged.

**Acceptance:** `npm run lint` reports 0 errors. ThemeToggle still toggles light/dark and persists; HomeBackground still picks calm/nature/gradient and persists; no hydration-mismatch warnings in the dev console.

### Stage 2 — Design tokens (foundation the primitives consume)

Tokens are defined in `src/app/globals.css` (`:root` light, `.dark` overrides, exposed to Tailwind via `@theme inline`). Extend them before building primitives so primitives reference tokens, never raw colors.

- **Add semantic status tokens:** `--success`, `--success-contrast`, `--danger`, `--danger-contrast` for both light and dark, wired through `@theme inline` so `bg-danger` / `text-danger` / `bg-success` etc. resolve as Tailwind utilities.
- **Replace raw status colors:** `src/app/login/page.tsx` uses `bg-red-600` / `text-red-400` for error/success messaging — swap to the new tokens.
- **Revive the dead `.glass` class:** `.glass` is defined in `globals.css` but used nowhere; the glass look is hand-inlined in `NavBar`, `Carousel` (×2), and `page.tsx`. Apply `.glass` at those sites (fold it in) rather than deleting it. If a site needs a variant the class can't express, leave that site inline and note why.
- **Name the stray hardcoded values** in `HomeBackground` that are theme-relevant (e.g. the accent orb color that duplicates `--accent` in dark mode) by referencing the token; leave purely-decorative SVG fills (leaf greens) as-is if they are not part of the theme system — document the choice in the plan.

**Acceptance:** no `bg-red-*` / `text-red-*` literals remain for status messaging; `.glass` is referenced by at least the NavBar; build + tests + lint green; the rendered UI looks the same in light and dark.

### Stage 3 — UI primitives in `src/components/ui/`

Build typed, token-consuming primitives, each in its own file under `src/components/ui/`, then migrate inline call sites one primitive at a time. Each primitive is a focused unit: clear props, no business logic, renders tokens.

| Primitive | Props (sketch) | Replaces | Approx. sites |
|-----------|----------------|----------|---------------|
| `Button` | `variant: "primary" \| "secondary" \| "ghost"`, `size?: "sm" \| "md"`, polymorphic (`<button>` or, when `href`, a Next `<Link>`), passes through `className`/`disabled`/`type` | inline `bg-accent …` and `border-edge …` buttons | ~18 |
| `Input` / `Textarea` | native props + token styling, `className` passthrough | inline `rounded-lg border border-edge bg-paper …` fields | ~5 |
| `Card` | `as?`, `className`, `children`; backs the existing `.card` CSS | `ResultCard`, `CaseCard`, inline comment/post cards | ~5 |
| `SectionHeader` | `children` (title), optional `accentColor`/`eyebrow` | the `accent bar + <h2>` markup pattern | 5 |
| `NavItem` | `selected: boolean`, `onClick`, `label`, optional `count` | the duplicated `navItem()` helper in `GenreBrowser` + `CaseBrowser` | 2 (defs) |
| `Chip` | `children`, `className`; backs the existing `.chip` CSS | tag/badge sites | 4 |

Conventions:
- Primitives consume design tokens only (no raw hex). `Card`/`Chip` may keep the `.card`/`.chip` CSS class as their styling backing (don't rip out working CSS — wrap it).
- `Button`'s polymorphism handles the existing mix of `<button>` actions and `<Link>`/`<a>` navigations (e.g. "Start exploring", "Sign in") without forcing callers to change semantics.
- Migrate, then verify, per primitive — not all at once.

**Acceptance:** each migrated site renders identically (spot-checked in the running app for the home, search, title, community, login, and uap pages); existing tests still pass; new render/smoke tests exist for `Button` (variants render correct element: button vs link) and `NavItem` (selected vs unselected state). Inline duplication for the six patterns is gone or documented as an intentional exception.

### Stage 4 — Logic refactor (`src/lib/`), TDD

These carry real logic, so write the test first, watch it fail, then implement.

- **`getCurrentUser()`** — a small helper (e.g. `src/lib/auth.ts`) wrapping `const { data: { user } } = await (await createClient()).auth.getUser(); return user;`. Collapses the ~7 repetitions of the create-client + `getUser()` + null-guard pattern in `saved.ts`, `comments.ts`, `title/[type]/[id]/page.tsx`, `community/page.tsx`, `CommentsSection.tsx`, `NavBar.tsx`. Callers that early-return on `!user` keep that logic; the helper only removes the boilerplate fetch.
- **`enrichRowsWithAuthors()`** — extract the verbatim-duplicated block in `comments.ts` and `board.ts` (collect distinct `user_id`s → fetch `profiles` → merge author map onto rows). Lives next to the existing pure `comments-core.ts` and is unit-tested with fixture rows + profiles, including the "missing profile → 'Reader' fallback" path that the app already relies on.

**Acceptance:** new unit tests for both helpers pass; `comments.ts` and `board.ts` use the shared helper; the ~7 auth-boilerplate sites use `getCurrentUser()`; full suite green; Save/Comments/Community still persist and show author names in the running app.

### Stage 5 — Performance pass (targeted, measured, no speculation)

- **Images:** add `loading="lazy"` and explicit width/height (or aspect-ratio container) to grid covers (`ResultCard`) and case/detail images to cut layout shift and defer offscreen loads. No `next/image`.
- **Memoization:** apply `React.memo` only to list-item cards that re-render under a parent whose state changes without changing the item — specifically `ResultCard` under `SearchResults` (filter/sort state) and `CaseCard` under `CaseBrowser` (tag filter). Do not blanket-memo everything.
- **Client/server boundary check:** confirm no `"use client"` component imports server-only work; note findings. (Stage 1 already removes the cascading-render source.)

**Acceptance:** images lazy-load with no visible layout shift on the home/search/uap grids; memoized cards do not re-render when unrelated parent state changes (spot-check via React DevTools or a render-count assertion if cheap); build + tests + lint green.

## Verification Gate (run after every stage)

```
npm test && npm run lint && npm run build
```

Plus a manual spot-check in the running dev server for any stage that touches rendered output (Stages 2, 3, 5): load `/`, `/search?q=…`, a `/title/...` detail, `/community`, `/login`, `/uap`, and a `/uap/<slug>` detail in both light and dark mode and confirm nothing shifted.

## File / Module Plan (new + touched)

**New:**
- `src/components/ui/Button.tsx` (+ `Button.test.tsx`)
- `src/components/ui/Input.tsx`, `src/components/ui/Textarea.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/NavItem.tsx` (+ `NavItem.test.tsx`)
- `src/components/ui/Chip.tsx`
- `src/lib/auth.ts` (+ `auth.test.ts`)
- `enrichRowsWithAuthors` in/next to `src/lib/comments-core.ts` (+ test)

**Touched (migrations):** `globals.css`; `ThemeToggle.tsx`, `HomeBackground.tsx`; `login/page.tsx`, `not-found.tsx`, `page.tsx`, `NavBar.tsx`, `BigSearchBar.tsx`, `CommentForm.tsx`, `SaveButton.tsx`, `SearchBar.tsx`, `SearchResults.tsx`, `Carousel.tsx`, `ResultCard.tsx`, `CaseCard.tsx`, `GenreBrowser.tsx`, `CaseBrowser.tsx`, `uap/[slug]/page.tsx`, `CommentsSection.tsx`, `community/page.tsx`; `saved.ts`, `comments.ts`, `board.ts`, `title/[type]/[id]/page.tsx`.

## Risks & Mitigations

- **Hydration flash on ThemeToggle fix** → the inline theme script in `layout.tsx` already sets the class before hydration; verify no flash after the change.
- **Subtle visual drift when folding inline glass/card markup into shared primitives/classes** → migrate one site at a time and spot-check light + dark.
- **Polymorphic `Button` breaking link semantics** (prefetch, keyboard) → render-test the `href` path produces a real `<Link>`/anchor, not a `<button>` with a click handler.
- **`React.memo` masking a needed update** → only memo items whose props are stable by value; keep the memo list minimal.

# UAP Encyclopedia — v1 Design

**Date:** 2026-06-18
**Status:** Approved
**Context:** New read-only section added alongside the existing ShelfMate book/movie recommender. Shares the Next.js 16 App Router stack, Tailwind "Reading Room" design system, `NavBar`/`Footer`, and the `src/lib` (pure, tested) + `src/components` (UI) conventions. First slice of the larger "UFO Detective Academy" concept.

## Goal

A browsable encyclopedia of famous UAP/UFO cases. Each case presents multiple viewpoints fairly via a fixed four-section structure, backed by citations. Zero-AI, no network calls, no database, no auth.

## Non-Goals (future phases)

- Save / bookmark cases
- Comments / community discussion
- Wikipedia or external image enrichment
- The Investigator verdict game, quizzes, ranking, AI assistant

## Approach

Dedicated `/uap` route tree backed by a typed, in-repo data module. Rejected alternatives: reusing `/title/[type]/[id]` (forces a media-shaped model that doesn't fit and tangles the external-API path); JSON/Markdown files (lose compile-time guarantees that every case has all four sections + citations).

## Architecture

### Data layer — `src/lib/uap/`

**`types.ts`** — the `UapCase` type:

| Field | Type | Notes |
|-------|------|-------|
| `slug` | `string` | URL id, unique, kebab-case |
| `name` | `string` | Display title |
| `dateLabel` | `string` | Human label, e.g. "July 1947" |
| `location` | `string` | e.g. "Roswell, New Mexico, USA" |
| `tags` | `string[]` | Category/decade/country, e.g. `["Mass sighting", "Military", "1940s", "USA"]` |
| `summary` | `string` | One line, used on cards |
| `reported` | `string` | What witnesses described |
| `evidence` | `string` | What physical/documentary evidence exists |
| `skepticalExplanations` | `string[]` | Conventional explanations, stated fairly |
| `openQuestions` | `string[]` | What remains genuinely unresolved |
| `sources` | `{ label: string; url: string }[]` | Citations |

**`cases.ts`** — the curated `UapCase[]` array (zero-AI, no fetch, in-repo).

**`cases-core.ts`** — pure helpers, unit-tested, mirroring the existing `*-core.ts` + `*.test.ts` convention:
- `getAllCases(): UapCase[]`
- `getCase(slug: string): UapCase | null`
- `casesByTag(tag: string): UapCase[]`
- `allTags(): string[]` — distinct tags for the browse nav

### Routes (server components)

- **`/uap`** — browse page. Main column of `CaseCard`s; sticky right-side tag nav with instant client-side filtering. Modeled on `GenreBrowser`.
- **`/uap/[slug]`** — case detail. Header (name, date, location, tag chips), then four clearly delineated sections (Reported / Evidence / Skeptical explanations / Open questions), then a **Sources** list. `notFound()` on unknown slug. Uses existing design tokens (`surface`, `ink`, `accent`, `card`, `chip`, `edge`, `muted`).

### Components

- **`CaseCard`** — mirrors `ResultCard` (links to `/uap/[slug]`, no cover image; shows name, date, summary, tag chips).
- **`CaseBrowser`** — client component, mirrors `GenreBrowser` (tag list + filtered card grid, instant switching).
- **`NavBar`** — add a single "UAP" link.

## Content

Starter set of ~10 well-researched cases, each with all four sections written to present skeptic and proponent views fairly, plus citations:

Roswell, Phoenix Lights, Belgian UFO Wave, Rendlesham Forest, Nimitz "Tic-Tac", Kenneth Arnold, Travis Walton, Foo Fighters, Hudson Valley, Westall.

## Testing

- **Helper unit tests** (`cases-core.test.ts`): lookup by slug (hit + miss), tag filtering, distinct tag listing.
- **Data-integrity test**: unique slugs; every case has non-empty `reported`, `evidence`, and at least one entry in `skepticalExplanations`, `openQuestions`, and `sources`; every `source.url` parses as a valid URL.

## Error handling

No network calls → no fetch failures. Unknown slug → `notFound()`. Empty tag filter renders an empty-state message rather than a blank page.

## Data flow

```
cases.ts (static UapCase[])
   └─ cases-core.ts (pure helpers)
        ├─ /uap        → allTags() + getAllCases() → CaseBrowser → CaseCard
        └─ /uap/[slug] → getCase(slug) → detail sections + sources
```

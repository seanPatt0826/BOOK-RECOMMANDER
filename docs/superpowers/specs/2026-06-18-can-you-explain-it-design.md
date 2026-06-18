# "Can You Explain It?" — Daily UAP Image Puzzle — v1 Design

**Date:** 2026-06-18
**Status:** Approved
**Context:** Second feature of the "UFO Detective Academy" concept, added alongside the UAP Encyclopedia (see `2026-06-18-uap-encyclopedia-design.md`). Shares the Next.js 16 App Router stack, "Reading Room" Tailwind design system, `NavBar`/`Footer`, and the `src/lib` (pure, tested) + `src/components` (UI) conventions. Zero-AI, no database, no auth.

## Goal

A Wordle-style daily puzzle: show one curated real-world sky/UFO photo with a known explanation, let the user guess what it is from multiple-choice options, then reveal the answer + a teaching explanation. Everyone sees the same puzzle each day; result and streak persist in the browser; the result is shareable.

## Non-Goals (future / out of scope)

- User accounts, cross-device streaks, or global "% guessed wrong" stats
- Multiple guesses, hints, or lifelines (v1 is one guess per day)
- Video puzzles or user-submitted images
- Server-side persistence of any kind

## Approach

Static, in-repo puzzle dataset + deterministic date-based selection + `localStorage` state. Rejected alternatives: Supabase-backed puzzle-of-day + per-user results (pulls auth/DB into scope, overkill for v1); explicit date→puzzle calendar (tedious, finite). The modulo approach means everyone gets the same puzzle per day with zero backend.

## Architecture

### Data layer — `src/lib/puzzles/`

**`types.ts`** — the `Puzzle` and `PuzzleCredit` types:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Unique, kebab-case |
| `imageUrl` | `string` | Hotlinked public-domain / CC image (Wikimedia Commons, NASA, US-gov) |
| `imageAlt` | `string` | Describes the image; also the fallback if the image fails to load |
| `credit` | `PuzzleCredit` | `{ label: string; url: string }` — attribution + license link (required) |
| `prompt` | `string` | Optional flavor line shown above the image |
| `options` | `string[]` | Multiple-choice answers (≥2), e.g. `["Drone", "Balloon", "Lens flare", "Starlink satellites"]` |
| `answer` | `string` | The correct option; must be a member of `options` |
| `explanation` | `string` | Why that's the answer — the teaching payload |
| `tags` | `string[]` | Optional, e.g. `["Lights", "Night"]` |

**`puzzles.ts`** — the curated `Puzzle[]` (~12–15 to start) + bound accessors `getAllPuzzles()`.

**`daily-core.ts`** — pure, unit-tested helpers:
- `dayNumber(isoDate: string, epochISO: string): number` — whole days from a fixed epoch date, computed in **UTC** (parse both as `YYYY-MM-DD` at UTC midnight, diff in ms / 86_400_000, floor). Avoids timezone drift.
- `puzzleForDay(puzzles: Puzzle[], n: number): Puzzle` — `puzzles[((n % len) + len) % len]` (safe modulo, handles n ≥ 0 in practice but guards negatives).

**`daily.ts`** — binds to the real dataset and a fixed `EPOCH = "2026-01-01"`:
- `puzzleNumber(date: Date): number` — `dayNumber(toISODate(date), EPOCH) + 1` (1-based, for display/sharing).
- `todaysPuzzle(date: Date): Puzzle` — `puzzleForDay(getAllPuzzles(), dayNumber(...))`.

### Route & components

- **`/explain`** (server component) — reads the server's current date, computes `todaysPuzzle` + `puzzleNumber`, renders `<PuzzleGame puzzle={...} puzzleNumber={n} />`. Page metadata set.
- **`PuzzleGame.tsx`** (client component):
  - Renders `prompt`, the image (plain `<img>`; on `onError` swaps to an alt-text placeholder, round still playable), and one button per `option`.
  - On click (single guess): locks the choice, marks correct/incorrect, reveals the `answer`, `explanation`, and `credit` link.
  - **Share** button copies a spoiler-free result to the clipboard, e.g. `Can You Explain It? #42 🛸 ✅` (✅ correct / ❌ wrong) plus the site URL.
  - Persists to `localStorage` under one key (e.g. `cyei:v1`): `{ lastNumber, lastResult: "win"|"loss", currentStreak, maxStreak }`. On mount, if `lastNumber === puzzleNumber`, render the already-completed state + "Come back tomorrow for puzzle #N+1".
- **`NavBar`** — add an "Explain" link.

### Images

Hotlinked from public-domain / CC sources with visible attribution per each license. No images are committed to the repo in v1. A failed image load degrades gracefully to alt text.

## Data flow

```
puzzles.ts (static Puzzle[])
   └─ daily-core.ts (pure date math + selection)
        └─ daily.ts (binds EPOCH + dataset)
             └─ /explain (server: today's date → puzzle + number)
                  └─ PuzzleGame (client: guess → reveal → share; streak in localStorage)
```

## Error handling

- Image fails to load → `onError` shows an alt-text placeholder; the round remains playable.
- Empty dataset (shouldn't happen; integrity test guards it) → friendly "No puzzle today" message.
- `localStorage` unavailable / corrupt JSON → treat as no prior state (wrap reads in try/catch); the game still works, just without streak memory.
- Date math uses UTC throughout so the puzzle rolls over consistently regardless of the visitor's timezone.

## Testing

- **`daily-core.test.ts`**: `dayNumber` returns 0 at epoch, 1 the next day, correct values across month and year boundaries; `puzzleForDay` wraps with modulo and is deterministic for a given n.
- **`puzzles.test.ts` (integrity)**: unique ids; kebab-case ids; every `answer` is contained in its `options`; each puzzle has ≥2 options and non-empty `explanation`; `imageUrl` and `credit.url` parse as valid `http(s)` URLs; `credit.label` non-empty.

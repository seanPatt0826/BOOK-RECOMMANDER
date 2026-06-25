# Star Rating Widget — Design

**Date:** 2026-06-25
**Status:** Approved
**Context:** ShelfMate (Next.js 16 / React 19 / TypeScript / Tailwind v4 "Reading Room"). Ratings already exist as a normalized `rating: number | null` (0–5) on `SearchResult`/`MediaDetail`, currently shown as plain `★ 4.2` text. This replaces that text with a real star widget. Read-only display only — no DB, no auth, no user input.

## Goal

A small, pure presentational `StarRating` primitive that renders a 0–5 rating as filled / half / empty stars, used on result cards and the title detail page in place of the existing `★ {rating}` text. Behavior-preserving everywhere `rating === null` (renders nothing, exactly as today).

## Non-goals (YAGNI)

- Interactivity / users setting their own rating
- Persisting ratings, rating counts, or histograms
- Animation
- Changing the rating scale or data sources

## Component

`src/components/ui/StarRating.tsx` — joins the existing `ui/` primitives.

**Props:**
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `rating` | `number` | — | 0–5 (clamped to `[0, outOf]`) |
| `outOf` | `number` | `5` | number of stars |
| `size` | `"sm" \| "md"` | `"sm"` | sm for cards, md for detail |
| `showValue` | `boolean` | `false` | render the numeric value beside the stars |
| `className` | `string` | `""` | passthrough |

**Rendering:**
- `outOf` stars, each **full / half / empty**. The fractional star is a half-filled star (a clipped amber overlay over an empty star).
- **Precision:** round to the nearest **half** star (4.2 → 4.0 → ★★★★☆; 4.3 → 4.5 → ★★★★½).
- **Colors (tokens, no raw hex):** filled = `text-accent` (amber); empty = `text-edge`.
- **Sizes:** `sm` = `h-3.5 w-3.5`, `md` = `h-5 w-5`.
- **Accessibility:** wrapper `role="img"` + `aria-label="Rated 4.3 out of 5"`; the star SVGs are `aria-hidden`. When `showValue`, the numeric text is shown visually (the aria-label already carries the value).

## Pure logic (unit-tested)

`starFill(rating: number, outOf?: number): ("full" | "half" | "empty")[]` in `src/components/ui/starFill.ts`:
- Clamp `rating` to `[0, outOf]`.
- Round to nearest 0.5.
- Return an `outOf`-length array: for index `i` (0-based), `full` if `i + 1 <= rounded`, `half` if `i + 0.5 === rounded - i ... ` → concretely: full while `rounded - i >= 1`, else `half` if `rounded - i === 0.5`, else `empty`.
- The component maps over this array; it owns no rating math.

**Cases to test:** `0` → all empty; `5` → all full; `4.2` → 4 full + 1 empty (rounds to 4.0); `4.3` → 4 full + 1 half (rounds to 4.5); `3.7` → 3 full + 1 half + ... (rounds to 3.5 → 3 full, 1 half, 1 empty); out-of-range `6` clamps to 5 (all full); negative clamps to 0 (all empty).

## Migration (the two existing `★ text` sites)

- **`src/components/ResultCard.tsx`** (the `★ {item.rating}` in the meta line): when `item.rating !== null`, render `<StarRating rating={item.rating} size="sm" />`; keep the `year` and `·` separator logic. When `rating === null`, unchanged (nothing).
- **`src/app/title/[type]/[id]/page.tsx`** (the `· ★ {detail.rating}`): when `detail.rating !== null`, render `<StarRating rating={detail.rating} size="md" showValue />` in the meta row; keep surrounding text. Null → unchanged.

## Testing

- `starFill.test.ts` — the cases above (pure, deterministic).
- `StarRating.test.tsx` — renders the right count of full/half/empty stars for a value; exposes the correct `aria-label`; `showValue` shows the number.
- Gate: `npm test && npm run lint && npm run build` all green.

## Error handling

- `rating` out of range → clamped (no overflow/negative stars).
- Callers gate on `rating !== null`; the component itself assumes a number (TypeScript-enforced).

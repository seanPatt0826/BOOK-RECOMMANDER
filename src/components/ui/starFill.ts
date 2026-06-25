export type StarState = "full" | "half" | "empty";

/**
 * Map a rating to a per-star fill array, rounding to the nearest half star and
 * clamping to [0, outOf]. e.g. starFill(4.3) -> 4 full + 1 half.
 */
export function starFill(rating: number, outOf = 5): StarState[] {
  const clamped = Math.max(0, Math.min(outOf, rating));
  const rounded = Math.round(clamped * 2) / 2;
  return Array.from({ length: outOf }, (_, i): StarState => {
    const remaining = rounded - i;
    if (remaining >= 1) return "full";
    if (remaining === 0.5) return "half";
    return "empty";
  });
}

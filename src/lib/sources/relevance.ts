import type { SearchResult } from "./types";

// Lightweight relevance scoring so search results actually match what was
// typed. External sources (Wikipedia, Open Library, Google Books) match very
// loosely — searching "dog man" otherwise returns "Dog Soldiers", "Red Dog",
// etc. We score each title against the query and drop the weak matches.

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/** 0–100: how well `title` matches `query`. Higher is better. */
export function scoreMatch(query: string, title: string): number {
  const q = norm(query);
  const t = norm(title);
  if (!q || !t) return 0;
  if (t === q) return 100; // exact
  if (t.startsWith(q)) return 90; // "Dune" → "Dune: Part Two"
  if (t.includes(q)) return 80; // query appears as a phrase

  const qTokens = q.split(" ");
  const tTokens = new Set(t.split(" "));
  const matched = qTokens.filter((tok) => tTokens.has(tok)).length;
  if (matched === qTokens.length) return 60; // all words present, any order
  return (matched / qTokens.length) * 50; // partial: 0–50
}

/**
 * Sort by relevance (best first) and drop weak matches. Never returns an empty
 * list when the input was non-empty: if too few clear the bar, keep the top
 * results anyway so the user still sees the closest matches.
 */
export function rankByRelevance(
  query: string,
  items: SearchResult[],
  min = 50,
): SearchResult[] {
  const scored = items
    .map((item) => ({ item, score: scoreMatch(query, item.title) }))
    .sort((a, b) => b.score - a.score);

  const strong = scored.filter((s) => s.score >= min);
  const chosen = strong.length >= 3 ? strong : scored.slice(0, 6);
  return chosen.map((s) => s.item);
}

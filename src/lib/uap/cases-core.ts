import type { UapCase } from "./types";

// Pure helpers over a passed-in array so they're trivial to unit-test with
// fixtures. cases.ts binds these to the real dataset (mirrors comments-core).

export function getCase(cases: UapCase[], slug: string): UapCase | null {
  return cases.find((c) => c.slug === slug) ?? null;
}

export function casesByTag(cases: UapCase[], tag: string): UapCase[] {
  return cases.filter((c) => c.tags.includes(tag));
}

export function allTags(cases: UapCase[]): string[] {
  const set = new Set<string>();
  for (const c of cases) for (const t of c.tags) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

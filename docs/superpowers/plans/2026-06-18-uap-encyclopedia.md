# UAP Encyclopedia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `/uap` Encyclopedia of famous UFO/UAP cases to the existing ShelfMate app — browse + detail, backed by a typed in-repo dataset, zero-AI and no DB.

**Architecture:** A self-contained `src/lib/uap/` domain (types + curated data + pure tested helpers) feeds two App Router server-component routes (`/uap` browse, `/uap/[slug]` detail) and two UI components (`CaseCard`, `CaseBrowser`) that reuse the existing Tailwind design tokens and `NavBar`/`Footer`.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, Tailwind v4, Vitest + Testing Library.

---

## File Structure

- Create `src/lib/uap/types.ts` — the `UapCase` type + `CaseSource` type.
- Create `src/lib/uap/cases-core.ts` — pure helpers over a passed-in array (`getCase`, `casesByTag`, `allTags`).
- Create `src/lib/uap/cases-core.test.ts` — unit tests for the helpers.
- Create `src/lib/uap/cases.ts` — the curated `UapCase[]` dataset + thin wrappers bound to it (`getAllCases`, etc.).
- Create `src/lib/uap/cases.test.ts` — data-integrity test over the real dataset.
- Create `src/components/CaseCard.tsx` — one case as a card (server-safe, no client hooks).
- Create `src/components/CaseBrowser.tsx` — client component: tag nav + filtered grid.
- Create `src/app/uap/page.tsx` — browse route.
- Create `src/app/uap/[slug]/page.tsx` — detail route.
- Modify `src/components/NavBar.tsx` — add the "UAP" nav link.

Helpers are split into `cases-core.ts` (pure, takes the array as an argument — easy to unit-test with fixtures) and `cases.ts` (binds them to the real dataset), mirroring the existing `comments-core.ts` / `comments.ts` split.

---

## Task 1: Types

**Files:**
- Create: `src/lib/uap/types.ts`

- [ ] **Step 1: Write the type module**

```typescript
// src/lib/uap/types.ts
export type CaseSource = {
  label: string;
  url: string;
};

export type UapCase = {
  slug: string;
  name: string;
  dateLabel: string;
  location: string;
  tags: string[];
  summary: string;
  reported: string;
  evidence: string;
  skepticalExplanations: string[];
  openQuestions: string[];
  sources: CaseSource[];
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/uap/types.ts
git commit -m "feat: UapCase types for the encyclopedia"
```

---

## Task 2: Pure helpers (TDD)

**Files:**
- Create: `src/lib/uap/cases-core.ts`
- Test: `src/lib/uap/cases-core.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/uap/cases-core.test.ts
import { describe, it, expect } from "vitest";
import { getCase, casesByTag, allTags } from "./cases-core";
import type { UapCase } from "./types";

const fixtures: UapCase[] = [
  {
    slug: "alpha",
    name: "Alpha Case",
    dateLabel: "1947",
    location: "Place A",
    tags: ["Military", "1940s"],
    summary: "s",
    reported: "r",
    evidence: "e",
    skepticalExplanations: ["x"],
    openQuestions: ["q"],
    sources: [{ label: "L", url: "https://example.com" }],
  },
  {
    slug: "beta",
    name: "Beta Case",
    dateLabel: "1997",
    location: "Place B",
    tags: ["Mass sighting", "1990s", "Military"],
    summary: "s",
    reported: "r",
    evidence: "e",
    skepticalExplanations: ["x"],
    openQuestions: ["q"],
    sources: [{ label: "L", url: "https://example.com" }],
  },
];

describe("getCase", () => {
  it("returns the matching case", () => {
    expect(getCase(fixtures, "beta")?.name).toBe("Beta Case");
  });
  it("returns null when no slug matches", () => {
    expect(getCase(fixtures, "missing")).toBeNull();
  });
});

describe("casesByTag", () => {
  it("returns every case carrying the tag", () => {
    expect(casesByTag(fixtures, "Military").map((c) => c.slug)).toEqual([
      "alpha",
      "beta",
    ]);
  });
  it("returns an empty array for an unknown tag", () => {
    expect(casesByTag(fixtures, "Nope")).toEqual([]);
  });
});

describe("allTags", () => {
  it("returns distinct tags sorted alphabetically", () => {
    expect(allTags(fixtures)).toEqual([
      "1940s",
      "1990s",
      "Mass sighting",
      "Military",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/uap/cases-core.test.ts`
Expected: FAIL — cannot resolve `./cases-core`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/uap/cases-core.ts
import type { UapCase } from "./types";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/uap/cases-core.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/uap/cases-core.ts src/lib/uap/cases-core.test.ts
git commit -m "feat: pure helpers for UAP cases"
```

---

## Task 3: Curated dataset + bound accessors

**Files:**
- Create: `src/lib/uap/cases.ts`
- Test: `src/lib/uap/cases.test.ts`

Author 10 cases. Each must present skeptic and proponent views fairly. Below is the full entry for `roswell` as the template; write the remaining 9 to the same shape and depth with real, well-known facts and a working citation each: `phoenix-lights`, `belgian-wave`, `rendlesham-forest`, `nimitz-tic-tac`, `kenneth-arnold`, `travis-walton`, `foo-fighters`, `hudson-valley`, `westall`.

- [ ] **Step 1: Write the data-integrity test first**

```typescript
// src/lib/uap/cases.test.ts
import { describe, it, expect } from "vitest";
import { getAllCases } from "./cases";

describe("UAP dataset integrity", () => {
  const cases = getAllCases();

  it("has at least 10 cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(10);
  });

  it("has unique slugs", () => {
    const slugs = cases.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses kebab-case slugs", () => {
    for (const c of cases) {
      expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("fills every required prose field", () => {
    for (const c of cases) {
      expect(c.name.trim()).not.toBe("");
      expect(c.dateLabel.trim()).not.toBe("");
      expect(c.location.trim()).not.toBe("");
      expect(c.summary.trim()).not.toBe("");
      expect(c.reported.trim()).not.toBe("");
      expect(c.evidence.trim()).not.toBe("");
    }
  });

  it("has at least one tag, skeptical explanation, open question, and source each", () => {
    for (const c of cases) {
      expect(c.tags.length).toBeGreaterThan(0);
      expect(c.skepticalExplanations.length).toBeGreaterThan(0);
      expect(c.openQuestions.length).toBeGreaterThan(0);
      expect(c.sources.length).toBeGreaterThan(0);
    }
  });

  it("has well-formed source URLs", () => {
    for (const c of cases) {
      for (const s of c.sources) {
        expect(s.label.trim()).not.toBe("");
        expect(() => new URL(s.url)).not.toThrow();
        expect(s.url).toMatch(/^https?:\/\//);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/uap/cases.test.ts`
Expected: FAIL — cannot resolve `./cases`.

- [ ] **Step 3: Write the dataset and bound accessors**

```typescript
// src/lib/uap/cases.ts
import type { UapCase } from "./types";
import {
  getCase as getCaseCore,
  casesByTag as casesByTagCore,
  allTags as allTagsCore,
} from "./cases-core";

const CASES: UapCase[] = [
  {
    slug: "roswell",
    name: "The Roswell Incident",
    dateLabel: "July 1947",
    location: "Roswell, New Mexico, USA",
    tags: ["Crash retrieval", "Military", "1940s", "USA"],
    summary:
      "Debris recovered on a ranch sparked a 'flying disc' headline, a fast military retraction, and decades of controversy.",
    reported:
      "In early July 1947, rancher Mac Brazel found scattered debris — foil-like material, sticks, and rubber — on the Foster ranch. The Roswell Army Air Field issued a press release announcing the capture of a 'flying disc', which made front-page news before higher command retracted it within a day, saying the debris was a weather balloon.",
    evidence:
      "Photographs of recovered foil and balsa-like debris in General Ramey's office; the original and retraction press releases; and decades-later witness testimony. No physical material from the site has been independently verified as non-terrestrial.",
    skepticalExplanations: [
      "The U.S. Air Force's 1994-1997 reports attribute the debris to Project Mogul, a then-classified high-altitude balloon array used to detect Soviet nuclear tests.",
      "Later 'bodies' accounts are explained as conflated memories of crash-test dummies dropped in the 1950s and of injured airmen from separate accidents.",
    ],
    openQuestions: [
      "Why did a trained airfield announce a 'flying disc' at all if the debris was a familiar balloon?",
      "How much of the later testimony is genuine memory versus decades of media reinforcement?",
    ],
    sources: [
      {
        label: "U.S. GAO report on Roswell records (1995)",
        url: "https://www.gao.gov/products/nsiad-95-187",
      },
      {
        label: "Encyclopaedia Britannica — Roswell incident",
        url: "https://www.britannica.com/event/Roswell-incident",
      },
    ],
  },
  // TODO(author): add phoenix-lights, belgian-wave, rendlesham-forest,
  // nimitz-tic-tac, kenneth-arnold, travis-walton, foo-fighters,
  // hudson-valley, westall — same shape and depth as roswell above.
];

export function getAllCases(): UapCase[] {
  return CASES;
}

export function getCase(slug: string): UapCase | null {
  return getCaseCore(CASES, slug);
}

export function casesByTag(tag: string): UapCase[] {
  return casesByTagCore(CASES, tag);
}

export function allTags(): string[] {
  return allTagsCore(CASES);
}
```

> **Note for the implementer:** The `TODO(author)` comment marks where the remaining 9 cases go. The task is NOT complete until all 10 are present and `cases.test.ts` passes (the `>= 10` assertion enforces this). Write each case with real facts, fair skeptic + proponent framing, and at least one working `https://` citation (prefer GAO, Britannica, official military reports, or major outlets). Do not ship the TODO comment.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/uap/cases.test.ts`
Expected: PASS once all 10 cases are written.

- [ ] **Step 5: Commit**

```bash
git add src/lib/uap/cases.ts src/lib/uap/cases.test.ts
git commit -m "feat: curated UAP case dataset with integrity tests"
```

---

## Task 4: CaseCard component

**Files:**
- Create: `src/components/CaseCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/CaseCard.tsx
import Link from "next/link";
import type { UapCase } from "@/lib/uap/types";

export default function CaseCard({ uapCase }: { uapCase: UapCase }) {
  return (
    <Link
      href={`/uap/${encodeURIComponent(uapCase.slug)}`}
      className="card group flex flex-col gap-2 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-ink transition group-hover:text-accent">
          {uapCase.name}
        </h3>
        <span className="flex-shrink-0 text-xs text-muted">
          {uapCase.dateLabel}
        </span>
      </div>
      <p className="text-xs text-accent">{uapCase.location}</p>
      <p className="text-sm leading-relaxed text-ink/80">{uapCase.summary}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {uapCase.tags.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/CaseCard.tsx
git commit -m "feat: CaseCard component"
```

---

## Task 5: CaseBrowser component (client filter)

**Files:**
- Create: `src/components/CaseBrowser.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/CaseBrowser.tsx
"use client";

import { useState } from "react";
import CaseCard from "@/components/CaseCard";
import type { UapCase } from "@/lib/uap/types";

// Cases grid on the left; a sticky tag nav on the right filters it instantly,
// with no reload. "All cases" shows everything. Mirrors GenreBrowser.
export default function CaseBrowser({
  cases,
  tags,
}: {
  cases: UapCase[];
  tags: string[];
}) {
  const [active, setActive] = useState<string>("all");

  const visible =
    active === "all" ? cases : cases.filter((c) => c.tags.includes(active));

  const navItem = (selected: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
      selected
        ? "bg-accent text-accent-contrast shadow-[var(--shadow-sm)]"
        : "text-ink/75 hover:bg-surface-2 hover:text-accent"
    }`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
      <div className="min-w-0">
        {visible.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((c) => (
              <CaseCard key={c.slug} uapCase={c} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No cases match this filter yet.</p>
        )}
      </div>

      <aside>
        <div className="lg:sticky lg:top-20">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-violet" />
            <h2 className="text-lg font-semibold">Filter by tag</h2>
          </div>
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActive("all")}
              className={navItem(active === "all")}
            >
              <span>All cases</span>
              <span className="text-xs opacity-70">{cases.length}</span>
            </button>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                className={navItem(active === t)}
              >
                <span className="truncate">{t}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/CaseBrowser.tsx
git commit -m "feat: CaseBrowser client filter component"
```

---

## Task 6: Browse route `/uap`

**Files:**
- Create: `src/app/uap/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/app/uap/page.tsx
import { getAllCases, allTags } from "@/lib/uap/cases";
import CaseBrowser from "@/components/CaseBrowser";

export const metadata = {
  title: "UAP Encyclopedia · ShelfMate",
  description:
    "Famous UFO/UAP cases — what was reported, the evidence, skeptical explanations, and what stays unresolved.",
};

export default function UapPage() {
  const cases = getAllCases();
  const tags = allTags();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-accent" />
          <h1 className="text-3xl font-semibold">UAP Encyclopedia</h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Famous UFO and UAP cases, presented with multiple viewpoints: what was
          reported, the available evidence, the skeptical explanations, and the
          questions that remain open.
        </p>
      </header>

      <CaseBrowser cases={cases} tags={tags} />
    </main>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`, open `http://localhost:3000/uap`
Expected: header + a grid of case cards + a tag filter nav; clicking a tag filters instantly.

- [ ] **Step 3: Commit**

```bash
git add src/app/uap/page.tsx
git commit -m "feat: /uap browse route"
```

---

## Task 7: Detail route `/uap/[slug]`

**Files:**
- Create: `src/app/uap/[slug]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/app/uap/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getCase } from "@/lib/uap/cases";

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uapCase = getCase(slug);
  if (!uapCase) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold">{uapCase.name}</h1>
        <p className="mt-1 text-sm text-accent">
          {uapCase.dateLabel} · {uapCase.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {uapCase.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      </header>

      <Section title="What was reported">
        <p className="text-sm leading-relaxed text-ink/90">
          {uapCase.reported}
        </p>
      </Section>

      <Section title="Available evidence">
        <p className="text-sm leading-relaxed text-ink/90">
          {uapCase.evidence}
        </p>
      </Section>

      <Section title="Skeptical explanations">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/90">
          {uapCase.skepticalExplanations.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title="Open questions">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/90">
          {uapCase.openQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </Section>

      <Section title="Sources">
        <ul className="space-y-2 text-sm">
          {uapCase.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-2 hover:underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-accent" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: with `npm run dev` up, open `http://localhost:3000/uap/roswell` (real case) and `http://localhost:3000/uap/nope` (should 404).
Expected: real slug shows the four sections + sources; unknown slug renders the app's not-found page.

- [ ] **Step 3: Commit**

```bash
git add "src/app/uap/[slug]/page.tsx"
git commit -m "feat: /uap/[slug] case detail route"
```

---

## Task 8: NavBar link

**Files:**
- Modify: `src/components/NavBar.tsx:27-30`

- [ ] **Step 1: Add the UAP link to the nav array**

In the link array, add the UAP entry:

```tsx
          {[
            { href: "/search", label: "Search" },
            { href: "/uap", label: "UAP" },
            { href: "/community", label: "Community" },
          ].map((link) => (
```

- [ ] **Step 2: Verify it renders**

Run: with `npm run dev` up, load any page.
Expected: a "UAP" link sits between "Search" and "Community" and navigates to `/uap`.

- [ ] **Step 3: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat: link UAP Encyclopedia from the nav"
```

---

## Task 9: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS — including the new `cases-core.test.ts` and `cases.test.ts`.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; `/uap` and `/uap/[slug]` appear in the route output.

---

## Self-Review notes

- **Spec coverage:** types (T1), helpers (T2), dataset + integrity test (T3), CaseCard (T4), CaseBrowser w/ empty-state (T5), browse route (T6), detail route w/ four sections + sources + notFound (T7), NavBar link (T8), verification (T9). All design sections map to a task.
- **Type consistency:** `UapCase`/`CaseSource` field names are identical across every task; helper names (`getCase`, `casesByTag`, `allTags`, `getAllCases`) match between `cases-core.ts`, `cases.ts`, and their callers.
- **No DB/auth/network** anywhere — consistent with the read-only, zero-AI scope.

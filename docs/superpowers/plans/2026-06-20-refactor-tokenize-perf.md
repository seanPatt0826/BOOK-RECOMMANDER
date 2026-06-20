# Refactor / Tokenize / Perf Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behavior-preserving cleanup of the ShelfMate codebase — fix two React bug/perf smells, add semantic design tokens, extract typed UI primitives to replace ~30 inline call sites, deduplicate two `src/lib` logic blocks, and apply a small targeted performance pass.

**Architecture:** Five sequenced stages, each kept green by the gate `npm test && npm run lint && npm run build`. Stage 1 fixes lint/perf bugs. Stage 2 extends design tokens in `globals.css`. Stage 3 builds typed React primitives in `src/components/ui/` that consume those tokens, then migrates inline markup to them one primitive at a time. Stage 4 extracts two pure/near-pure logic helpers under `src/lib/`. Stage 5 adds image lazy-loading + targeted `React.memo`.

**Tech Stack:** Next.js 16.2.6 (App Router, RSC), React 19.2.4, TypeScript 5, Tailwind v4 (CSS-first `@theme inline`), Vitest 4.1.6 + @testing-library/react (jsdom, globals on, `@`→`src` alias).

## Global Constraints

- **Behavior-preserving.** No feature changes; no visual change a user would notice except the two Stage-1 bug fixes. Migrated sites must render the same element/appearance.
- **Verification gate after every task:** `npm test && npm run lint && npm run build` — all must pass before commit. Baseline at plan start: 53 tests passing, 2 lint errors (the two Stage-1 bugs), build green.
- **Tokens only, no raw hex** in new primitives. `Card`/`Chip` wrap the existing `.card`/`.chip` CSS classes; do not delete working CSS.
- **Tests:** component render tests use Testing Library role queries + plain `expect` (no jest-dom — there is no setup file). New `src/lib` logic is TDD: write the failing test first.
- **Commit** at the end of each task with the message shown.
- **Primitives live in `src/components/ui/`.** Each file has one default export and one responsibility.

---

## Stage 1 — Fix the bugs (correctness + perf)

### Task 1: Fix ThemeToggle setState-in-effect

**Files:**
- Modify: `src/components/ThemeToggle.tsx`

**Interfaces:**
- Produces: no API change — still a default-exported `ThemeToggle` client component.

The effect at line 10–13 synchronously calls `setDark(...)` + `setMounted(true)` on mount, which lint flags (`react-hooks/set-state-in-effect`) and causes a cascading render. Fix: lazy-initialize both state values from the DOM (the no-flash script in `layout.tsx` has already applied the `.dark` class before hydration), guarded for SSR. No effect needed.

- [ ] **Step 1: Replace the state init + effect**

Replace lines 3–13:

```tsx
import { useState } from "react";

export default function ThemeToggle() {
  // The no-flash script in layout.tsx applies `.dark` before hydration, so the
  // DOM is the source of truth. Read it once at mount via lazy initial state —
  // no effect, no cascading render. SSR has no `document`, so default to light.
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark"),
  );
  const [mounted, setMounted] = useState(() => typeof document !== "undefined");
```

Leave `toggle()` and the JSX below unchanged.

- [ ] **Step 2: Run lint to verify the error is gone**

Run: `npm run lint`
Expected: no `ThemeToggle.tsx` error (only the `HomeBackground.tsx` error remains for now).

- [ ] **Step 3: Run the build + tests**

Run: `npm test && npm run build`
Expected: 53 tests pass; build succeeds.

- [ ] **Step 4: Manually verify in the dev server**

With `npm run dev` running, load `/`, click the theme toggle: it flips light↔dark, the icon swaps, and a reload preserves the choice. No console hydration warning.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "fix: lazy-init ThemeToggle state to avoid setState-in-effect"
```

---

### Task 2: Fix HomeBackground setState-in-effect

**Files:**
- Modify: `src/components/HomeBackground.tsx`

**Interfaces:**
- Produces: no API change — still a default-exported `HomeBackground` client component.

The effect at line 75–85 calls `setMounted(true)` then reads localStorage and `setMode(...)`. Lazy-initialize `mode` from localStorage and `mounted` from environment; drop the effect.

- [ ] **Step 1: Add a safe reader + lazy init, remove the effect**

Replace the imports line 3 and the component head (lines 71–85):

```tsx
import { useState } from "react";
import { createPortal } from "react-dom";
```

```tsx
// Read the saved scene once, safely (SSR / blocked storage → "calm").
function readSavedMode(): Mode {
  if (typeof window === "undefined") return "calm";
  try {
    const saved = localStorage.getItem("shelf-bg");
    if (saved === "calm" || saved === "nature" || saved === "gradient") {
      return saved;
    }
  } catch {
    // Storage blocked — fall through to the calm default.
  }
  return "calm";
}

export default function HomeBackground() {
  const [mode, setMode] = useState<Mode>(readSavedMode);
  const [mounted, setMounted] = useState(() => typeof window !== "undefined");
```

Leave `choose()`, `scene`, and the returned JSX unchanged.

- [ ] **Step 2: Run lint to verify it is clean**

Run: `npm run lint`
Expected: `✔` no problems (both Stage-1 errors now gone).

- [ ] **Step 3: Run the build + tests**

Run: `npm test && npm run build`
Expected: 53 tests pass; build succeeds.

- [ ] **Step 4: Manually verify in the dev server**

Load `/`, change the Background selector (Calm/Nature/Gradient): the scene cross-fades, the portaled leaves/grass appear for Nature, and a reload preserves the choice. No console hydration warning.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomeBackground.tsx
git commit -m "fix: lazy-init HomeBackground state to avoid setState-in-effect"
```

---

## Stage 2 — Design tokens

### Task 3: Add status tokens and migrate login status colors

**Files:**
- Modify: `src/app/globals.css` (`:root` ~9–31, `.dark` ~33–52, `@theme inline` ~55–71)
- Modify: `src/app/login/page.tsx:98-108`

**Interfaces:**
- Produces: Tailwind utilities `text-success`, `bg-success`, `text-danger`, `bg-danger`, `text-success-contrast`, `text-danger-contrast`.

- [ ] **Step 1: Add status vars to `:root`**

After the `--accent-contrast: #fff8ef;` line in `:root`, add:

```css
  /* Semantic status colors (form errors / confirmations). */
  --success: #2f7d32;
  --success-contrast: #f3fbf3;
  --danger: #c0392b;
  --danger-contrast: #fff5f4;
```

- [ ] **Step 2: Add status vars to `.dark`**

After the `--accent-contrast: #1a150c;` line in `.dark`, add:

```css
  --success: #7fd089;
  --success-contrast: #0e1a0f;
  --danger: #f08a7f;
  --danger-contrast: #1a0f0e;
```

- [ ] **Step 3: Expose them as Tailwind colors in `@theme inline`**

After the `--color-accent-contrast: var(--accent-contrast);` line, add:

```css
  --color-success: var(--success);
  --color-success-contrast: var(--success-contrast);
  --color-danger: var(--danger);
  --color-danger-contrast: var(--danger-contrast);
```

- [ ] **Step 4: Migrate the login message colors**

In `src/app/login/page.tsx`, replace the message `<p>` className expression (lines 100–104):

```tsx
            className={`mt-4 text-sm ${
              isError ? "text-danger" : "text-success"
            }`}
```

- [ ] **Step 5: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: on `/login`, submit a bad login → red error text; create-account success → green text, in both light and dark mode.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/login/page.tsx
git commit -m "feat: add semantic status tokens; use them for login messages"
```

---

### Task 4: Apply the dead `.glass` class

**Files:**
- Modify: `src/components/NavBar.tsx:13` (already uses `glass` — verify) and `src/components/Carousel.tsx`

**Interfaces:**
- Consumes: the `.glass` CSS class defined in `globals.css:124-128`.

`.glass` is defined but the frosted look is hand-inlined in some places. `NavBar.tsx:13` already uses `glass` — confirm and leave it. The Carousel scroll buttons inline `bg-surface/…  backdrop-blur`; fold them onto `.glass`.

- [ ] **Step 1: Read Carousel's scroll buttons**

Run: open `src/components/Carousel.tsx`; find the two scroll-button elements (≈ lines 28 and 60) using `rounded-full border border-edge bg-surface/… backdrop-blur`.

- [ ] **Step 2: Replace inline frosted styling with `.glass`**

For each of the two scroll buttons, remove the `bg-surface/NN backdrop-blur` utilities from the className and add `glass`, keeping `rounded-full border border-edge` and any sizing/position utilities. Example:

```tsx
className="glass absolute … rounded-full border border-edge … "
```

(Keep every non-frosted utility — only the background+blur pair is replaced by `glass`.)

- [ ] **Step 3: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: on `/`, the carousel left/right scroll buttons still show a frosted translucent background and work, in light + dark.

- [ ] **Step 4: Commit**

```bash
git add src/components/Carousel.tsx
git commit -m "refactor: use the .glass class for carousel scroll buttons"
```

---

## Stage 3 — UI primitives

### Task 5: `Button` primitive (TDD)

**Files:**
- Create: `src/components/ui/Button.tsx`
- Test: `src/components/ui/Button.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type ButtonVariant = "primary" | "secondary" | "ghost";
  type ButtonSize = "sm" | "md" | "lg";
  type ButtonShape = "pill" | "rounded" | "xl";
  // When `href` is set, renders a Next <Link> (internal) / <a>; otherwise a <button>.
  function Button(props): JSX.Element  // default export
  ```
  Variant→class, size→class, shape→class maps below are the contract other tasks rely on.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Button.test.tsx
import { render } from "@testing-library/react";
import Button from "./Button";

describe("Button", () => {
  it("renders a <button> by default with the primary variant classes", () => {
    const { getByRole } = render(<Button>Save</Button>);
    const el = getByRole("button", { name: "Save" });
    expect(el.tagName).toBe("BUTTON");
    expect(el.className).toContain("bg-accent");
  });

  it("renders an anchor when href is set", () => {
    const { getByRole } = render(<Button href="/search">Go</Button>);
    const el = getByRole("link", { name: "Go" });
    expect(el.tagName).toBe("A");
    expect(el.getAttribute("href")).toBe("/search");
  });

  it("merges a passthrough className and keeps the button type", () => {
    const { getByRole } = render(
      <Button className="w-full" type="submit">Log in</Button>,
    );
    const el = getByRole("button", { name: "Log in" });
    expect(el.className).toContain("w-full");
    expect(el.getAttribute("type")).toBe("submit");
  });

  it("applies the secondary variant classes", () => {
    const { getByRole } = render(<Button variant="secondary">X</Button>);
    expect(getByRole("button", { name: "X" }).className).toContain("border-edge");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/ui/Button.test.tsx`
Expected: FAIL — cannot find `./Button`.

- [ ] **Step 3: Implement `Button`**

```tsx
// src/components/ui/Button.tsx
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";
type ButtonShape = "pill" | "rounded" | "xl";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-contrast hover:bg-accent-strong",
  secondary:
    "border border-edge text-ink hover:border-accent hover:text-accent",
  ghost: "text-ink/80 hover:text-accent hover:bg-surface-2",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

const SHAPE: Record<ButtonShape, string> = {
  pill: "rounded-full",
  rounded: "rounded-lg",
  xl: "rounded-xl",
};

const BASE =
  "inline-flex items-center justify-center font-semibold transition disabled:opacity-50";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children" | "href"> & {
    href: string;
  };

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "primary",
    size = "md",
    shape = "rounded",
    className = "",
    children,
    ...rest
  } = props;
  const cls = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${SHAPE[shape]} ${className}`.trim();

  if ("href" in props && props.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }
  const { type = "button", ...btnRest } = rest as ButtonAsButton;
  return (
    <button type={type} className={cls} {...btnRest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/Button.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify gate**

Run: `npm test && npm run lint && npm run build`
Expected: all pass (54+ tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx
git commit -m "feat: add typed Button primitive (variant/size/shape, polymorphic)"
```

---

### Task 6: Migrate action buttons to `Button`

**Files:**
- Modify: `src/app/page.tsx:49-60`, `src/components/NavBar.tsx:46-61`, `src/app/login/page.tsx:83-95`, `src/components/CommentForm.tsx:37-43`, `src/components/SaveButton.tsx:30-42`, `src/components/BigSearchBar.tsx:35-40`, `src/app/not-found.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/Button` (variant/size/shape from Task 5).

Migrate one file per step; keep the exact look via the variant/size/shape maps. Run the gate once at the end.

- [ ] **Step 1: Home hero CTAs (`page.tsx`)**

Replace the two `<a>` (lines 49–60) with:

```tsx
              <Button href="/search" variant="primary" size="lg" shape="pill"
                className="shadow-[var(--shadow-md)] hover:-translate-y-0.5">
                Start exploring
              </Button>
              <Button href="/community" variant="secondary" size="lg" shape="pill"
                className="bg-surface/60">
                Visit the community
              </Button>
```

Add `import Button from "@/components/ui/Button";` at the top.

- [ ] **Step 2: NavBar sign-in / sign-out**

Replace the sign-out `<button>` (lines 47–52) and the sign-in `<Link>` (lines 55–60):

```tsx
              <Button type="submit" variant="secondary" size="sm" shape="pill"
                className="text-muted">
                Sign out
              </Button>
```
```tsx
            <Button href="/login" variant="primary" size="sm" shape="pill"
              className="shadow-[var(--shadow-sm)] hover:-translate-y-0.5">
              Sign in
            </Button>
```

Add the import; remove the now-unused `Link` import only if nothing else uses it (the logo + nav links still use `Link`, so keep it).

- [ ] **Step 3: Login form buttons**

Replace the two buttons (lines 83–95):

```tsx
          <Button type="submit" variant="primary" className="w-full">Log in</Button>
          <Button type="button" onClick={handleSignUp} variant="secondary"
            className="w-full border-accent text-accent hover:bg-surface-2">
            Create account
          </Button>
```

Add the import.

- [ ] **Step 4: CommentForm submit**

Replace the submit `<button>` (lines 37–43):

```tsx
      <Button type="submit" variant="primary" size="md" shape="rounded"
        disabled={pending || body.trim().length === 0} className="mt-2 py-1.5">
        {pending ? "Posting…" : submitLabel}
      </Button>
```

Add the import.

- [ ] **Step 5: SaveButton (conditional variant)**

Replace the `<button>` (lines 30–42):

```tsx
    <Button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      variant={saved ? "primary" : "secondary"}
      className={`mt-6 ${saved ? "" : "text-ink/80"} ${pending ? "opacity-60" : ""}`}
    >
      {saved ? "✓ Saved" : "Save to my list"}
    </Button>
```

Add the import.

- [ ] **Step 6: BigSearchBar submit**

Replace the submit `<button>` (lines 35–40):

```tsx
      <Button type="submit" variant="primary" shape="xl"
        className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3">
        Search
      </Button>
```

Add the import.

- [ ] **Step 7: not-found "Go home"**

Open `src/app/not-found.tsx`; replace its home link/button with a `<Button href="/" variant="primary" shape="pill">Go home</Button>` (match the existing label), add the import, drop any now-unused inline classes.

- [ ] **Step 8: Verify gate + visual sweep**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual (light + dark): `/` hero CTAs; NavBar sign-in (logged out) and sign-out (logged in); `/login` both buttons; a `/title/...` Save button toggles; `/community` post button; `/search` Search button; a 404 route's Go-home button. Each looks and behaves as before.

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx src/components/NavBar.tsx src/app/login/page.tsx src/components/CommentForm.tsx src/components/SaveButton.tsx src/components/BigSearchBar.tsx src/app/not-found.tsx
git commit -m "refactor: migrate action buttons to the Button primitive"
```

---

### Task 7: `Card` primitive + migrate cards

**Files:**
- Create: `src/components/ui/Card.tsx`
- Modify: `src/components/ResultCard.tsx:5-9`, `src/components/CaseCard.tsx:5-9`

**Interfaces:**
- Produces:
  ```ts
  // Polymorphic container backing the .card CSS class.
  function Card<T>(props: { as?; className?; children; ...rest }): JSX.Element
  ```

- [ ] **Step 1: Implement `Card`**

```tsx
// src/components/ui/Card.tsx
import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

type CardProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export default function Card<T extends ElementType = "div">({
  as,
  className = "",
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={`card ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 2: Migrate `ResultCard`**

Replace the `<Link … className="card group block overflow-hidden">` wrapper (lines 6–9) with `Card` rendered as a Next `Link`:

```tsx
import Link from "next/link";
import Card from "@/components/ui/Card";
import type { SearchResult } from "@/lib/sources/types";

export default function ResultCard({ item }: { item: SearchResult }) {
  return (
    <Card
      as={Link}
      href={`/title/${item.type}/${encodeURIComponent(item.id)}`}
      className="group block overflow-hidden"
    >
```

Close with `</Card>` instead of `</Link>` at the end. Leave the inner markup unchanged.

- [ ] **Step 3: Migrate `CaseCard`**

Same shape — replace the wrapper (lines 6–9):

```tsx
import Link from "next/link";
import Card from "@/components/ui/Card";
import type { UapCase } from "@/lib/uap/types";

export default function CaseCard({ uapCase }: { uapCase: UapCase }) {
  return (
    <Card
      as={Link}
      href={`/uap/${encodeURIComponent(uapCase.slug)}`}
      className="group flex flex-col gap-2 p-4"
    >
```

Close with `</Card>`. Leave inner markup unchanged.

- [ ] **Step 4: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: `/search?q=dune` result cards and `/uap` case cards still have the floating card look, hover lift, and link to detail pages.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ResultCard.tsx src/components/CaseCard.tsx
git commit -m "feat: add Card primitive; migrate ResultCard and CaseCard"
```

---

### Task 8: `SectionHeader` primitive + migrate

**Files:**
- Create: `src/components/ui/SectionHeader.tsx`
- Modify: `src/app/page.tsx:81-84`, `src/components/GenreBrowser.tsx:37-40` and `59-62`, `src/components/CaseBrowser.tsx:44-47`

**Interfaces:**
- Produces:
  ```ts
  function SectionHeader(props: {
    children: ReactNode;          // the heading text
    accent?: "accent" | "violet" | "rose";  // the bar color, default "accent"
    as?: "h2" | "h3";             // default "h2"
    className?: string;
  }): JSX.Element
  ```

The repeated pattern is `<span className="h-5 w-1 rounded-full bg-COLOR" /> + <h2 className="text-2xl font-semibold">…</h2>` inside a `mb-* flex items-center gap-3` row.

- [ ] **Step 1: Implement `SectionHeader`**

```tsx
// src/components/ui/SectionHeader.tsx
import type { ReactNode } from "react";

const BAR: Record<"accent" | "violet" | "rose", string> = {
  accent: "bg-accent",
  violet: "bg-violet",
  rose: "bg-rose",
};

export default function SectionHeader({
  children,
  accent = "accent",
  as: Tag = "h2",
  className = "",
}: {
  children: ReactNode;
  accent?: "accent" | "violet" | "rose";
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <span className={`h-5 w-1 rounded-full ${BAR[accent]}`} />
      <Tag className="text-2xl font-semibold">{children}</Tag>
    </div>
  );
}
```

- [ ] **Step 2: Migrate `page.tsx` "Your shelf"**

Replace lines 81–84:

```tsx
        <SectionHeader accent="rose" className="mb-5">Your shelf</SectionHeader>
```
Add `import SectionHeader from "@/components/ui/SectionHeader";`.

- [ ] **Step 3: Migrate `GenreBrowser` "Discover" + "Browse by genre"**

Replace the Discover header (lines 37–40):

```tsx
            <SectionHeader accent="accent" className="mb-3">Discover</SectionHeader>
```

Replace the side-nav header (lines 59–62):

```tsx
          <SectionHeader accent="violet" className="mb-4">Browse by genre</SectionHeader>
```

(The side-nav heading text was `text-lg`; using `SectionHeader` standardizes the two headings — acceptable since both are section headers; if the smaller size must be preserved, pass `className="mb-4 [&>h2]:text-lg"`. Default to standardized `text-2xl` unless the visual sweep flags it.) Add the import.

- [ ] **Step 4: Migrate `CaseBrowser` "Filter by tag"**

Replace lines 44–47:

```tsx
          <SectionHeader accent="violet" className="mb-4">Filter by tag</SectionHeader>
```
Add the import.

- [ ] **Step 5: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: `/` "Your shelf" (rose bar), `/` genre area "Discover" (accent) + "Browse by genre" (violet), `/uap` "Filter by tag" (violet) all show the colored bar + heading as before.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/SectionHeader.tsx src/app/page.tsx src/components/GenreBrowser.tsx src/components/CaseBrowser.tsx
git commit -m "feat: add SectionHeader primitive; migrate section headers"
```

---

### Task 9: `NavItem` primitive (TDD) + migrate the two browsers

**Files:**
- Create: `src/components/ui/NavItem.tsx`
- Test: `src/components/ui/NavItem.test.tsx`
- Modify: `src/components/GenreBrowser.tsx:24-29,64-81`, `src/components/CaseBrowser.tsx:21-26,49-66`

**Interfaces:**
- Produces:
  ```ts
  function NavItem(props: {
    selected: boolean;
    onClick: () => void;
    label: string;
    count?: number | string;   // optional right-aligned count
    truncate?: boolean;        // truncate the label, default false
  }): JSX.Element
  ```
  Replaces the identical `navItem(selected)` class helper duplicated in both browsers.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/NavItem.test.tsx
import { render, fireEvent } from "@testing-library/react";
import NavItem from "./NavItem";

describe("NavItem", () => {
  it("shows selected styling when selected", () => {
    const { getByRole } = render(
      <NavItem selected onClick={() => {}} label="All" />,
    );
    expect(getByRole("button", { name: /All/ }).className).toContain("bg-accent");
  });

  it("shows muted styling when not selected", () => {
    const { getByRole } = render(
      <NavItem selected={false} onClick={() => {}} label="All" />,
    );
    const cls = getByRole("button", { name: /All/ }).className;
    expect(cls).not.toContain("bg-accent");
    expect(cls).toContain("text-ink/75");
  });

  it("fires onClick and renders the count", () => {
    let clicked = 0;
    const { getByRole, getByText } = render(
      <NavItem selected={false} onClick={() => (clicked += 1)} label="Sci-Fi" count={7} />,
    );
    fireEvent.click(getByRole("button", { name: /Sci-Fi/ }));
    expect(clicked).toBe(1);
    expect(getByText("7")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/ui/NavItem.test.tsx`
Expected: FAIL — cannot find `./NavItem`.

- [ ] **Step 3: Implement `NavItem`**

```tsx
// src/components/ui/NavItem.tsx
export default function NavItem({
  selected,
  onClick,
  label,
  count,
  truncate = false,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count?: number | string;
  truncate?: boolean;
}) {
  const cls = `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
    selected
      ? "bg-accent text-accent-contrast shadow-[var(--shadow-sm)]"
      : "text-ink/75 hover:bg-surface-2 hover:text-accent"
  }`;
  return (
    <button type="button" onClick={onClick} className={cls}>
      <span className={truncate ? "truncate" : undefined}>{label}</span>
      {count !== undefined && (
        <span className="text-xs opacity-70">{count}</span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/NavItem.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Migrate `GenreBrowser`**

Remove the `navItem` helper (lines 24–29). Replace the `<nav>` body (lines 63–82):

```tsx
          <nav className="flex flex-col gap-1">
            <NavItem selected={active === "all"} onClick={() => setActive("all")} label="All genres" />
            {shelves.map((s) => (
              <NavItem
                key={s.subject}
                selected={active === s.subject}
                onClick={() => setActive(s.subject)}
                label={s.label}
                count={s.items.length}
                truncate
              />
            ))}
          </nav>
```
Add `import NavItem from "@/components/ui/NavItem";`.

- [ ] **Step 6: Migrate `CaseBrowser`**

Remove the `navItem` helper (lines 21–26). Replace the `<nav>` body (lines 48–67):

```tsx
          <nav className="flex flex-col gap-1">
            <NavItem selected={active === "all"} onClick={() => setActive("all")} label="All cases" count={cases.length} />
            {tags.map((t) => (
              <NavItem
                key={t}
                selected={active === t}
                onClick={() => setActive(t)}
                label={t}
                truncate
              />
            ))}
          </nav>
```
Add the import.

- [ ] **Step 7: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: `/` genre side-nav and `/uap` tag side-nav — selecting an item highlights it (accent), others stay muted, counts show, filtering still works instantly.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/NavItem.tsx src/components/ui/NavItem.test.tsx src/components/GenreBrowser.tsx src/components/CaseBrowser.tsx
git commit -m "feat: add NavItem primitive; dedupe Genre/Case browser nav"
```

---

### Task 10: `Chip` primitive + migrate

**Files:**
- Create: `src/components/ui/Chip.tsx`
- Modify: `src/components/CaseCard.tsx:20-26`, `src/app/uap/[slug]/page.tsx` (tag chips), `src/components/GenreBrowser.tsx:49`, `src/app/page.tsx:35-38`

**Interfaces:**
- Produces:
  ```ts
  function Chip(props: { children: ReactNode; className?: string }): JSX.Element
  // Renders <span class="chip {className}">.
  ```

- [ ] **Step 1: Implement `Chip`**

```tsx
// src/components/ui/Chip.tsx
import type { ReactNode } from "react";

export default function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`chip ${className}`.trim()}>{children}</span>;
}
```

- [ ] **Step 2: Migrate `CaseCard` tags**

Replace the tag span (lines 21–25) inside the map:

```tsx
        {uapCase.tags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
```
Add `import Chip from "@/components/ui/Chip";`.

- [ ] **Step 3: Migrate the UAP detail tag chips**

In `src/app/uap/[slug]/page.tsx`, find the tags row (each tag rendered with `className="chip"`) and replace each with `<Chip key={t}>{t}</Chip>`; add the import.

- [ ] **Step 4: Migrate `GenreBrowser` count badge**

Replace line 49 (`<span className="chip">{shelf.items.length} books</span>`):

```tsx
              <Chip>{shelf.items.length} books</Chip>
```
Add the import.

- [ ] **Step 5: Migrate the home eyebrow**

In `src/app/page.tsx`, the eyebrow (lines 35–38) uses `className="chip reveal reveal-1"` and contains a dot + text. Replace with:

```tsx
            <Chip className="reveal reveal-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Books &amp; Movies, curated for you
            </Chip>
```
Add the import.

- [ ] **Step 6: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: `/uap` card tags + `/uap/roswell` detail tags, `/` "N books" badges, `/` hero eyebrow pill — all render as pill chips as before.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Chip.tsx src/components/CaseCard.tsx "src/app/uap/[slug]/page.tsx" src/components/GenreBrowser.tsx src/app/page.tsx
git commit -m "feat: add Chip primitive; migrate tag/eyebrow chips"
```

---

### Task 11: `Input` / `Textarea` primitives + migrate

**Files:**
- Create: `src/components/ui/Input.tsx`, `src/components/ui/Textarea.tsx`
- Modify: `src/app/login/page.tsx:67-82`, `src/components/CommentForm.tsx:29-36`

**Interfaces:**
- Produces:
  ```ts
  function Input(props: ComponentProps<"input"> & { className?: string }): JSX.Element
  function Textarea(props: ComponentProps<"textarea"> & { className?: string }): JSX.Element
  ```
  Base field styling: `w-full rounded-lg border border-edge bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-accent`.

Note: do **not** migrate `BigSearchBar`'s input — it has a distinct large/rounded-2xl treatment; leave it inline (documented exception).

- [ ] **Step 1: Implement `Input`**

```tsx
// src/components/ui/Input.tsx
import type { ComponentProps } from "react";

const FIELD =
  "w-full rounded-lg border border-edge bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-accent";

export default function Input({
  className = "",
  ...rest
}: ComponentProps<"input">) {
  return <input className={`${FIELD} ${className}`.trim()} {...rest} />;
}
```

- [ ] **Step 2: Implement `Textarea`**

```tsx
// src/components/ui/Textarea.tsx
import type { ComponentProps } from "react";

const FIELD =
  "w-full rounded-lg border border-edge bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-accent";

export default function Textarea({
  className = "",
  ...rest
}: ComponentProps<"textarea">) {
  return <textarea className={`${FIELD} ${className}`.trim()} {...rest} />;
}
```

- [ ] **Step 3: Migrate the login inputs**

Replace the two `<input>` (lines 67–82) with `Input`, keeping their props:

```tsx
          <Input type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Input type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (at least 6 characters)" />
```
Add `import Input from "@/components/ui/Input";`.

- [ ] **Step 4: Migrate the CommentForm textarea**

Replace the `<textarea>` (lines 29–36):

```tsx
      <Textarea value={body} onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder} rows={3} maxLength={4000} className="text-sm" />
```
Add `import Textarea from "@/components/ui/Textarea";`.

- [ ] **Step 5: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: `/login` email + password fields type, focus to accent border; `/community` and `/title/...` comment textareas type and submit. BigSearchBar unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Input.tsx src/components/ui/Textarea.tsx src/app/login/page.tsx src/components/CommentForm.tsx
git commit -m "feat: add Input/Textarea primitives; migrate form fields"
```

---

## Stage 4 — Logic refactor

### Task 12: `getCurrentUser()` helper (TDD) + migrate

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`
- Modify: `src/lib/saved.ts:6-11,21-29`, `src/components/NavBar.tsx:6-10`

**Interfaces:**
- Produces:
  ```ts
  // Returns the signed-in Supabase user, or null when logged out.
  export async function getCurrentUser(): Promise<User | null>
  ```
- Consumes: `createClient` from `@/lib/supabase/server`.

The repeated block is `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();` followed by a null check. The helper removes the fetch boilerplate; callers keep their own early-return.

- [ ] **Step 1: Write the failing test (mock the server client)**

```ts
// src/lib/auth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

import { getCurrentUser } from "./auth";

describe("getCurrentUser", () => {
  beforeEach(() => getUser.mockReset());

  it("returns the user when signed in", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    expect(await getCurrentUser()).toEqual({ id: "u1" });
  });

  it("returns null when logged out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getCurrentUser()).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL — cannot find `./auth`.

- [ ] **Step 3: Implement `getCurrentUser`**

```ts
// src/lib/auth.ts
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** The signed-in Supabase user, or null when logged out. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Migrate `saved.ts`**

In `getSavedItems` replace lines 7–11 with:

```ts
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
```

In `isSaved` replace lines 25–29 likewise (returning `false`). Keep the existing `createClient` import (still used for the queries) and add `import { getCurrentUser } from "@/lib/auth";`.

- [ ] **Step 6: Migrate `NavBar.tsx`**

Replace lines 6–10:

```tsx
export default async function NavBar() {
  const user = await getCurrentUser();
```

Remove the now-unused `createClient` import from NavBar; add `import { getCurrentUser } from "@/lib/auth";`.

- [ ] **Step 7: Verify gate + behavior**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: logged out → NavBar shows Sign in, `/` "Your shelf" empty; logged in → NavBar shows Sign out, saved items appear. (Other call sites — `title` page, `community` page, `CommentsSection` — can be migrated opportunistically but are not required for this task; do not expand scope mid-task.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts src/lib/saved.ts src/components/NavBar.tsx
git commit -m "refactor: add getCurrentUser() helper; use it in saved + NavBar"
```

---

### Task 13: `enrichRowsWithAuthors()` helper (TDD) + migrate

**Files:**
- Modify: `src/lib/comments-core.ts` (add function + test), `src/lib/comments.ts:23-30`, `src/lib/board.ts:17-24`
- Test: `src/lib/comments-core.test.ts` (add cases) — create if it does not exist

**Interfaces:**
- Produces:
  ```ts
  // Fetches profiles for the distinct user_ids in `rows` and returns the author map.
  export async function fetchAuthorMap(
    supabase: SupabaseLike,
    rows: { user_id: string }[],
  ): Promise<Map<string, string>>
  type SupabaseLike = {
    from(table: string): {
      select(cols: string): { in(col: string, vals: string[]): Promise<{ data: unknown }> };
    };
  };
  ```
- Consumes: `buildAuthorMap` (already in `comments-core.ts`).

The duplicated block in `comments.ts` and `board.ts` is: collect distinct `user_id`s → `from("profiles").select("id, display_name").in("id", ids)` → `buildAuthorMap`. Extract the profiles fetch + map build into one helper; the row-shaping (`toCommentViews` / `buildThread`) stays in each caller.

- [ ] **Step 1: Add the failing test to `comments-core.test.ts`**

Append:

```ts
import { fetchAuthorMap } from "./comments-core";

describe("fetchAuthorMap", () => {
  it("queries profiles for distinct user ids and maps id → name", async () => {
    const calls: string[][] = [];
    const supabase = {
      from: () => ({
        select: () => ({
          in: async (_col: string, ids: string[]) => {
            calls.push(ids);
            return { data: [{ id: "a", display_name: "Ada" }, { id: "b", display_name: null }] };
          },
        }),
      }),
    };
    const rows = [{ user_id: "a" }, { user_id: "a" }, { user_id: "b" }];
    const map = await fetchAuthorMap(supabase as never, rows);
    expect(calls).toEqual([["a", "b"]]);        // distinct ids
    expect(map.get("a")).toBe("Ada");
    expect(map.get("b")).toBe("Reader");         // null → fallback
  });
});
```

(If `src/lib/comments-core.test.ts` does not exist, create it with the standard `import { describe, it, expect } from "vitest";` header plus this block.)

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/comments-core.test.ts`
Expected: FAIL — `fetchAuthorMap` is not exported.

- [ ] **Step 3: Implement `fetchAuthorMap` in `comments-core.ts`**

Add at the end of `src/lib/comments-core.ts`:

```ts
type SupabaseLike = {
  from(table: string): {
    select(cols: string): {
      in(col: string, vals: string[]): Promise<{ data: unknown }>;
    };
  };
};

/** Fetch display names for the distinct user_ids in `rows`, as an author map. */
export async function fetchAuthorMap(
  supabase: SupabaseLike,
  rows: { user_id: string }[],
): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  return buildAuthorMap((data ?? []) as ProfileRow[]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/comments-core.test.ts`
Expected: PASS.

- [ ] **Step 5: Migrate `comments.ts`**

Replace lines 25–30 with:

```ts
  const authors = await fetchAuthorMap(supabase, list);
  return toCommentViews(list, authors);
```

Update the import from `@/lib/comments-core` to include `fetchAuthorMap` and drop `buildAuthorMap` if now unused there.

- [ ] **Step 6: Migrate `board.ts`**

Replace lines 19–24 with:

```ts
  const authors = await fetchAuthorMap(supabase, list);
  return buildThread(list, authors);
```

Update the import to include `fetchAuthorMap`; drop `buildAuthorMap` if now unused.

- [ ] **Step 7: Verify gate + behavior**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: `/community` posts + replies show author names (or "Reader"); a `/title/...` page's comments show author names. Posting still works.

- [ ] **Step 8: Commit**

```bash
git add src/lib/comments-core.ts src/lib/comments-core.test.ts src/lib/comments.ts src/lib/board.ts
git commit -m "refactor: extract fetchAuthorMap; dedupe comments + board author join"
```

---

## Stage 5 — Performance pass

### Task 14: Image lazy-loading + dimensions

**Files:**
- Modify: `src/components/ResultCard.tsx` (cover `<img>`), `src/app/uap/[slug]/page.tsx` (case image if present), `src/app/title/[type]/[id]/page.tsx` (cover `<img>` if present)

**Interfaces:**
- No API change.

Add `loading="lazy"` and `decoding="async"` to offscreen content images, plus explicit width/height (or rely on the existing aspect-ratio container) to avoid layout shift. Do not touch `next/image` (external hosts).

- [ ] **Step 1: ResultCard cover**

In `src/components/ResultCard.tsx`, on the cover `<img>` (lines 15–19), add attributes:

```tsx
          <img
            src={item.coverUrl}
            alt={`Cover of ${item.title}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.07]"
          />
```

(The parent already constrains size via `aspect-[2/3]`, so no width/height needed.)

- [ ] **Step 2: Detail-page covers**

In `src/app/title/[type]/[id]/page.tsx` and `src/app/uap/[slug]/page.tsx`, if a cover/case `<img>` exists, add `loading="lazy" decoding="async"` (keep the eslint-disable comment that's already there for plain `<img>`). The above-the-fold title cover may use `loading="eager"` instead — leave `eager`/no-attr for the single primary hero image if present; lazy-load only secondary images.

- [ ] **Step 3: Verify gate + visual**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: scroll `/search?q=star` and `/uap` — covers load as they enter the viewport; no layout jump.

- [ ] **Step 4: Commit**

```bash
git add src/components/ResultCard.tsx "src/app/title/[type]/[id]/page.tsx" "src/app/uap/[slug]/page.tsx"
git commit -m "perf: lazy-load + async-decode grid and detail images"
```

---

### Task 15: Targeted `React.memo` on list cards

**Files:**
- Modify: `src/components/ResultCard.tsx`, `src/components/CaseCard.tsx`

**Interfaces:**
- No API change (still default-exported components).

`SearchResults` (filter/sort state) re-renders its `ResultCard` children and `CaseBrowser` (tag filter) re-renders `CaseCard` children when the filter changes, even for cards whose `item`/`uapCase` prop is unchanged. Memoize these two leaf components. Their props (`item`, `uapCase`) are stable object references from the data arrays, so memo is effective.

- [ ] **Step 1: Memoize `ResultCard`**

Wrap the export:

```tsx
import { memo } from "react";
// …component body unchanged, but rename the function to ResultCardImpl…
function ResultCardImpl({ item }: { item: SearchResult }) { /* unchanged */ }
export default memo(ResultCardImpl);
```

- [ ] **Step 2: Memoize `CaseCard`**

Same pattern:

```tsx
import { memo } from "react";
function CaseCardImpl({ uapCase }: { uapCase: UapCase }) { /* unchanged */ }
export default memo(CaseCardImpl);
```

- [ ] **Step 3: Verify gate + behavior**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.
Manual: `/search?q=dune` filter tabs (all/books/movies) + sort still update correctly; `/uap` tag filter still updates. (Optional: React DevTools "Highlight updates" shows unchanged cards no longer re-render on filter change.)

- [ ] **Step 4: Commit**

```bash
git add src/components/ResultCard.tsx src/components/CaseCard.tsx
git commit -m "perf: memoize ResultCard and CaseCard list items"
```

---

## Final verification

- [ ] Run the full gate one last time: `npm test && npm run lint && npm run build` — 53 baseline + ~9 new tests pass, lint clean (0 errors), build green.
- [ ] Full manual sweep in `npm run dev`, light + dark: `/`, `/search?q=dune`, a `/title/book/<id>` and `/title/movie/<id>`, `/community`, `/login`, `/uap`, `/uap/roswell`, a 404 route. Confirm nothing looks or behaves differently except the (invisible) Stage-1 fixes.

---

## Self-Review notes (author)

- **Spec coverage:** Stage 1 (bugs) → Tasks 1–2. Stage 2 (status tokens + `.glass`) → Tasks 3–4. Stage 3 (Button, Input/Textarea, Card, SectionHeader, NavItem, Chip) → Tasks 5–11. Stage 4 (`getCurrentUser`, author-join dedupe) → Tasks 12–13. Stage 5 (image lazy-load, memo) → Tasks 14–15. Out-of-scope items (cases.ts, withFallback, FilteredGrid, next/image) are not present as tasks — correct.
- **Naming consistency:** primitive props (`variant`/`size`/`shape`, `selected`/`onClick`/`label`/`count`/`truncate`) used identically across definition and migration tasks. Helper names `getCurrentUser` and `fetchAuthorMap` used consistently between definition and call-site tasks.
- **Documented exceptions:** BigSearchBar input kept inline (distinct large treatment); the `getCurrentUser` migration deliberately covers only `saved.ts` + `NavBar` in Task 12, leaving the other ~5 sites optional to keep the task reviewable.

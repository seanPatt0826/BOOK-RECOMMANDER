"use client";

import { useState } from "react";
import Carousel from "@/components/Carousel";
import type { GenreShelf } from "@/lib/home";
import type { SearchResult } from "@/lib/sources/types";

// Content on the left (the Discover shelf plus whichever genre is selected),
// a vertical "Browse by genre" nav on the right. Picking a genre swaps the
// shelf shown in the main column; "All genres" stacks every shelf. Client-side
// so switching is instant, with no reload.
export default function GenreBrowser({
  shelves,
  discover,
}: {
  shelves: GenreShelf[];
  discover: SearchResult[];
}) {
  const [active, setActive] = useState<string>(shelves[0]?.subject ?? "all");

  const visible =
    active === "all" ? shelves : shelves.filter((s) => s.subject === active);

  const navItem = (selected: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
      selected
        ? "bg-accent text-accent-contrast shadow-[var(--shadow-sm)]"
        : "text-ink/75 hover:bg-surface-2 hover:text-accent"
    }`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
      {/* Main column: Discover + the selected genre's shelves. */}
      <div className="min-w-0 space-y-10">
        {discover.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-5 w-1 rounded-full bg-accent" />
              <h2 className="text-2xl font-semibold">Discover</h2>
            </div>
            <Carousel items={discover} />
          </div>
        )}

        {visible.map((shelf) => (
          <div key={shelf.subject}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-ink">{shelf.label}</h3>
              <span className="chip">{shelf.items.length} books</span>
            </div>
            <Carousel items={shelf.items} />
          </div>
        ))}
      </div>

      {/* Side nav: the genre list, sticky as you scroll the shelves. */}
      <aside>
        <div className="lg:sticky lg:top-20">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-violet" />
            <h2 className="text-lg font-semibold">Browse by genre</h2>
          </div>
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActive("all")}
              className={navItem(active === "all")}
            >
              <span>All genres</span>
            </button>
            {shelves.map((s) => (
              <button
                key={s.subject}
                type="button"
                onClick={() => setActive(s.subject)}
                className={navItem(active === s.subject)}
              >
                <span className="truncate">{s.label}</span>
                <span className="text-xs opacity-70">{s.items.length}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}

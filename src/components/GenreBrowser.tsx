"use client";

import { useState } from "react";
import Carousel from "@/components/Carousel";
import type { GenreShelf } from "@/lib/home";

// Filter pills + the shelves they control. Picking a genre shows just that
// shelf; "All" shows every shelf. Client-side so it's instant, no reload.
export default function GenreBrowser({ shelves }: { shelves: GenreShelf[] }) {
  const [active, setActive] = useState<string>("all");

  const visible =
    active === "all" ? shelves : shelves.filter((s) => s.subject === active);

  const pill = (selected: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
      selected
        ? "bg-accent text-accent-contrast shadow-[var(--shadow-sm)]"
        : "border border-edge bg-surface/60 text-ink/75 hover:border-accent hover:text-accent"
    }`;

  return (
    <div>
      {/* Filter row — sticks just below the navbar while you scroll. */}
      <div className="glass sticky top-14 z-30 -mx-4 mb-8 border-y border-edge/60 px-4 py-3">
        <div className="shelf-scroll flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActive("all")}
            className={pill(active === "all")}
          >
            All
          </button>
          {shelves.map((s) => (
            <button
              key={s.subject}
              type="button"
              onClick={() => setActive(s.subject)}
              className={pill(active === s.subject)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shelves */}
      <div className="space-y-10">
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
    </div>
  );
}

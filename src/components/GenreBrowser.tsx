"use client";

import { useState } from "react";
import Carousel from "@/components/Carousel";
import Chip from "@/components/ui/Chip";
import NavItem from "@/components/ui/NavItem";
import SectionHeader from "@/components/ui/SectionHeader";
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
      {/* Main column: Discover + the selected genre's shelves. */}
      <div className="min-w-0 space-y-10">
        {discover.length > 0 && (
          <div>
            <SectionHeader accent="accent" size="xl" className="mb-3">Discover</SectionHeader>
            <Carousel items={discover} />
          </div>
        )}

        {visible.map((shelf) => (
          <div key={shelf.subject}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-ink">{shelf.label}</h3>
              <Chip>{shelf.items.length} books</Chip>
            </div>
            <Carousel items={shelf.items} />
          </div>
        ))}
      </div>

      {/* Side nav: the genre list, sticky as you scroll the shelves. */}
      <aside>
        <div className="lg:sticky lg:top-20">
          <SectionHeader accent="violet" size="lg" className="mb-4">Browse by genre</SectionHeader>
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
        </div>
      </aside>
    </div>
  );
}

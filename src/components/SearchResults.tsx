"use client";

import { useState } from "react";
import ResultCard from "@/components/ResultCard";
import type { SearchResult } from "@/lib/sources/types";

type Filter = "all" | "book" | "movie";
type Sort = "relevance" | "newest" | "oldest";

// Sort by release year. Titles with no known year always sink to the bottom.
function byYear(items: SearchResult[], newest: boolean): SearchResult[] {
  return [...items].sort((a, b) => {
    const ya = a.year ? parseInt(a.year, 10) : null;
    const yb = b.year ? parseInt(b.year, 10) : null;
    if (ya === null && yb === null) return 0;
    if (ya === null) return 1;
    if (yb === null) return -1;
    return newest ? yb - ya : ya - yb;
  });
}

export default function SearchResults({ items }: { items: SearchResult[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("relevance");

  const bookCount = items.filter((i) => i.type === "book").length;
  const movieCount = items.filter((i) => i.type === "movie").length;

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${items.length})` },
    { key: "book", label: `Books (${bookCount})` },
    { key: "movie", label: `Movies (${movieCount})` },
  ];
  const activeIndex = tabs.findIndex((t) => t.key === filter);

  const filtered =
    filter === "all" ? items : items.filter((i) => i.type === filter);
  // "relevance" keeps the server's best-match order; otherwise sort by year.
  const shown =
    sort === "relevance" ? filtered : byYear(filtered, sort === "newest");

  if (items.length === 0) {
    return (
      <p className="mt-3 text-muted">
        No results found. Try a different title.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The slider: a sliding pill highlights the active choice. */}
        <div
          role="tablist"
          aria-label="Filter results by type"
          className="relative inline-flex rounded-full border border-edge bg-surface p-1"
        >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-24 rounded-full bg-accent shadow-sm transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={`relative z-10 w-24 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "text-accent-contrast"
                : "text-ink/70 hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
        </div>

        {/* Sort: Best match (default) / Newest / Oldest. */}
        <div className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface p-1">
          {(
            [
              { key: "relevance", label: "Best match" },
              { key: "newest", label: "Newest" },
              { key: "oldest", label: "Oldest" },
            ] as { key: Sort; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              aria-pressed={sort === opt.key}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                sort === opt.key
                  ? "bg-accent text-accent-contrast shadow-[var(--shadow-sm)]"
                  : "text-ink/70 hover:text-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-muted">
          {filter === "movie"
            ? "No movies to show yet — movie search turns on once a (free) TMDB key is added."
            : "Nothing here for this filter."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((item) => (
            <ResultCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

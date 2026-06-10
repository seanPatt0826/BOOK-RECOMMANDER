"use client";

import { useState } from "react";
import ResultCard from "@/components/ResultCard";
import type { SearchResult } from "@/lib/sources/types";

type Filter = "all" | "book" | "movie";

export default function SearchResults({ items }: { items: SearchResult[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const bookCount = items.filter((i) => i.type === "book").length;
  const movieCount = items.filter((i) => i.type === "movie").length;

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${items.length})` },
    { key: "book", label: `Books (${bookCount})` },
    { key: "movie", label: `Movies (${movieCount})` },
  ];
  const activeIndex = tabs.findIndex((t) => t.key === filter);

  const shown =
    filter === "all" ? items : items.filter((i) => i.type === filter);

  if (items.length === 0) {
    return (
      <p className="mt-3 text-muted">
        No results found. Try a different title.
      </p>
    );
  }

  return (
    <div className="mt-6">
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

      {shown.length === 0 ? (
        <p className="mt-6 text-muted">
          {filter === "movie"
            ? "No movies to show yet — movie search turns on once a (free) TMDB key is added."
            : "Nothing here for this filter."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {shown.map((item) => (
            <ResultCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

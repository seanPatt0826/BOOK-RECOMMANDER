"use client";

import { useRef } from "react";
import ResultCard from "@/components/ResultCard";
import type { SearchResult } from "@/lib/sources/types";

export default function Carousel({ items }: { items: SearchResult[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    trackRef.current?.scrollBy({ left: direction * 360, behavior: "smooth" });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">Nothing to show here yet.</p>;
  }

  return (
    <div className="group/carousel relative">
      {/* Soft fades hint that the shelf keeps going. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-paper to-transparent" />

      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="glass absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-edge text-ink shadow-md transition hover:scale-105 hover:border-accent hover:bg-accent hover:text-accent-contrast"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div
        ref={trackRef}
        className="shelf-scroll flex gap-4 overflow-x-auto px-10 pb-3"
      >
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="w-36 flex-shrink-0">
            <ResultCard item={item} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="glass absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-edge text-ink shadow-md transition hover:scale-105 hover:border-accent hover:bg-accent hover:text-accent-contrast"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

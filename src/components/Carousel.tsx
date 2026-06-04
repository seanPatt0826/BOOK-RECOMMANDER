"use client";

import { useRef } from "react";
import ResultCard from "@/components/ResultCard";
import type { SearchResult } from "@/lib/sources/types";

export default function Carousel({ items }: { items: SearchResult[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    trackRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">Nothing to show here yet.</p>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-lg shadow hover:bg-white"
      >
        ‹
      </button>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-8 pb-2"
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
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-lg shadow hover:bg-white"
      >
        ›
      </button>
    </div>
  );
}

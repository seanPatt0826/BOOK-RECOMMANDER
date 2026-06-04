import { describe, it, expect } from "vitest";
import { combineCarousel } from "./home";
import type { SearchResult } from "@/lib/sources/types";

const book = (n: number): SearchResult => ({
  id: `b${n}`, type: "book", title: `Book ${n}`, coverUrl: null, year: null, rating: null,
});
const movie = (n: number): SearchResult => ({
  id: `m${n}`, type: "movie", title: `Movie ${n}`, coverUrl: null, year: null, rating: null,
});

describe("combineCarousel", () => {
  it("puts featured first, then interleaved popular books/movies", () => {
    const out = combineCarousel([book(9)], [book(1), book(2)], [movie(1)]);
    expect(out.map((r) => r.id)).toEqual(["b9", "b1", "m1", "b2"]);
  });

  it("dedupes across featured and popular by type+id", () => {
    const out = combineCarousel([book(1)], [book(1), book(2)], []);
    expect(out.map((r) => r.id)).toEqual(["b1", "b2"]);
  });

  it("caps at the limit", () => {
    const books = [1, 2, 3, 4].map(book);
    const out = combineCarousel([], books, [], 2);
    expect(out).toHaveLength(2);
  });
});

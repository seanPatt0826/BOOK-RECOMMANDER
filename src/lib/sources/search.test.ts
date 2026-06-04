import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchResult } from "./types";

vi.mock("./googleBooks", () => ({ searchBooks: vi.fn() }));
vi.mock("./tmdb", () => ({ searchMovies: vi.fn() }));

import { searchBooks } from "./googleBooks";
import { searchMovies } from "./tmdb";
import { searchAll } from "./search";

const book = (n: number): SearchResult => ({
  id: `b${n}`, type: "book", title: `Book ${n}`, coverUrl: null, year: null, rating: null,
});
const movie = (n: number): SearchResult => ({
  id: `m${n}`, type: "movie", title: `Movie ${n}`, coverUrl: null, year: null, rating: null,
});

describe("searchAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("interleaves books and movies", async () => {
    vi.mocked(searchBooks).mockResolvedValue([book(1), book(2)]);
    vi.mocked(searchMovies).mockResolvedValue([movie(1), movie(2)]);
    const results = await searchAll("x");
    expect(results.map((r) => r.id)).toEqual(["b1", "m1", "b2", "m2"]);
  });

  it("returns the other source's results when one source throws", async () => {
    vi.mocked(searchBooks).mockRejectedValue(new Error("books down"));
    vi.mocked(searchMovies).mockResolvedValue([movie(1)]);
    const results = await searchAll("x");
    expect(results.map((r) => r.id)).toEqual(["m1"]);
  });

  it("returns an empty array when both sources fail", async () => {
    vi.mocked(searchBooks).mockRejectedValue(new Error("a"));
    vi.mocked(searchMovies).mockRejectedValue(new Error("b"));
    expect(await searchAll("x")).toEqual([]);
  });

  it("returns an empty array for a blank query without calling sources", async () => {
    const results = await searchAll("   ");
    expect(results).toEqual([]);
    expect(searchBooks).not.toHaveBeenCalled();
    expect(searchMovies).not.toHaveBeenCalled();
  });
});

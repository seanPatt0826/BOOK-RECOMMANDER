import { describe, it, expect } from "vitest";
import { itemRowToResult } from "./itemRow";

describe("itemRowToResult", () => {
  it("maps a DB item row to a SearchResult with null year/rating", () => {
    expect(
      itemRowToResult({
        item_id: "603",
        item_type: "movie",
        title: "The Matrix",
        cover_url: "https://image.tmdb.org/t/p/w342/poster.jpg",
      }),
    ).toEqual({
      id: "603",
      type: "movie",
      title: "The Matrix",
      coverUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
      year: null,
      rating: null,
    });
  });

  it("passes through a null cover", () => {
    const r = itemRowToResult({
      item_id: "x",
      item_type: "book",
      title: "Bare",
      cover_url: null,
    });
    expect(r.coverUrl).toBeNull();
  });
});

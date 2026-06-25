import { describe, it, expect, afterEach, vi } from "vitest";
import {
  normalizeBookItem,
  normalizeBookDetail,
  searchBooks,
  getPopularBooks,
} from "./googleBooks";

const sampleVolume = {
  id: "abc123",
  volumeInfo: {
    title: "Dune",
    authors: ["Frank Herbert"],
    publishedDate: "1965-08-01",
    averageRating: 4.5,
    description: "A desert planet epic.",
    imageLinks: { thumbnail: "http://books.google.com/books/content?id=abc123" },
  },
};

describe("normalizeBookItem", () => {
  it("maps a volume to a SearchResult with https cover and year", () => {
    expect(normalizeBookItem(sampleVolume)).toEqual({
      id: "abc123",
      type: "book",
      title: "Dune",
      coverUrl: "https://books.google.com/books/content?id=abc123",
      year: "1965",
      rating: 4.5,
    });
  });

  it("handles a volume missing optional fields", () => {
    const result = normalizeBookItem({ id: "x", volumeInfo: { title: "Bare" } });
    expect(result).toEqual({
      id: "x",
      type: "book",
      title: "Bare",
      coverUrl: null,
      year: null,
      rating: null,
    });
  });
});

describe("normalizeBookDetail", () => {
  it("includes description and authors as creators", () => {
    const detail = normalizeBookDetail(sampleVolume);
    expect(detail.description).toBe("A desert planet epic.");
    expect(detail.creators).toEqual(["Frank Herbert"]);
    expect(detail.title).toBe("Dune");
  });
});

describe("searchBooks", () => {
  afterEach(() => vi.unstubAllGlobals());

  // Route the mocked fetch by URL fragment so we can drive Open Library and
  // Google Books independently; unmatched URLs return an empty payload.
  function routedFetch(routes: Record<string, unknown>) {
    return vi.fn(async (url: string) => {
      const json =
        Object.entries(routes).find(([frag]) => url.includes(frag))?.[1] ?? {};
      return { ok: true, json: async () => json };
    });
  }
  function calledUrls(): string[] {
    return (fetch as unknown as { mock: { calls: string[][] } }).mock.calls.map(
      (c) => c[0],
    );
  }

  it("prefers Open Library (which carries ratings) and returns its results", async () => {
    const ol = {
      docs: [
        { key: "/works/OL1W", title: "Dune", ratings_average: 4.3, first_publish_year: 1965 },
      ],
    };
    vi.stubGlobal("fetch", routedFetch({ "openlibrary.org/search": ol }));
    const results = await searchBooks("dune");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Dune");
    expect(results[0].rating).toBe(4.3); // ratings now flow through to search
    expect(calledUrls()[0]).toContain("openlibrary.org/search"); // OL tried first
  });

  it("falls back to Google Books when Open Library returns nothing", async () => {
    vi.stubGlobal(
      "fetch",
      routedFetch({
        "openlibrary.org/search": { docs: [] },
        "googleapis.com/books": { items: [sampleVolume] },
      }),
    );
    const results = await searchBooks("dune");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Dune");
    const urls = calledUrls();
    expect(urls.some((u) => u.includes("openlibrary.org/search"))).toBe(true);
    expect(urls.some((u) => u.includes("googleapis.com/books"))).toBe(true);
  });

  it("returns an empty array when neither source has results", async () => {
    vi.stubGlobal("fetch", routedFetch({}));
    expect(await searchBooks("zzz")).toEqual([]);
  });
});

describe("getPopularBooks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("queries the fiction subject and maps the items", async () => {
    const json = { items: [sampleVolume] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await getPopularBooks();
    expect(results[0].title).toBe("Dune");
    const url = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(url).toContain("subject:fiction");
  });
});

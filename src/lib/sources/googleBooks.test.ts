import { describe, it, expect, afterEach, vi } from "vitest";
import {
  normalizeBookItem,
  normalizeBookDetail,
  searchBooks,
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

  it("calls the volumes endpoint and maps the items array", async () => {
    const json = { items: [sampleVolume] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await searchBooks("dune");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Dune");
    const calledUrl = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(calledUrl).toContain("googleapis.com/books/v1/volumes");
    expect(calledUrl).toContain("q=dune");
  });

  it("returns an empty array when the API returns no items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await searchBooks("zzz")).toEqual([]);
  });
});

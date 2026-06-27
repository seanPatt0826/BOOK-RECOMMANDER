import { describe, it, expect, afterEach, vi } from "vitest";
import { getSimilarTitles } from "./similar";
import type { MediaDetail } from "@/lib/sources/types";

const bookDetail = (over: Partial<MediaDetail> = {}): MediaDetail => ({
  id: "OL1W",
  type: "book",
  title: "Dune",
  coverUrl: null,
  year: "1965",
  rating: null,
  description: "Desert planet epic.",
  creators: ["Frank Herbert"],
  ...over,
});

describe("getSimilarTitles", () => {
  afterEach(() => vi.unstubAllGlobals());

  // Work lookup (/works/<id>.json) returns the work's subjects; the genre shelf
  // (q=subject:…) returns books; Google Books is routed empty so the shelf falls
  // through to Open Library.
  function routedFetch(opts: {
    subjects: string[];
    shelf: { key: string; title: string }[];
  }) {
    return vi.fn(async (url: string) => {
      if (url.includes("googleapis.com")) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      if (url.includes("/works/")) {
        return { ok: true, json: async () => ({ subjects: opts.subjects }) };
      }
      if (url.includes("subject:")) {
        return { ok: true, json: async () => ({ docs: opts.shelf }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  }

  it("builds a 'More <genre>' shelf for a book and excludes itself", async () => {
    vi.stubGlobal(
      "fetch",
      routedFetch({
        subjects: ["Science fiction"],
        shelf: [
          { key: "/works/OL1W", title: "Dune" }, // this title → excluded
          { key: "/works/OL2W", title: "Foundation" },
          { key: "/works/OL3W", title: "Hyperion" },
        ],
      }),
    );
    const shelf = await getSimilarTitles(bookDetail());
    expect(shelf).not.toBeNull();
    expect(shelf!.label).toBe("More Science Fiction");
    expect(shelf!.items.map((i) => i.title)).toEqual(["Foundation", "Hyperion"]);
  });

  it("returns null when the book's subjects match no genre", async () => {
    vi.stubGlobal("fetch", routedFetch({ subjects: ["In library"], shelf: [] }));
    expect(await getSimilarTitles(bookDetail())).toBeNull();
  });

  it("returns null for a non-Open-Library book id (no subjects available)", async () => {
    vi.stubGlobal("fetch", routedFetch({ subjects: [], shelf: [] }));
    expect(await getSimilarTitles(bookDetail({ id: "googleVol123" }))).toBeNull();
  });

  it("returns null when the shelf is empty after excluding self", async () => {
    vi.stubGlobal(
      "fetch",
      routedFetch({
        subjects: ["Science fiction"],
        shelf: [{ key: "/works/OL1W", title: "Dune" }], // only self
      }),
    );
    expect(await getSimilarTitles(bookDetail())).toBeNull();
  });

  it("returns null for a keyless movie (no genres on the detail)", async () => {
    const movie: MediaDetail = {
      id: "Inception",
      type: "movie",
      title: "Inception",
      coverUrl: null,
      year: "2010",
      rating: null,
      description: "Dream heist.",
      creators: [],
    };
    expect(await getSimilarTitles(movie)).toBeNull();
  });
});

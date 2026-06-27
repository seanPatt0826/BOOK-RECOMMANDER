import { describe, it, expect, afterEach, vi } from "vitest";
import { tallyGenres, getRecommendations } from "./recommend";
import type { SearchResult } from "@/lib/sources/types";

describe("tallyGenres", () => {
  it("returns nothing for an empty list", () => {
    expect(tallyGenres([])).toEqual([]);
  });

  it("votes a genre from a matching subject and records the reason", () => {
    const votes = tallyGenres([
      { title: "The Hobbit", subjects: ["Fantasy fiction", "Middle Earth"] },
    ]);
    expect(votes).toEqual([
      { label: "Fantasy", subject: "fantasy", count: 1, reason: "The Hobbit" },
    ]);
  });

  it("ignores subject junk that matches no genre", () => {
    expect(
      tallyGenres([
        { title: "X", subjects: ["Accessible book", "Protected DAISY", "In library"] },
      ]),
    ).toEqual([]);
  });

  it("tallies repeated genres and sorts by count desc", () => {
    const votes = tallyGenres([
      { title: "Dune", subjects: ["Science fiction"] },
      { title: "Neuromancer", subjects: ["Science fiction", "Cyberpunk"] },
      { title: "The Hobbit", subjects: ["Fantasy"] },
    ]);
    expect(votes.map((v) => [v.label, v.count])).toEqual([
      ["Science Fiction", 2],
      ["Fantasy", 1],
    ]);
    // Reason is the first book that voted the genre.
    expect(votes[0].reason).toBe("Dune");
  });

  it("lets one book vote multiple genres", () => {
    const votes = tallyGenres([
      { title: "Outlander", subjects: ["Historical fiction", "Romance"] },
    ]);
    expect(votes.map((v) => v.subject).sort()).toEqual(["history", "romance"]);
  });

  it("matches case-insensitively via keyword aliases", () => {
    const votes = tallyGenres([
      { title: "Gone Girl", subjects: ["Detective and mystery stories"] },
    ]);
    expect(votes[0].label).toBe("Mystery & Thriller");
  });
});

describe("getRecommendations", () => {
  afterEach(() => vi.unstubAllGlobals());

  const savedBook = (id: string, title: string): SearchResult => ({
    id,
    type: "book",
    title,
    coverUrl: null,
    year: null,
    rating: null,
  });

  // Route the mocked fetch: the work lookup (/works/<id>.json) returns a saved
  // book's subjects; the genre-shelf lookup (q=subject:…) returns books; Google
  // Books is routed empty so the shelf falls through to Open Library.
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

  it("returns [] when the user has saved nothing", async () => {
    expect(await getRecommendations([])).toEqual([]);
  });

  it("returns [] when no saved book yields a genre signal", async () => {
    vi.stubGlobal("fetch", routedFetch({ subjects: ["In library"], shelf: [] }));
    const rows = await getRecommendations([savedBook("OL1W", "Mystery Book")]);
    expect(rows).toEqual([]);
  });

  it("builds a genre row and excludes already-saved titles", async () => {
    vi.stubGlobal(
      "fetch",
      routedFetch({
        subjects: ["Science fiction"],
        shelf: [
          { key: "/works/OL1W", title: "Dune" }, // already saved → excluded
          { key: "/works/OL2W", title: "Foundation" },
          { key: "/works/OL3W", title: "Hyperion" },
        ],
      }),
    );
    const rows = await getRecommendations([savedBook("OL1W", "Dune")]);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Science Fiction");
    expect(rows[0].reason).toBe("Because you saved Dune");
    const titles = rows[0].items.map((i) => i.title);
    expect(titles).toEqual(["Foundation", "Hyperion"]);
    expect(titles).not.toContain("Dune");
  });

  it("skips Google-id saved books that carry no subjects", async () => {
    vi.stubGlobal("fetch", routedFetch({ subjects: [], shelf: [] }));
    // A Google volume id (not OL…W) → no subject lookup → no signal → [].
    const rows = await getRecommendations([savedBook("abc123", "Some Book")]);
    expect(rows).toEqual([]);
  });
});

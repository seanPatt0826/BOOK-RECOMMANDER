import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  normalizeMovieItem,
  normalizeMovieDetail,
  ratingFromVoteAverage,
  searchMovies,
  getPopularMovies,
} from "./tmdb";

const sampleMovie = {
  id: 603,
  title: "The Matrix",
  release_date: "1999-03-31",
  vote_average: 8.2,
  poster_path: "/poster.jpg",
  overview: "A hacker learns the truth.",
};

describe("ratingFromVoteAverage", () => {
  it("halves a 0–10 vote to a 0–5 scale, 1 decimal", () => {
    expect(ratingFromVoteAverage(8.2)).toBe(4.1);
  });
  it("returns null for 0 or undefined (TMDB uses 0 for unrated)", () => {
    expect(ratingFromVoteAverage(0)).toBeNull();
    expect(ratingFromVoteAverage(undefined)).toBeNull();
  });
});

describe("normalizeMovieItem", () => {
  it("maps a movie to a SearchResult with poster URL and year", () => {
    expect(normalizeMovieItem(sampleMovie)).toEqual({
      id: "603",
      type: "movie",
      title: "The Matrix",
      coverUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
      year: "1999",
      rating: 4.1,
    });
  });

  it("handles a missing poster", () => {
    const r = normalizeMovieItem({ ...sampleMovie, poster_path: null });
    expect(r.coverUrl).toBeNull();
  });
});

describe("normalizeMovieDetail", () => {
  it("includes overview and genre names as creators", () => {
    const detail = normalizeMovieDetail({
      ...sampleMovie,
      genres: [{ name: "Action" }, { name: "Sci-Fi" }],
    });
    expect(detail.description).toBe("A hacker learns the truth.");
    expect(detail.creators).toEqual(["Action", "Sci-Fi"]);
  });
});

describe("searchMovies", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TMDB_API_KEY;
  });

  it("calls the search endpoint with the key and maps results", async () => {
    const json = { results: [sampleMovie] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await searchMovies("matrix");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("The Matrix");
    const url = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(url).toContain("api.themoviedb.org/3/search/movie");
    expect(url).toContain("api_key=test-key");
    expect(url).toContain("query=matrix");
  });
});

describe("getPopularMovies", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TMDB_API_KEY;
  });

  it("calls the popular endpoint with the key and maps results", async () => {
    const json = { results: [sampleMovie] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => json }),
    );
    const results = await getPopularMovies();
    expect(results[0].title).toBe("The Matrix");
    const url = (fetch as unknown as { mock: { calls: string[][] } }).mock
      .calls[0][0];
    expect(url).toContain("/movie/popular");
    expect(url).toContain("api_key=test-key");
  });
});

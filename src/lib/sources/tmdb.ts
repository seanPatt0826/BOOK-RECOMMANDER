import { fetchJson } from "./http";
import type { SearchResult, MediaDetail } from "./types";
import {
  searchMoviesKeyless,
  getMovieKeyless,
  getPopularMoviesKeyless,
} from "./keylessMovies";

const BASE = "https://api.themoviedb.org/3";

// TMDB needs an API key. When one isn't configured we fall back to a free,
// keyless source (Wikipedia + iTunes) so movies still work.
function tmdbKey(): string | null {
  const key = process.env.TMDB_API_KEY;
  return key && key !== "" ? key : null;
}
const IMG = "https://image.tmdb.org/t/p/w342";

interface TmdbMovie {
  id: number;
  title?: string;
  release_date?: string;
  vote_average?: number;
  poster_path?: string | null;
  overview?: string;
  genres?: { name: string }[];
}

export function ratingFromVoteAverage(vote?: number): number | null {
  if (!vote || vote <= 0) return null;
  return Math.round((vote / 2) * 10) / 10;
}

function yearFrom(date?: string): string | null {
  if (!date || date.length < 4) return null;
  return date.slice(0, 4);
}

export function normalizeMovieItem(movie: TmdbMovie): SearchResult {
  return {
    id: String(movie.id),
    type: "movie",
    title: movie.title ?? "Untitled",
    coverUrl: movie.poster_path ? `${IMG}${movie.poster_path}` : null,
    year: yearFrom(movie.release_date),
    rating: ratingFromVoteAverage(movie.vote_average),
  };
}

export function normalizeMovieDetail(movie: TmdbMovie): MediaDetail {
  return {
    ...normalizeMovieItem(movie),
    description: movie.overview ?? null,
    creators: (movie.genres ?? []).map((g) => g.name),
  };
}

export async function searchMovies(query: string): Promise<SearchResult[]> {
  const key = tmdbKey();
  if (key) {
    try {
      const url = `${BASE}/search/movie?api_key=${key}&query=${encodeURIComponent(query)}`;
      const data = (await fetchJson(url)) as { results?: TmdbMovie[] };
      const items = (data.results ?? []).map(normalizeMovieItem);
      if (items.length > 0) return items;
    } catch {
      // fall through to the keyless source
    }
  }
  return searchMoviesKeyless(query);
}

export async function getMovie(id: string): Promise<MediaDetail | null> {
  const key = tmdbKey();
  // TMDB ids are numeric; the keyless source uses Wikipedia titles.
  if (key && /^\d+$/.test(id)) {
    const url = `${BASE}/movie/${encodeURIComponent(id)}?api_key=${key}`;
    const data = (await fetchJson(url)) as TmdbMovie | undefined;
    if (!data || data.id === undefined) return null;
    return normalizeMovieDetail(data);
  }
  return getMovieKeyless(id);
}

export async function getPopularMovies(): Promise<SearchResult[]> {
  const key = tmdbKey();
  if (key) {
    try {
      const url = `${BASE}/movie/popular?api_key=${key}`;
      const data = (await fetchJson(url)) as { results?: TmdbMovie[] };
      const items = (data.results ?? []).map(normalizeMovieItem);
      if (items.length > 0) return items;
    } catch {
      // fall through to the keyless source
    }
  }
  return getPopularMoviesKeyless();
}

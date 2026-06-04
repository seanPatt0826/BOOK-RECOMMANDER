import { fetchJson } from "./http";
import { requireEnv } from "@/lib/env";
import type { SearchResult, MediaDetail } from "./types";

const BASE = "https://api.themoviedb.org/3";
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
  const key = requireEnv("TMDB_API_KEY");
  const url = `${BASE}/search/movie?api_key=${key}&query=${encodeURIComponent(query)}`;
  const data = (await fetchJson(url)) as { results?: TmdbMovie[] };
  return (data.results ?? []).map(normalizeMovieItem);
}

export async function getMovie(id: string): Promise<MediaDetail | null> {
  const key = requireEnv("TMDB_API_KEY");
  const url = `${BASE}/movie/${encodeURIComponent(id)}?api_key=${key}`;
  const data = (await fetchJson(url)) as TmdbMovie | undefined;
  if (!data || data.id === undefined) return null;
  return normalizeMovieDetail(data);
}

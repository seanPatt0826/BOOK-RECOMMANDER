import { fetchJson } from "./http";
import type { SearchResult, MediaDetail } from "./types";
import {
  searchBooksOpenLibrary,
  getPopularBooksOpenLibrary,
  getBookOpenLibrary,
  OPEN_LIBRARY_ID,
} from "./openLibrary";

const BASE = "https://www.googleapis.com/books/v1/volumes";

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    averageRating?: number;
    description?: string;
    imageLinks?: { thumbnail?: string };
  };
}

function coverFrom(info: GoogleVolume["volumeInfo"]): string | null {
  const raw = info?.imageLinks?.thumbnail;
  if (!raw) return null;
  return raw.replace(/^http:\/\//, "https://");
}

function yearFrom(date?: string): string | null {
  if (!date || date.length < 4) return null;
  return date.slice(0, 4);
}

export function normalizeBookItem(volume: GoogleVolume): SearchResult {
  const info = volume.volumeInfo ?? {};
  return {
    id: volume.id,
    type: "book",
    title: info.title ?? "Untitled",
    coverUrl: coverFrom(info),
    year: yearFrom(info.publishedDate),
    rating: typeof info.averageRating === "number" ? info.averageRating : null,
  };
}

export function normalizeBookDetail(volume: GoogleVolume): MediaDetail {
  const info = volume.volumeInfo ?? {};
  return {
    ...normalizeBookItem(volume),
    description: info.description ?? null,
    creators: info.authors ?? [],
  };
}

export async function searchBooks(query: string): Promise<SearchResult[]> {
  // Try Google Books first; fall back to Open Library when it fails (its
  // keyless quota is often exhausted) or returns nothing.
  try {
    const url = `${BASE}?q=${encodeURIComponent(query)}&maxResults=10`;
    const data = (await fetchJson(url)) as { items?: GoogleVolume[] };
    const items = (data.items ?? []).map(normalizeBookItem);
    if (items.length > 0) return items;
  } catch {
    // fall through
  }
  return searchBooksOpenLibrary(query);
}

export async function getBook(id: string): Promise<MediaDetail | null> {
  // Open Library ids look like "OL893415W"; everything else is a Google id.
  if (OPEN_LIBRARY_ID.test(id)) return getBookOpenLibrary(id);
  const data = (await fetchJson(`${BASE}/${encodeURIComponent(id)}`)) as
    | GoogleVolume
    | undefined;
  if (!data || !data.id) return null;
  return normalizeBookDetail(data);
}

export async function getPopularBooks(): Promise<SearchResult[]> {
  try {
    const url = `${BASE}?q=subject:fiction&orderBy=relevance&maxResults=12`;
    const data = (await fetchJson(url)) as { items?: GoogleVolume[] };
    const items = (data.items ?? []).map(normalizeBookItem);
    if (items.length > 0) return items;
  } catch {
    // fall through
  }
  return getPopularBooksOpenLibrary();
}

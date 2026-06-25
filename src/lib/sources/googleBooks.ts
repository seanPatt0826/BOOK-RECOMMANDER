import { fetchJson } from "./http";
import type { SearchResult, MediaDetail } from "./types";
import {
  searchBooksOpenLibrary,
  getPopularBooksOpenLibrary,
  getBooksBySubjectOpenLibrary,
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

async function searchBooksGoogle(query: string): Promise<SearchResult[]> {
  const url = `${BASE}?q=${encodeURIComponent(query)}&maxResults=10`;
  const data = (await fetchJson(url)) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(normalizeBookItem);
}

export async function searchBooks(query: string): Promise<SearchResult[]> {
  // Query both sources in parallel and prefer Open Library — it carries star
  // ratings, whereas Google Books' keyless search rarely includes averageRating
  // (and its quota is often exhausted). Running them concurrently means a slow
  // or flaky Open Library never makes the page wait out its full timeout before
  // Google's results are available, and a failure in either source can't empty
  // the page while the other has results.
  const [ol, google] = await Promise.allSettled([
    searchBooksOpenLibrary(query),
    searchBooksGoogle(query),
  ]);
  const olItems = ol.status === "fulfilled" ? ol.value : [];
  if (olItems.length > 0) return olItems;
  return google.status === "fulfilled" ? google.value : [];
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

// Books for one genre/subject; Google first, Open Library as the fallback.
export async function getBooksBySubject(
  subject: string,
): Promise<SearchResult[]> {
  try {
    const url = `${BASE}?q=subject:${encodeURIComponent(subject)}&orderBy=relevance&maxResults=16`;
    const data = (await fetchJson(url)) as { items?: GoogleVolume[] };
    const items = (data.items ?? []).map(normalizeBookItem);
    if (items.length >= 6) return items;
  } catch {
    // fall through
  }
  return getBooksBySubjectOpenLibrary(subject);
}

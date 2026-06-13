import { fetchJson } from "./http";
import type { SearchResult, MediaDetail } from "./types";

// Open Library: a free, keyless, unlimited book API. Used as a fallback for
// Google Books, whose keyless quota is unreliable.
const SEARCH = "https://openlibrary.org/search.json";
const FIELDS = "key,title,author_name,first_publish_year,cover_i,ratings_average";
const DAY = 86_400;

interface OLDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  ratings_average?: number;
}

// Work keys look like "/works/OL893415W". We use the bare "OL893415W" as the
// id — its shape (matched by OPEN_LIBRARY_ID) lets getBook() tell it apart from
// a Google Books volume id, and it has no characters that need URL-encoding.
export const OPEN_LIBRARY_ID = /^OL\d+W$/;

function idFromKey(key?: string): string | null {
  const match = key?.match(/OL\d+W/);
  return match ? match[0] : null;
}

function coverUrl(coverId?: number, size: "M" | "L" = "M"): string | null {
  return typeof coverId === "number"
    ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
    : null;
}

function roundRating(value?: number): number | null {
  return typeof value === "number" ? Math.round(value * 10) / 10 : null;
}

function normalizeDoc(doc: OLDoc): SearchResult | null {
  const id = idFromKey(doc.key);
  if (!id) return null;
  return {
    id,
    type: "book",
    title: doc.title ?? "Untitled",
    coverUrl: coverUrl(doc.cover_i),
    year:
      typeof doc.first_publish_year === "number"
        ? String(doc.first_publish_year)
        : null,
    rating: roundRating(doc.ratings_average),
  };
}

function mapDocs(data: unknown): SearchResult[] {
  const docs = (data as { docs?: OLDoc[] }).docs ?? [];
  return docs
    .map(normalizeDoc)
    .filter((item): item is SearchResult => item !== null);
}

export async function searchBooksOpenLibrary(
  query: string,
): Promise<SearchResult[]> {
  const url = `${SEARCH}?q=${encodeURIComponent(query)}&limit=10&fields=${FIELDS}`;
  return mapDocs(await fetchJson(url));
}

export async function getPopularBooksOpenLibrary(): Promise<SearchResult[]> {
  const url = `${SEARCH}?q=subject:fiction&sort=rating&limit=12&fields=${FIELDS}`;
  return mapDocs(await fetchJson(url));
}

// Books for a single genre/subject (e.g. "fantasy", "science_fiction"). Cached
// for a day since these shelves barely change and the home page renders many.
export async function getBooksBySubjectOpenLibrary(
  subject: string,
): Promise<SearchResult[]> {
  const url =
    `${SEARCH}?q=subject:${encodeURIComponent(subject)}` +
    `&sort=rating&limit=16&fields=${FIELDS}`;
  return mapDocs(
    await fetchJson(url, { next: { revalidate: DAY } } as RequestInit),
  );
}

interface OLWork {
  title?: string;
  description?: string | { value?: string };
  covers?: number[];
  authors?: { author?: { key?: string } }[];
  // Present on many (not all) works, in varied formats: "1937",
  // "September 3, 1954", "1988-10". We only need the year out of it.
  first_publish_date?: string;
}

// Pull a 4-digit year (1000–2999) out of an Open Library date string.
export function yearFromDate(date?: string): string | null {
  const match = date?.match(/\b[12]\d{3}\b/);
  return match ? match[0] : null;
}

// The work endpoint's own first_publish_date is unreliable — it often reflects
// one arbitrary edition (e.g. The Lord of the Rings reads "September 3, 2001").
// The search index's first_publish_year is computed as the earliest across all
// editions, so it's both accurate and identical to the year on the result card.
async function firstPublishYear(workId: string): Promise<string | null> {
  try {
    const data = (await fetchJson(
      `${SEARCH}?q=key:/works/${encodeURIComponent(workId)}&fields=first_publish_year&limit=1`,
    )) as { docs?: { first_publish_year?: number }[] };
    const year = data.docs?.[0]?.first_publish_year;
    return typeof year === "number" ? String(year) : null;
  } catch {
    return null;
  }
}

async function authorName(key?: string): Promise<string | null> {
  if (!key) return null;
  try {
    const data = (await fetchJson(`https://openlibrary.org${key}.json`)) as {
      name?: string;
    };
    return data.name ?? null;
  } catch {
    return null;
  }
}

export async function getBookOpenLibrary(
  id: string,
): Promise<MediaDetail | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/works/${encodeURIComponent(id)}.json`,
  )) as OLWork | undefined;
  if (!data || !data.title) return null;

  const description =
    typeof data.description === "string"
      ? data.description
      : (data.description?.value ?? null);

  // Prefer the search index's earliest year; fall back to the work's own
  // date only if the index has none. Fetched alongside the author lookups.
  const [creators, indexYear] = await Promise.all([
    Promise.all(
      (data.authors ?? []).slice(0, 3).map((a) => authorName(a.author?.key)),
    ).then((names) => names.filter((name): name is string => Boolean(name))),
    firstPublishYear(id),
  ]);
  const year = indexYear ?? yearFromDate(data.first_publish_date);

  return {
    id,
    type: "book",
    title: data.title,
    coverUrl: coverUrl(data.covers?.[0], "L"),
    year,
    rating: null,
    description,
    creators,
  };
}
